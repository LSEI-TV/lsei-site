// ============================================================
//  Renommage EN MASSE de titres de vidéos YouTube via l'API Data v3.
//  Lit rename-videos.csv (généré par audit-videos.mjs, colonne « nouveau_titre »
//  à compléter) et applique les nouveaux titres. DRY-RUN par défaut : rien n'est
//  modifié tant que --apply n'est pas passé.
//
//  Usage :
//    node scripts/rename-videos.mjs auth      → (une seule fois) autorise l'accès à TA chaîne
//    node scripts/rename-videos.mjs           → aperçu (dry-run) : liste ce qui SERAIT renommé
//    node scripts/rename-videos.mjs --apply   → applique réellement les renommages
//    node scripts/rename-videos.mjs mon.csv [--apply]  → utilise un autre fichier CSV
//
//  Pré-requis (une seule fois, côté Google) :
//    1. Google Cloud Console → crée/choisis un projet → active « YouTube Data API v3 ».
//    2. Écran de consentement OAuth (type « Externe ») → ajoute TON compte Google en
//       utilisateur de test.
//    3. Identifiants → crée un ID client OAuth de type « Application de bureau ».
//    4. Copie l'ID client + le secret dans scripts/../youtube-oauth.json  :
//         { "client_id": "....apps.googleusercontent.com", "client_secret": "...." }
//       (ou via les variables d'env YT_CLIENT_ID / YT_CLIENT_SECRET)
//    5. node scripts/rename-videos.mjs auth  → ouvre une page d'autorisation, puis
//       enregistre le refresh_token dans youtube-oauth.json. Ce fichier NE DOIT PAS être
//       commité (il est dans .gitignore).
// ============================================================
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CREDS = join(ROOT, 'youtube-oauth.json');
const CSV = join(ROOT, 'rename-videos.csv');
const SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';
const PORT = 8719;
const REDIRECT = `http://127.0.0.1:${PORT}`;

const loadCreds = () => {
  const c = existsSync(CREDS) ? JSON.parse(readFileSync(CREDS, 'utf8')) : {};
  return {
    client_id: process.env.YT_CLIENT_ID || c.client_id,
    client_secret: process.env.YT_CLIENT_SECRET || c.client_secret,
    refresh_token: c.refresh_token,
    _file: c,
  };
};
const saveRefresh = (prev, refresh_token) => {
  const out = { client_id: prev.client_id, client_secret: prev.client_secret, ...prev._file, refresh_token };
  writeFileSync(CREDS, JSON.stringify(out, null, 2), 'utf8');
};

// ---------- Mode AUTH : obtenir un refresh_token (boucle localhost) ----------
async function auth() {
  const c = loadCreds();
  if (!c.client_id || !c.client_secret) {
    console.error('✗ Manque client_id/client_secret. Crée youtube-oauth.json (voir en-tête du script).');
    process.exit(1);
  }
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: c.client_id, redirect_uri: REDIRECT, response_type: 'code',
    scope: SCOPE, access_type: 'offline', prompt: 'consent',
  });
  const code = await new Promise((resolve, reject) => {
    const srv = createServer((req, res) => {
      const u = new URL(req.url, REDIRECT);
      const cd = u.searchParams.get('code');
      res.end(cd ? 'Autorisation reçue. Tu peux fermer cet onglet et revenir au terminal.' : 'Aucun code reçu.');
      srv.close(); cd ? resolve(cd) : reject(new Error('Pas de code'));
    });
    srv.listen(PORT, () => {
      console.log('\nOuvre cette page et autorise l’accès :\n' + url + '\n');
      // L'URL contient des « & » → sous Windows « start » la couperait. rundll32
      // reçoit l'URL comme UN seul argument (pas d'interprétation du shell).
      const opener = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
        : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
      try { spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).unref(); } catch {}
    });
  });
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: c.client_id, client_secret: c.client_secret, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
  }).then((r) => r.json());
  if (!tok.refresh_token) { console.error('✗ Pas de refresh_token reçu :', tok); process.exit(1); }
  saveRefresh(c, tok.refresh_token);
  console.log('✓ refresh_token enregistré dans youtube-oauth.json. Tu peux maintenant lancer le renommage.');
}

const accessToken = async (c) => {
  const t = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, refresh_token: c.refresh_token, grant_type: 'refresh_token' }),
  }).then((r) => r.json());
  if (!t.access_token) { console.error('✗ Échec du rafraîchissement du token :', t); process.exit(1); }
  return t.access_token;
};

// ---------- CSV ----------
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ';') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch === '\r') { /* ignore */ }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift() || [];
  const idx = (n) => head.indexOf(n);
  return rows.filter((r) => r.length && r.some((x) => x)).map((r) => ({
    id: r[idx('video_id')], current: r[idx('titre_actuel')], neo: (r[idx('nouveau_titre')] || '').trim(),
  }));
}

// ---------- Renommage ----------
async function run(apply, csvPath) {
  const c = loadCreds();
  const file = csvPath || CSV;
  if (!existsSync(file)) { console.error(`✗ ${file} introuvable. Lance d’abord : node scripts/audit-videos.mjs`); process.exit(1); }
  const planned = parseCsv(readFileSync(file, 'utf8')).filter((r) => r.id && r.neo && r.neo !== r.current);
  if (!planned.length) { console.log('Rien à renommer : aucune ligne avec un « nouveau_titre » différent du titre actuel.'); return; }
  console.log(`${planned.length} vidéo(s) à renommer${apply ? '' : ' (DRY-RUN — rien ne sera modifié)'} :\n`);
  for (const p of planned) console.log(`  ${p.id}\n    − ${p.current}\n    + ${p.neo}`);
  if (!apply) { console.log('\nPour appliquer réellement : node scripts/rename-videos.mjs --apply'); return; }

  if (!c.refresh_token) { console.error('\n✗ Pas de refresh_token. Lance d’abord : node scripts/rename-videos.mjs auth'); process.exit(1); }
  const token = await accessToken(c);
  let done = 0, fail = 0;
  for (const p of planned) {
    // videos.update exige le snippet COMPLET (dont categoryId) → on lit d'abord l'actuel.
    const cur = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${p.id}`, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json());
    const sn = cur.items?.[0]?.snippet;
    if (!sn) { console.error(`  ✗ ${p.id} : vidéo introuvable ou non accessible`); fail++; continue; }
    const body = { id: p.id, snippet: { title: p.neo, categoryId: sn.categoryId, description: sn.description, tags: sn.tags, defaultLanguage: sn.defaultLanguage } };
    const res = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet', {
      method: 'PUT', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
    }).then((r) => r.json());
    if (res.id) { console.log(`  ✓ ${p.id} → ${p.neo}`); done++; }
    else { console.error(`  ✗ ${p.id} :`, res.error?.message || JSON.stringify(res)); fail++; }
  }
  console.log(`\nTerminé : ${done} renommée(s), ${fail} échec(s).`);
}

const args = process.argv.slice(2);
if (args[0] === 'auth') auth();
else {
  const csvPath = args.find((a) => !a.startsWith('--') && a !== 'auth');
  run(args.includes('--apply'), csvPath);
}
