// ============================================================
//  PAGE INTERACTIVE de nommage (rename-ui.html). Tableau : pour chaque vidéo
//  Masters/Femmes SANS noms rattachée à un tournoi connu → lien YouTube + menu
//  des affiches candidates (avec score) + champs score éditables. Tu choisis
//  l'affiche qui correspond à la vidéo, tu corriges le score si besoin, tu
//  « Copies le résultat » et tu me le colles → je renomme (+ corrige le score
//  dans les résultats du site si tu l'as modifié). Ne touche À RIEN tout seul.
//    node scripts/rename-ui.mjs
// ============================================================
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'src', 'data', 'billard');
const FULL = join(__dirname, '..', 'channel-billard.json');
const CACHE = join(__dirname, '..', 'src', 'data', 'cache', 'replays.json');
// Ids à ne plus proposer : exclusions manuelles + vidéos déjà renommées.
const EXCL = (() => { const s = new Set(); for (const fn of ['video-exclude.txt', 'video-done.txt']) { const p = join(__dirname, '..', fn); if (existsSync(p)) for (const l of readFileSync(p, 'utf8').split(/\r?\n/)) { const id = l.split('#')[0].trim(); if (id) s.add(id); } } return s; })();

const PART = new Set(['de', 'du', 'des', 'le', 'la', 'les', 'van', 'von', 'der', 'den', 'el', 'al', 'di', 'da', 'the', 'of']);
const nk = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const toksf = (s) => nk(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !PART.has(w));
const strong = (t) => t.filter((w) => w.length >= 3);
const tokEq = (a, b) => a === b || (Math.min(a.length, b.length) >= 5 && (a.includes(b) || b.includes(a)));
const titleHas = (t, n) => { const pt = strong(toksf(n)); if (!pt.length) return false; const s = pt[pt.length - 1]; return toksf(t).some((w) => tokEq(w, s)); };
const surname = (name) => { const p = (name || '').trim().split(/\s+/); return (p.length > 1 ? p.slice(1).join(' ') : p[0] || '').toUpperCase(); };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ORDER = ['Finale', '1/2', '1/4', '1/8', '1/16', '1/32'];
const ROUND_TOKEN = { 'Finale': 'Finale', '1/2': '1/2 Finale', '1/4': '1/4 Finale', '1/8': '1/8 Finale', '1/16': '1/16 Finale', '1/32': '1/32 Finale' };
const roundOf = (t) => /1\s*\/\s*2/.test(t) ? '1/2' : /1\s*\/\s*4/.test(t) ? '1/4' : /1\s*\/\s*8/.test(t) ? '1/8' : /1\s*\/\s*16/.test(t) ? '1/16' : /1\s*\/\s*32/.test(t) ? '1/32' : /finale/i.test(t) ? 'Finale' : null;

// Résultats par saison/compétition.
const allPlayers = new Set();
const tours = [];
for (const f of readdirSync(DATA).filter((f) => /^results-(femmes-)?\d{4}-\d{4}\.json$/.test(f))) {
  const R = JSON.parse(readFileSync(join(DATA, f), 'utf8'));
  const comp = /femmes/.test(f) ? 'FEMMES' : 'MASTERS';
  const sm = f.match(/(\d{4})-(\d{4})/);
  const seasonCompact = sm ? `${sm[1].slice(2)}-${sm[2].slice(2)}` : '';
  for (const p of R.players || []) if (p.name) allPlayers.add(p.name);
  for (const t of R.tournaments || []) {
    const ms = (R.matches || []).filter((m) => m.tid === t.id && m.roundNo != null);
    if (!ms.length) continue;
    const finalRound = Math.max(...ms.map((m) => m.roundNo));
    const byRound = new Map();
    for (const m of ms) { if (!byRound.has(m.roundNo)) byRound.set(m.roundNo, []); byRound.get(m.roundNo).push(m); }
    tours.push({ season: sm ? `${sm[1]}-${sm[2]}` : '', seasonCompact, comp, level: t.level, city: t.city, date: t.date, kind: t.kind, tid: t.id, finalRound, byRound });
  }
}
const PLAYERS = [...allPlayers];
const named = (t) => /\s+vs?\.?\s+/i.test((t.split('|').pop() || '')) || PLAYERS.some((n) => titleHas(t, n));

const vids = existsSync(FULL)
  ? JSON.parse(readFileSync(FULL, 'utf8'))
  : (() => { const r = JSON.parse(readFileSync(CACHE, 'utf8')); return (Array.isArray(r) ? r : r.items || []).filter((v) => v.discipline === 'billard'); })();

const dday = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);
function matchTour(ti, date, comp) {
  if (!date) return null;
  // Numéro d'étape : « TN4 », « TN N°2 », « MASTERS N°1 »… (le « N° » ou « TN » évite
  // de confondre avec la saison « 25/26 »).
  const tnm = ti.match(/\bTN\s*0*(\d+)/i) || ti.match(/N°\s*0*(\d+)/i) || ti.match(/National\s*#?\s*0*(\d+)/i) || ti.match(/#\s*0*(\d+)/) || ti.match(/\bMASTERS\s+0*([1-9])\b(?!\d|\s*\/)/i) || ti.match(/\bFEMMES\s+0*([1-9])\b(?!\d|\s*\/)/i);
  const cdf = /championnat|france/i.test(ti);
  const cand = tours.filter((t) => t.comp === comp &&
    (tnm ? new RegExp(`\\bTN\\s*${tnm[1]}\\b`, 'i').test(t.level) : cdf ? (t.kind === 'france' || /championnat|france/i.test(t.level)) : true) &&
    t.date && dday(date, t.date) <= (tnm || cdf ? 10 : 3));
  return cand.length === 1 ? cand[0] : null;
}

// Lignes : vidéos circuit sans noms, rattachées, avec candidates.
const rows = [];
for (const v of vids) {
  if (EXCL.has(v.id)) continue;
  const ti = v.title || '';
  if (/basket|militaire|fougeres/i.test(ti)) continue;
  if (/afrique|marrakech|chinese|\bfauteuil|\béquipes?\b|\bequipes?\b|ultimate\s*pool|coupe\s*d/i.test(ti)) continue; // hors circuit FFB
  const comp = /femme/i.test(ti) ? 'FEMMES' : /master/i.test(ti) ? 'MASTERS' : null;
  if (!comp) continue;
  const r = roundOf(ti); if (!r) continue;
  if (named(ti)) continue;
  const t = matchTour(ti, v.date, comp); if (!t) continue;
  const rn = t.finalRound - ORDER.indexOf(r);
  const ms = (t.byRound.get(rn) || []).slice().sort((a, b) => (a.matchno || 0) - (b.matchno || 0));
  if (!ms.length) continue;
  const cands = ms.map((m) => ({ no: m.matchno, aId: m.aId, bId: m.bId, a: m.aName, b: m.bName, sa: m.sA, sb: m.sB, surA: surname(m.aName), surB: surname(m.bName) }));
  rows.push({ id: v.id, title: ti, date: (v.date || '').slice(0, 10), comp, season: t.seasonCompact, tid: t.tid, level: t.level, round: r, roundToken: ROUND_TOKEN[r], cands });
}
rows.sort((a, b) => (a.season < b.season ? 1 : a.season > b.season ? -1 : 0) || a.comp.localeCompare(b.comp) || a.level.localeCompare(b.level) || ORDER.indexOf(a.round) - ORDER.indexOf(b.round));

const DATAJSON = JSON.stringify(rows);
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nommage vidéos — tableau</title><style>
:root{color-scheme:light}body{font:14px/1.45 system-ui,sans-serif;margin:0;background:#f4f5f7;color:#1a1d21}
header{position:sticky;top:0;background:#111;color:#fff;padding:12px 18px;z-index:9;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
header b{color:#ffd24a}.btn{background:#1a73e8;color:#fff;border:0;border-radius:7px;padding:8px 14px;font-weight:600;cursor:pointer}
.btn.g{background:#2e8b57}main{max-width:1200px;margin:0 auto;padding:14px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}
th,td{padding:8px 10px;border-bottom:1px solid #eef;vertical-align:middle;text-align:left}
th{background:#f0f2f5;font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:#556}
tr.sep td{background:#eef2f7;font-weight:700;color:#234;font-size:13px}
.vid{display:flex;gap:9px;align-items:center}.vid img{width:120px;aspect-ratio:16/9;object-fit:cover;border-radius:5px;background:#ddd}
.vid a{color:#1a73e8;font-weight:600;text-decoration:none}.vid code{color:#99a;font-size:10px}
select{max-width:330px;padding:5px;border:1px solid #ccd;border-radius:6px}
.sc{width:42px;padding:5px;text-align:center;border:1px solid #ccd;border-radius:6px}
tr.done{background:#f3fbf5}.hint{color:#889;font-size:12px}
#out{width:100%;height:150px;font-family:ui-monospace,monospace;font-size:12px;border:1px solid #ccd;border-radius:8px;padding:8px;margin-top:8px}
.wrap{background:#fff;border-radius:10px;padding:12px 14px;margin-top:14px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
</style></head><body>
<header>Nommage vidéos — <b id="cnt">0</b>/<b>${rows.length}</b> attribuées
<button class="btn g" onclick="copyOut()">📋 Copier le résultat</button>
<span class="hint">Choisis l'affiche qui correspond à chaque vidéo, corrige le score si besoin, puis copie et colle-moi le bloc.</span></header>
<main><table id="t"><thead><tr><th>Vidéo (clique pour voir)</th><th>Match correspondant</th><th>Score</th></tr></thead><tbody id="b"></tbody></table>
<div class="wrap"><b>Résultat à me coller :</b><textarea id="out" readonly></textarea></div></main>
<script>
const DATA=${DATAJSON};
const b=document.getElementById('b');let lastKey='';
DATA.forEach((r,i)=>{
  const key=r.comp+' · '+r.level+' · '+r.season;
  if(key!==lastKey){lastKey=key;const sr=document.createElement('tr');sr.className='sep';sr.innerHTML='<td colspan="3">'+key+'</td>';b.appendChild(sr);}
  const tr=document.createElement('tr');tr.dataset.i=i;
  const opts=['<option value="">— choisir l\\'affiche —</option>'].concat(r.cands.map((c,j)=>'<option value="'+j+'">'+c.surA+' vs '+c.surB+'  ('+c.sa+'–'+c.sb+')</option>'));
  tr.innerHTML='<td><div class="vid"><a href="https://youtu.be/'+r.id+'" target="_blank" rel="noopener"><img loading="lazy" src="https://i.ytimg.com/vi/'+r.id+'/mqdefault.jpg"></a>'
    +'<div><a href="https://youtu.be/'+r.id+'" target="_blank" rel="noopener">▶ '+r.roundToken+'</a><br><code>'+r.id+'</code></div></div></td>'
    +'<td><select onchange="pick(this)">'+opts.join('')+'</select></td>'
    +'<td><input class="sc" data-s="a" inputmode="numeric"> – <input class="sc" data-s="b" inputmode="numeric"></td>';
  b.appendChild(tr);
});
function pick(sel){const tr=sel.closest('tr');const r=DATA[tr.dataset.i];const j=sel.value;const a=tr.querySelector('[data-s=a]'),bb=tr.querySelector('[data-s=b]');
  if(j===''){a.value='';bb.value='';tr.classList.remove('done');}else{const c=r.cands[j];a.value=c.sa;bb.value=c.sb;tr.classList.add('done');}build();}
document.addEventListener('input',e=>{if(e.target.classList.contains('sc'))build();});
function build(){const lines=[];let n=0;
  for(const tr of b.querySelectorAll('tr[data-i]')){const r=DATA[tr.dataset.i];const sel=tr.querySelector('select');const j=sel.value;if(j==='')continue;
    const c=r.cands[j];const sa=tr.querySelector('[data-s=a]').value.trim();const sb=tr.querySelector('[data-s=b]').value.trim();
    const title='🎱 '+r.season+' | BLACKBALL '+r.comp+' | '+r.roundToken+' – '+r.level+' | '+c.surA+' vs '+c.surB;
    lines.push(r.id+' | '+title+' | score='+sa+'-'+sb+' | tid='+r.tid+' no='+c.no);n++;}
  document.getElementById('out').value=lines.join('\\n');document.getElementById('cnt').textContent=n;}
function copyOut(){const o=document.getElementById('out');o.select();navigator.clipboard.writeText(o.value).then(()=>alert('Copié ! Colle-le moi dans le chat.'),()=>document.execCommand('copy'));}
</script></body></html>`;

writeFileSync(join(__dirname, '..', 'rename-ui.html'), html, 'utf8');
console.log(`Page interactive : ${rows.length} vidéos à attribuer → rename-ui.html`);
