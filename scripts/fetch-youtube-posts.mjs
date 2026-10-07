// ============================================================
//  Récupère les POSTS communautaires de la chaîne YouTube LSEI et génère un
//  fichier Markdown par post dans src/content/social/ (collection « social »).
//
//  L'API YouTube Data v3 n'expose PAS les posts communautaires : on lit donc la
//  page publique /@chaine/posts côté serveur et on parse `ytInitialData`.
//  Aucune clé API nécessaire. Dédup par identifiant de post (ne recrée jamais un
//  post déjà présent). Lancé par refresh-data.yml (2×/jour) puis build + déploiement.
//
//    node scripts/fetch-youtube-posts.mjs          → crée les nouveaux posts
//    node scripts/fetch-youtube-posts.mjs --dry     → simule (n'écrit rien)
// ============================================================
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const DRY = process.argv.includes('--dry');
const HANDLE = 'LSEIWebTvSport';
const URL = `https://www.youtube.com/@${HANDLE}/posts?hl=fr&gl=FR`;
const OUT_DIR = 'src/content/social';

// --- Extraction de ytInitialData par équilibrage d'accolades (robuste) ---
function extractJson(src, marker) {
  const i = src.indexOf(marker);
  if (i < 0) return null;
  const j = src.indexOf('{', i);
  if (j < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let k = j; k < src.length; k++) {
    const c = src[k];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(j, k + 1); }
  }
  return null;
}

const runsText = (ct) => (ct && Array.isArray(ct.runs) ? ct.runs.map((r) => r.text).join('') : '');

// postId lisible depuis une URL de post (…/post/<id>?…)
const postIdFromUrl = (u) => {
  const m = (u || '').match(/\/post\/([\w-]+)/);
  return m ? m[1] : null;
};

async function main() {
  // 1) Télécharger la page (cookie de consentement pour éviter la redirection UE).
  const res = await fetch(URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9',
      Cookie: 'SOCS=CAI; CONSENT=YES+1',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const raw = extractJson(html, 'ytInitialData =') || extractJson(html, 'ytInitialData"]');
  if (!raw) throw new Error('ytInitialData introuvable');
  const data = JSON.parse(raw);

  // 2) Collecter tous les posts (backstagePostRenderer / sharedPostRenderer).
  const posts = [];
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    if (o.backstagePostRenderer) posts.push(o.backstagePostRenderer);
    if (o.sharedPostRenderer && o.sharedPostRenderer.originalPost) posts.push(o.sharedPostRenderer.originalPost.backstagePostRenderer || {});
    for (const k in o) walk(o[k]);
  })(data);

  // 3) Identifiants de posts déjà présents sur le site (dédup).
  const known = new Set();
  let existing = [];
  try { existing = readdirSync(OUT_DIR).filter((f) => f.endsWith('.md')); } catch {}
  for (const f of existing) {
    const txt = readFileSync(`${OUT_DIR}/${f}`, 'utf-8');
    const m = txt.match(/^link:\s*(.+)$/m);
    const id = m ? postIdFromUrl(m[1].trim()) : null;
    if (id) known.add(id);
  }

  // 4) Générer un .md par nouveau post.
  const today = new Date().toISOString().slice(0, 10);
  let created = 0;
  for (const p of posts) {
    const postId = p.postId;
    if (!postId || known.has(postId)) continue;
    const caption = runsText(p.contentText).replace(/\r/g, '').trimEnd();
    if (!caption) continue;                 // posts image seule / sondage → ignorés
    const videoId = p.backstageAttachment?.videoRenderer?.videoId || null;

    const shortId = postId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    const file = `${OUT_DIR}/${today}-youtube-${shortId}.md`;

    // caption en bloc littéral YAML (préserve les sauts de ligne).
    const body = caption.split('\n').map((l) => (l.trim() ? `  ${l}` : '')).join('\n');
    const fm = [
      '---',
      'platform: youtube',
      `date: ${today}`,
      'caption: |-',
      body,
      `link: https://www.youtube.com/post/${postId}`,
      ...(videoId ? [`image: https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, `video: https://youtu.be/${videoId}`] : []),
      'draft: false',
      '---',
      '',
    ].join('\n');

    known.add(postId);
    created++;
    if (DRY) { console.log(`[dry] créerait ${file} (video=${videoId})`); continue; }
    writeFileSync(file, fm, 'utf-8');
    console.log(`+ ${file}`);
  }
  console.log(`${posts.length} post(s) lus, ${created} nouveau(x)${DRY ? ' (simulation)' : ''}.`);
}

main().catch((e) => { console.error('Échec:', e.message); process.exit(1); });
