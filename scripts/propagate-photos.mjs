// ============================================================
//  Propagation des photos entre catégories pour une même PERSONNE.
//  Un joueur qui a joué dans plusieurs catégories (ex. Junior → Espoir → Mixte → Masters)
//  garde le même id Cuescore. Si sa photo existe dans le dossier d'une catégorie mais pas
//  dans une autre où il a aussi joué, on la copie dans les dossiers des SAISONS concernées.
//
//  Rattachement photo→joueur : par le NOM (tokens), UNIQUEMENT si la correspondance est unique
//  dans la catégorie source (les homonymes ambigus sont ignorés, comme build-player-assets).
//
//    node scripts/propagate-photos.mjs           → DRY-RUN (n'écrit rien, liste les copies)
//    node scripts/propagate-photos.mjs --apply    → applique les copies
// ============================================================
import { readFileSync, readdirSync, existsSync, statSync, copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const HS = join(ROOT, 'public', 'billard', 'blackball');
const DATA = join(ROOT, 'src', 'data', 'billard');
const APPLY = process.argv.includes('--apply');

const nk = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const toks = (s) => new Set(nk(s).split(' ').filter(Boolean));
const subset = (a, b) => { for (const x of a) if (!b.has(x)) return false; return true; };
const sharedLong = (a, b) => { for (const x of a) if (x.length >= 4 && b.has(x)) return true; return false; };
const IMG = /\.(png|webp|jpe?g)$/i;

// Dossier photo de catégorie  ->  fichiers results correspondants
const CATS = {
  MASTERS: [/^results-\d{4}-\d{4}\.json$/],
  FEMMES: [/^results-femmes-/],
  MIXTE: [/^results-mixte-/],
  ESPOIR: [/^results-espoir-/],
  JUNIOR: [/^results-junior-/],
  VETERAN: [/^results-veteran-/],
  PRESTIGE: [/^results-prestige-/],
  'PARA-BILLARD': [/^results-para-\d/, /^results-paramv-/],
};

// Roster par catégorie : id -> { id, name, t:tokens, seasons:Set(slug) }
const roster = {};
for (const [cat, res] of Object.entries(CATS)) {
  const byId = new Map();
  for (const f of readdirSync(DATA)) {
    if (!res.some((r) => r.test(f))) continue;
    const season = (f.match(/(\d{4}-\d{4})/) || [])[1] || '';
    let R; try { R = JSON.parse(readFileSync(join(DATA, f), 'utf8')); } catch { continue; }
    for (const p of R.players || []) {
      if (p.id == null) continue;
      let e = byId.get(p.id);
      if (!e) { e = { id: p.id, name: p.name, t: toks(p.name), seasons: new Set() }; byId.set(p.id, e); }
      if (season) e.seasons.add(season);
    }
  }
  roster[cat] = byId;
}

// Photos présentes : cat -> season -> [{file, path, t}]
const photos = {};
for (const cat of Object.keys(CATS)) {
  photos[cat] = {};
  const base = join(HS, cat);
  if (!existsSync(base)) continue;
  for (const season of readdirSync(base)) {
    const sd = join(base, season);
    if (!statSync(sd).isDirectory()) continue;
    const list = readdirSync(sd).filter((f) => IMG.test(f)).map((file) => ({ file, path: join(sd, file), t: toks(file.replace(/\.[^.]+$/, '')) }));
    if (list.length) photos[cat][season] = list;
  }
}

// Un joueur (tokens) a-t-il déjà une photo dans cat/season ?
function hasPhoto(cat, season, pt) {
  const list = (photos[cat] && photos[cat][season]) || [];
  return list.some((ph) => (subset(ph.t, pt) || subset(pt, ph.t)) && sharedLong(ph.t, pt));
}
// Rattache un fichier photo à un joueur UNIQUE de la catégorie source.
function matchPlayer(cat, pt) {
  const cand = [...roster[cat].values()].filter((p) => (subset(pt, p.t) || subset(p.t, pt)) && sharedLong(pt, p.t));
  return cand.length === 1 ? cand[0] : null;
}

// Pour chaque joueur, sa MEILLEURE photo source (la plus récente, toutes catégories).
const bestById = new Map(); // id -> { path, season, file }
for (const cat of Object.keys(CATS)) {
  for (const [season, list] of Object.entries(photos[cat])) {
    for (const ph of list) {
      const p = matchPlayer(cat, ph.t);
      if (!p) continue;
      const cur = bestById.get(p.id);
      if (!cur || season > cur.season) bestById.set(p.id, { path: ph.path, season, file: ph.file, name: p.name });
    }
  }
}

// Catégories jouées par chaque id.
const catsOf = (id) => Object.keys(CATS).filter((cat) => roster[cat].has(id));

// Copies : SEULEMENT les joueurs qui ont joué dans ≥2 catégories (cross-catégorie).
// On garantit leur photo dans chaque (catégorie, saison) qu'ils ont jouée et qui ne l'a pas.
// Idempotent : re-lancer ne recopie rien (test par saison).
const copies = [];
for (const [id, src] of bestById) {
  if (catsOf(id).length < 2) continue; // mono-catégorie → pas de propagation
  for (const cat of Object.keys(CATS)) {
    const p = roster[cat].get(id);
    if (!p) continue;
    for (const season of p.seasons) {
      const target = join(HS, cat, season, src.file);
      if (existsSync(target)) continue;       // déjà le fichier
      if (hasPhoto(cat, season, p.t)) continue; // déjà une photo de ce joueur pour cette saison
      copies.push({ id, name: src.name, from: src.path, to: target, cat, season, file: src.file });
    }
  }
}

// Rapport
const byCat = {};
for (const c of copies) { byCat[c.cat] = byCat[c.cat] || {}; byCat[c.cat][c.season] = (byCat[c.cat][c.season] || 0) + 1; }
console.log(`Joueurs avec photo (source) : ${bestById.size}`);
console.log(`Copies ${APPLY ? 'APPLIQUÉES' : 'à faire (DRY-RUN)'} : ${copies.length}`);
for (const [cat, seasons] of Object.entries(byCat)) {
  console.log(`  ${cat} : ${Object.entries(seasons).map(([s, n]) => `${s}=${n}`).join('  ')}`);
}
console.log('\nExemples :');
for (const c of copies.slice(0, 12)) console.log(`  ${c.name}  →  ${c.cat}/${c.season}/${c.file}`);

if (APPLY) {
  let done = 0;
  for (const c of copies) { try { mkdirSync(dirname(c.to), { recursive: true }); copyFileSync(c.from, c.to); done++; } catch (e) { console.log('ERR', c.to, e.message); } }
  console.log(`\n${done} photo(s) copiée(s).`);
} else {
  console.log('\n(DRY-RUN — relancer avec --apply pour copier)');
}
