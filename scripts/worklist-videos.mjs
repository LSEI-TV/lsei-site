// ============================================================
//  PLAN DE TRAVAIL « renommage vidéos » — page HTML locale (worklist-videos.html).
//  Liste les vidéos du circuit Masters/Femmes SANS noms, groupées par TOURNOI puis
//  par TOUR, avec : miniature, lien YouTube cliquable, titre actuel, et surtout les
//  AFFICHES POSSIBLES de ce tour (tirées des résultats) → Marc identifie vite, dit
//  « c'est la n°X », on valide. Ne touche À RIEN sur YouTube.
//    node scripts/worklist-videos.mjs
// ============================================================
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'src', 'data', 'billard');
const CACHE = join(__dirname, '..', 'src', 'data', 'cache', 'replays.json');

const PART = new Set(['de', 'du', 'des', 'le', 'la', 'les', 'van', 'von', 'der', 'den', 'el', 'al', 'di', 'da', 'the', 'of']);
const nk = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const toksf = (s) => nk(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !PART.has(w));
const strong = (t) => t.filter((w) => w.length >= 3);
const tokEq = (a, b) => a === b || (Math.min(a.length, b.length) >= 5 && (a.includes(b) || b.includes(a)));
const titleHas = (title, name) => { const pt = strong(toksf(name)); if (!pt.length) return false; const s = pt[pt.length - 1]; return toksf(title).some((w) => tokEq(w, s)); };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ORDER = ['Finale', '1/2', '1/4', '1/8', '1/16', '1/32'];
const roundOf = (t) => /1\s*\/\s*2/.test(t) ? '1/2' : /1\s*\/\s*4/.test(t) ? '1/4' : /1\s*\/\s*8/.test(t) ? '1/8' : /1\s*\/\s*16/.test(t) ? '1/16' : /1\s*\/\s*32/.test(t) ? '1/32' : /finale/i.test(t) ? 'Finale' : null;

// --- Résultats : tournois (avec matchs par tour) + joueurs. ---
const players = new Set();
const tours = []; // {season, seasonCompact, comp, level, city, date, kind, finalRound, byRound:Map}
for (const f of readdirSync(DATA).filter((f) => /^results-(femmes-)?\d{4}-\d{4}\.json$/.test(f))) {
  const R = JSON.parse(readFileSync(join(DATA, f), 'utf8'));
  const comp = /femmes/.test(f) ? 'Femmes' : 'Masters';
  const sm = f.match(/(\d{4})-(\d{4})/);
  const seasonCompact = sm ? `${sm[1].slice(2)}-${sm[2].slice(2)}` : '';
  for (const p of R.players || []) if (p.name) players.add(p.name);
  for (const t of R.tournaments || []) {
    const ms = (R.matches || []).filter((m) => m.tid === t.id && m.roundNo != null);
    if (!ms.length) continue;
    const finalRound = Math.max(...ms.map((m) => m.roundNo));
    const byRound = new Map();
    for (const m of ms) { if (!byRound.has(m.roundNo)) byRound.set(m.roundNo, []); byRound.get(m.roundNo).push(m); }
    tours.push({ season: sm ? `${sm[1]}-${sm[2]}` : '', seasonCompact, comp, level: t.level, city: t.city, date: t.date, kind: t.kind, finalRound, byRound });
  }
}
const PLAYERS = [...players];

const raw = JSON.parse(readFileSync(CACHE, 'utf8'));
const vids = (Array.isArray(raw) ? raw : raw.items || []).filter((v) => v.discipline === 'billard' && !/basket|militaire|fougeres/i.test(v.title || ''));
const dday = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);

// --- Appariement vidéo → tournoi (circuit Masters/Femmes clairement étiqueté). ---
const groups = new Map(); // key tournoi → {tour, rounds:Map(label→{cands, vids})}
let offCircuit = 0, unmatched = 0;
for (const v of vids) {
  const ti = v.title || '';
  if (/interview/i.test(ti)) continue;
  if (PLAYERS.some((n) => titleHas(ti, n))) continue; // déjà reconnue
  const r = roundOf(ti);
  if (!r) continue; // live/multiplex sans tour identifiable
  if (/veteran|espoir|jeu\s*de\s*la|9\s*ball|8\s*ball|\bpara\b|fauteuil|malvoyant|mixte|senior|cadet|junior|minime/i.test(ti)) { offCircuit++; continue; }
  const comp = /blackball\s+femmes/i.test(ti) ? 'Femmes' : /blackball\s+masters/i.test(ti) ? 'Masters' : null;
  if (!comp || !v.date) { offCircuit++; continue; }
  const tnm = ti.match(/\bTN\s*(\d+)\b/i);
  const cdf = /championnat|france/i.test(ti);
  let cand = tours.filter((t) => t.comp === comp &&
    (tnm ? new RegExp(`\\bTN\\s*${tnm[1]}\\b`, 'i').test(t.level) : cdf ? (t.kind === 'france' || /championnat|france/i.test(t.level)) : true) &&
    t.date && dday(v.date, t.date) <= (tnm || cdf ? 10 : 3));
  if (cand.length !== 1) { unmatched++; continue; }
  const t = cand[0];
  const key = `${t.season}|${t.comp}|${t.level}`;
  if (!groups.has(key)) groups.set(key, { t, rounds: new Map() });
  const g = groups.get(key);
  if (!g.rounds.has(r)) {
    // affiches candidates de ce tour
    const rn = t.finalRound - ORDER.indexOf(r);
    const ms = (t.byRound.get(rn) || []).slice().sort((a, b) => (a.matchno || 0) - (b.matchno || 0));
    const cands = ms.map((m) => ({ a: m.aName, b: m.bName, sa: m.sA, sb: m.sB }));
    g.rounds.set(r, { cands, vids: [] });
  }
  g.rounds.get(r).vids.push({ id: v.id, title: ti, date: v.date });
}

// --- Tri : saison récente d'abord, puis tours des finales vers les 16es. ---
const gList = [...groups.values()].sort((a, b) => (a.t.season < b.t.season ? 1 : a.t.season > b.t.season ? -1 : a.t.comp.localeCompare(b.t.comp)));
let nVid = 0;
const sections = gList.map((g) => {
  const rounds = [...g.rounds.entries()].sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));
  const roundsHtml = rounds.map(([label, d]) => {
    const cands = d.cands.length
      ? `<ol class="cands">${d.cands.map((c) => `<li>${esc(c.a)} <b>${c.sa}–${c.sb}</b> ${esc(c.b)}</li>`).join('')}</ol>`
      : `<p class="nocand">(affiches non disponibles pour ce tour)</p>`;
    const vidsHtml = d.vids.map((v) => { nVid++; return `<div class="vid">
      <a href="https://youtu.be/${v.id}" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="" loading="lazy"></a>
      <div class="meta"><a href="https://youtu.be/${v.id}" target="_blank" rel="noopener">▶ Ouvrir sur YouTube</a>
      <code>${v.id}</code><span class="cur">${esc(v.title)}</span></div></div>`; }).join('');
    return `<div class="round"><h3>${label} <span class="n">${d.vids.length} vidéo${d.vids.length > 1 ? 's' : ''}</span></h3>
      <div class="cols"><div class="candbox"><p class="lbl">Affiches possibles de ce tour :</p>${cands}</div>
      <div class="vids">${vidsHtml}</div></div></div>`;
  }).join('');
  return `<section><h2>${esc(g.t.comp)} · ${esc(g.t.level)}${g.t.city ? ' · ' + esc(g.t.city) : ''} <span class="season">${esc(g.t.season)}</span></h2>${roundsHtml}</section>`;
}).join('');

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Plan de travail — renommage vidéos</title><style>
:root{color-scheme:light}body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#f4f5f7;color:#1a1d21}
header{position:sticky;top:0;background:#111;color:#fff;padding:14px 20px;z-index:5}
header b{color:#ffd24a}main{max-width:1100px;margin:0 auto;padding:16px}
section{background:#fff;border-radius:12px;padding:16px 18px;margin:16px 0;box-shadow:0 1px 4px rgba(0,0,0,.08)}
h2{margin:.2em 0 .6em;font-size:19px}h2 .season{font-weight:400;color:#888;font-size:14px}
.round{border-top:1px solid #eee;padding:12px 0}.round h3{margin:.2em 0;font-size:16px}
.round h3 .n{font-weight:400;color:#999;font-size:13px;margin-left:6px}
.cols{display:grid;grid-template-columns:minmax(240px,1fr) 2fr;gap:16px;align-items:start}
@media(max-width:720px){.cols{grid-template-columns:1fr}}
.candbox{background:#f8f9fb;border:1px solid #eef;border-radius:8px;padding:8px 12px}
.lbl{margin:.2em 0;font-size:12px;color:#667;text-transform:uppercase;letter-spacing:.04em}
.cands{margin:.3em 0;padding-left:1.4em}.cands li{margin:.15em 0}.cands b{color:#c0392b}
.nocand{color:#999;font-style:italic;font-size:13px}
.vids{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.vid{border:1px solid #e6e8ec;border-radius:8px;overflow:hidden;background:#fff}
.vid img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover}
.vid .meta{padding:7px 9px;font-size:12px;display:flex;flex-direction:column;gap:3px}
.vid .meta a{color:#1a73e8;text-decoration:none;font-weight:600}.vid code{color:#888;font-size:11px}
.vid .cur{color:#444}
</style></head><body>
<header>Plan de travail — <b>${nVid}</b> vidéos à nommer · circuit Masters/Femmes · groupées par tournoi puis par tour</header>
<main>${sections}</main></body></html>`;

writeFileSync(join(__dirname, '..', 'worklist-videos.html'), html, 'utf8');
console.log(`Plan de travail : ${nVid} vidéos (circuit Masters/Femmes) dans ${gList.length} tournois → worklist-videos.html`);
console.log(`Écartées : ${offCircuit} hors circuit (Vétérans/Espoirs/9-8 ball/Para…) · ${unmatched} non rattachées à un tournoi connu`);
