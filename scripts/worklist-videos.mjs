// ============================================================
//  PLAN DE TRAVAIL / INVENTAIRE COMPLET des vidéos billard — page HTML locale
//  (worklist-videos.html). TOUTES les vidéos, classées par CATÉGORIE :
//   • Masters / Femmes : vue riche (tournoi → tour + AFFICHES candidates issues
//     des résultats Cuescore) pour nommer vite et sûr.
//   • Vétérans, Espoirs, Jeu de la 9/8, Mixte, Para, Interviews, Autres : grille
//     complète (miniature + lien YouTube + titre), prête pour de futures pages.
//  Ne touche À RIEN sur YouTube.    node scripts/worklist-videos.mjs
// ============================================================
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'src', 'data', 'billard');
const CACHE = join(__dirname, '..', 'src', 'data', 'cache', 'replays.json');
const FULL = join(__dirname, '..', 'channel-billard.json'); // liste COMPLÈTE de la chaîne (si dispo)
const EXCL = (() => { const p = join(__dirname, '..', 'video-exclude.txt'); if (!existsSync(p)) return new Set(); return new Set(readFileSync(p, 'utf8').split(/\r?\n/).map((l) => l.split('#')[0].trim()).filter(Boolean)); })();

const PART = new Set(['de', 'du', 'des', 'le', 'la', 'les', 'van', 'von', 'der', 'den', 'el', 'al', 'di', 'da', 'the', 'of']);
const nk = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const toksf = (s) => nk(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !PART.has(w));
const strong = (t) => t.filter((w) => w.length >= 3);
const tokEq = (a, b) => a === b || (Math.min(a.length, b.length) >= 5 && (a.includes(b) || b.includes(a)));
const titleHas = (title, name) => { const pt = strong(toksf(name)); if (!pt.length) return false; const s = pt[pt.length - 1]; return toksf(title).some((w) => tokEq(w, s)); };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const frd = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '';

const ORDER = ['Finale', '1/2', '1/4', '1/8', '1/16', '1/32'];
const roundOf = (t) => /1\s*\/\s*2/.test(t) ? '1/2' : /1\s*\/\s*4/.test(t) ? '1/4' : /1\s*\/\s*8/.test(t) ? '1/8' : /1\s*\/\s*16/.test(t) ? '1/16' : /1\s*\/\s*32/.test(t) ? '1/32' : /finale/i.test(t) ? 'Finale' : null;

// Catégorie (le 1er motif qui matche gagne — spécifiques avant génériques).
const CATS = [
  ['Interviews', /interview/i],
  ['Para-billard', /\bpara\b|fauteuil|malvoyant/i],
  ['Mixte National', /mixte/i],
  ['Vétérans', /veteran/i],
  ['Espoirs', /espoir/i],
  ['Jeu de la 9', /jeu\s*de\s*la\s*9|9\s*ball/i],
  ['Jeu de la 8', /jeu\s*de\s*la\s*8|8\s*ball/i],
  ['Femmes', /femme/i],
  ['Masters', /master/i],
];
const catOf = (t) => { for (const [n, re] of CATS) if (re.test(t)) return n; return 'Autres (lives, multiplex…)'; };
const CAT_ORDER = ['Masters', 'Femmes', 'Vétérans', 'Espoirs', 'Jeu de la 9', 'Jeu de la 8', 'Mixte National', 'Para-billard', 'Interviews', 'Autres (lives, multiplex…)'];

// --- Résultats : tournois (matchs par tour) + joueurs. ---
const players = new Set();
const tours = [];
for (const f of readdirSync(DATA).filter((f) => /^results-(femmes-)?\d{4}-\d{4}\.json$/.test(f))) {
  const R = JSON.parse(readFileSync(join(DATA, f), 'utf8'));
  const comp = /femmes/.test(f) ? 'Femmes' : 'Masters';
  const sm = f.match(/(\d{4})-(\d{4})/);
  for (const p of R.players || []) if (p.name) players.add(p.name);
  for (const t of R.tournaments || []) {
    const ms = (R.matches || []).filter((m) => m.tid === t.id && m.roundNo != null);
    if (!ms.length) continue;
    const finalRound = Math.max(...ms.map((m) => m.roundNo));
    const byRound = new Map();
    for (const m of ms) { if (!byRound.has(m.roundNo)) byRound.set(m.roundNo, []); byRound.get(m.roundNo).push(m); }
    tours.push({ season: sm ? `${sm[1]}-${sm[2]}` : '', comp, level: t.level, city: t.city, date: t.date, kind: t.kind, finalRound, byRound });
  }
}
const PLAYERS = [...players];
const looksNamed = (t) => PLAYERS.some((n) => titleHas(t, n)) || /\s(?:vs|v)\.?\s/i.test(t);

// Source : la liste COMPLÈTE de la chaîne si elle a été récupérée
// (node scripts/fetch-channel-billard.mjs), sinon le cache du site.
let vids, SOURCE;
if (existsSync(FULL)) {
  vids = JSON.parse(readFileSync(FULL, 'utf8')).filter((v) => !/basket|militaire|fougeres/i.test(v.title || ''));
  SOURCE = `chaîne complète (${vids.length})`;
} else {
  const raw = JSON.parse(readFileSync(CACHE, 'utf8'));
  vids = (Array.isArray(raw) ? raw : raw.items || []).filter((v) => v.discipline === 'billard' && !/basket|militaire|fougeres/i.test(v.title || ''));
  SOURCE = `cache du site (${vids.length})`;
}
const dday = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);

// Rattache une vidéo Masters/Femmes à un tournoi connu (sinon null).
function matchTour(ti, date, comp) {
  if (!date) return null;
  const tnm = ti.match(/\bTN\s*0*(\d+)/i) || ti.match(/N°\s*0*(\d+)/i);
  const cdf = /championnat|france/i.test(ti);
  const cand = tours.filter((t) => t.comp === comp &&
    (tnm ? new RegExp(`\\bTN\\s*${tnm[1]}\\b`, 'i').test(t.level) : cdf ? (t.kind === 'france' || /championnat|france/i.test(t.level)) : true) &&
    t.date && dday(date, t.date) <= (tnm || cdf ? 10 : 3));
  return cand.length === 1 ? cand[0] : null;
}

// --- Répartition ---
const cats = new Map(); // cat → { rich: Map(tourKey→{t,rounds}), simple: [vids] }
for (const n of CAT_ORDER) cats.set(n, { rich: new Map(), simple: [] });
for (const v of vids) {
  if (EXCL.has(v.id)) continue;
  const ti = v.title || '';
  const cat = catOf(ti);
  if (!cats.has(cat)) cats.set(cat, { rich: new Map(), simple: [] });
  const bucket = cats.get(cat);
  let placed = false;
  if (cat === 'Masters' || cat === 'Femmes') {
    const t = matchTour(ti, v.date, cat);
    const r = roundOf(ti);
    if (t && r) {
      const key = `${t.season}|${t.comp}|${t.level}`;
      if (!bucket.rich.has(key)) bucket.rich.set(key, { t, rounds: new Map() });
      const g = bucket.rich.get(key);
      if (!g.rounds.has(r)) {
        const rn = t.finalRound - ORDER.indexOf(r);
        const ms = (t.byRound.get(rn) || []).slice().sort((a, b) => (a.matchno || 0) - (b.matchno || 0));
        g.rounds.set(r, { cands: ms.map((m) => ({ a: m.aName, b: m.bName, sa: m.sA, sb: m.sB })), vids: [] });
      }
      g.rounds.get(r).vids.push(v); placed = true;
    }
  }
  if (!placed) bucket.simple.push(v);
}

// --- Rendu ---
const vidCard = (v) => `<div class="vid${looksNamed(v.title || '') ? ' ok' : ''}">
  <a href="https://youtu.be/${v.id}" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="" loading="lazy"></a>
  <div class="meta"><a href="https://youtu.be/${v.id}" target="_blank" rel="noopener">▶ Ouvrir</a> <span class="dt">${frd(v.date)}</span>
  <code>${v.id}</code><span class="cur">${esc(v.title)}</span></div></div>`;

let totToName = 0, totAll = 0;
const nav = [], sections = [];
for (const [cat, b] of cats) {
  const richVids = [...b.rich.values()].reduce((s, g) => s + [...g.rounds.values()].reduce((a, r) => a + r.vids.length, 0), 0);
  const count = richVids + b.simple.length;
  if (!count) continue;
  totAll += count;
  const toName = [...b.rich.values()].reduce((s, g) => s + [...g.rounds.values()].reduce((a, r) => a + r.vids.filter((v) => !looksNamed(v.title || '')).length, 0), 0)
    + b.simple.filter((v) => !looksNamed(v.title || '')).length;
  totToName += toName;
  const id = 'c' + nk(cat).replace(/[^a-z0-9]+/g, '-');
  nav.push(`<a href="#${id}">${esc(cat)} <b>${count}</b></a>`);

  // vue riche (tournois triés saison récente d'abord)
  const rich = [...b.rich.values()].sort((a, c) => (a.t.season < c.t.season ? 1 : a.t.season > c.t.season ? -1 : 0)).map((g) => {
    const rounds = [...g.rounds.entries()].sort((a, c) => ORDER.indexOf(a[0]) - ORDER.indexOf(c[0])).map(([label, d]) => {
      const cands = d.cands.length ? `<ol class="cands">${d.cands.map((c) => `<li>${esc(c.a)} <b>${c.sa}–${c.sb}</b> ${esc(c.b)}</li>`).join('')}</ol>` : `<p class="nocand">(affiches non dispo)</p>`;
      return `<div class="round"><h4>${label} <span class="n">${d.vids.length}</span></h4><div class="cols">
        <div class="candbox"><p class="lbl">Affiches possibles</p>${cands}</div>
        <div class="vids">${d.vids.map(vidCard).join('')}</div></div></div>`;
    }).join('');
    return `<div class="tour"><h3>${esc(g.t.level)}${g.t.city ? ' · ' + esc(g.t.city) : ''} <span class="season">${esc(g.t.season)}</span></h3>${rounds}</div>`;
  }).join('');

  const simple = b.simple.length
    ? `<h3 class="simple-h">${b.rich.size ? 'Autres vidéos de la catégorie' : 'Vidéos'} <span class="n">${b.simple.length}</span></h3>
       <div class="vids">${b.simple.slice().sort((a, c) => (a.date < c.date ? 1 : -1)).map(vidCard).join('')}</div>` : '';

  sections.push(`<section id="${id}"><h2>${esc(cat)} <span class="badge">${count} vidéos · ${toName} à nommer</span></h2>${rich}${simple}</section>`);
}

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Inventaire vidéos billard</title><style>
:root{color-scheme:light}body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#f4f5f7;color:#1a1d21}
header{position:sticky;top:0;background:#111;color:#fff;padding:12px 20px;z-index:9}header b{color:#ffd24a}
nav{display:flex;flex-wrap:wrap;gap:6px;padding:10px 20px;background:#1c1f24;position:sticky;top:46px;z-index:8}
nav a{color:#cfd3da;text-decoration:none;font-size:13px;background:#2a2e35;padding:3px 9px;border-radius:999px}
nav a b{color:#ffd24a;margin-left:4px}
main{max-width:1180px;margin:0 auto;padding:16px}
section{background:#fff;border-radius:12px;padding:16px 18px;margin:16px 0;box-shadow:0 1px 4px rgba(0,0,0,.08);scroll-margin-top:96px}
h2{margin:.2em 0 .6em;font-size:20px}.badge{font-size:12px;font-weight:600;color:#fff;background:#1a73e8;padding:2px 10px;border-radius:999px;vertical-align:middle;margin-left:8px}
.tour{border-top:2px solid #eef;padding:10px 0}.tour h3{margin:.2em 0;font-size:16px}.tour h3 .season{font-weight:400;color:#999;font-size:13px}
.round{padding:8px 0 8px 10px}.round h4{margin:.2em 0;font-size:14px;color:#333}.round h4 .n,.simple-h .n{font-weight:400;color:#aaa;font-size:12px;margin-left:5px}
.cols{display:grid;grid-template-columns:minmax(220px,1fr) 2fr;gap:14px;align-items:start}@media(max-width:720px){.cols{grid-template-columns:1fr}}
.candbox{background:#f8f9fb;border:1px solid #eef;border-radius:8px;padding:6px 10px}
.lbl{margin:.2em 0;font-size:11px;color:#667;text-transform:uppercase;letter-spacing:.04em}
.cands{margin:.3em 0;padding-left:1.4em}.cands li{margin:.12em 0}.cands b{color:#c0392b}.nocand{color:#aaa;font-style:italic;font-size:13px}
.simple-h{font-size:15px;margin:.8em 0 .3em;color:#333}
.vids{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
.vid{border:1px solid #e6e8ec;border-radius:8px;overflow:hidden;background:#fff}
.vid.ok{opacity:.55}.vid.ok .cur::before{content:"✓ ";color:#2e8b57}
.vid img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover;background:#ddd}
.vid .meta{padding:6px 8px;font-size:12px;display:flex;flex-direction:column;gap:2px}
.vid .meta a{color:#1a73e8;text-decoration:none;font-weight:600}.vid .dt{color:#999;font-size:11px}
.vid code{color:#8a8f98;font-size:10px;word-break:break-all}.vid .cur{color:#444;font-size:11.5px}
</style></head><body>
<header>Inventaire vidéos billard — <b>${totAll}</b> au total · <b>${totToName}</b> à nommer <span style="color:#9aa">(✓ = semble déjà nommée)</span></header>
<nav>${nav.join('')}</nav><main>${sections.join('')}</main></body></html>`;

writeFileSync(join(__dirname, '..', 'worklist-videos.html'), html, 'utf8');
console.log(`Source : ${SOURCE}`);
console.log(`Inventaire : ${totAll} vidéos · ${totToName} à nommer → worklist-videos.html`);
for (const [cat, b] of cats) {
  const richVids = [...b.rich.values()].reduce((s, g) => s + [...g.rounds.values()].reduce((a, r) => a + r.vids.length, 0), 0);
  const count = richVids + b.simple.length; if (count) console.log(`  ${cat.padEnd(26)} ${count}`);
}
