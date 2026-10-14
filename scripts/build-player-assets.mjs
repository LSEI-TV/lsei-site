// ============================================================
//  PIPELINE assets joueurs — 100 % AUTONOME DANS LE DÉPÔT (tourne en local ET en CI).
//  Entrées (toutes versionnées dans le repo) :
//    - public/billard/blackball/<CAT>/<saison>/        : headshots détourés (photos)
//    - src/data/billard/players-roster.json            : roster actuel (lève les homonymes)
//    - src/data/billard/player-clubs.json              : association nom -> clé de club
//    - public/billard/clubs/<club>.png                 : logos de club
//    - src/data/billard/player-colors-overrides.json   : couleurs forcées (optionnel)
//    - src/data/billard/results-*.json                 : noms -> id Cuescore
//  Sorties : public/billard/cutouts/<slug>.png + src/data/billard/{player-cutouts,club-logos,player-colors}.json
//    node scripts/build-player-assets.mjs   (ou npm run assets)
// ============================================================
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { jerseyColor } from './jersey-color.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const HS = join(ROOT, 'public', 'billard', 'blackball');   // SOURCE des photos (headshots)
const CUT_DIR = join(ROOT, 'public', 'billard', 'cutouts');
const CLUB_DIR = join(ROOT, 'public', 'billard', 'clubs');  // logos de club (déjà versionnés)
const DATA = join(ROOT, 'src', 'data', 'billard');
mkdirSync(CUT_DIR, { recursive: true });

const nk = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const toks = (s) => new Set(nk(s).split(' ').filter(Boolean));
const subset = (a, b) => { for (const x of a) if (!b.has(x)) return false; return true; };
const sharedLong = (a, b) => { for (const x of a) if (x.length >= 4 && b.has(x)) return true; return false; };
const readJson = (name, dflt) => { try { return JSON.parse(readFileSync(join(DATA, name), 'utf8')); } catch { return dflt; } };

// --- Index nom -> {id, slug} depuis TOUS les résultats (toutes catégories). ---
const nameToPlayer = new Map();
for (const f of readdirSync(DATA).filter((f) => /^results-.*\d{4}-\d{4}\.json$/.test(f)).sort().reverse()) {
  let R; try { R = JSON.parse(readFileSync(join(DATA, f), 'utf8')); } catch { continue; }
  for (const p of R.players || []) {
    const key = nk(p.name);
    if (key && p.id != null && !nameToPlayer.has(key)) nameToPlayer.set(key, { id: p.id, slug: p.slug || key.replace(/ /g, '-') });
  }
}

const IMG = /\.(png|webp|jpe?g)$/i;

// --- Index des headshots : public/billard/blackball/<CAT>/<saison>/<fichier>. ---
const shots = [];
for (const cat of ['MASTERS', 'FEMMES', 'PARA-BILLARD']) {
  const base = join(HS, cat);
  if (!existsSync(base)) continue;
  for (const season of readdirSync(base).sort()) {
    const sd = join(base, season);
    if (!statSync(sd).isDirectory()) continue;
    for (const file of readdirSync(sd)) {
      if (!IMG.test(file)) continue;
      shots.push({ t: toks(file.replace(/\.[^.]+$/, '')), season, path: join(sd, file) });
    }
  }
}
// Meilleur headshot pour un nom : tokens compatibles + mot long partagé, saison la plus récente.
function bestHeadshot(name) {
  const jt = toks(name);
  const cand = shots.filter((h) => (subset(h.t, jt) || subset(jt, h.t)) && sharedLong(h.t, jt));
  cand.sort((a, b) => b.season.localeCompare(a.season)
    || ([...b.t].filter((x) => jt.has(x)).length - [...a.t].filter((x) => jt.has(x)).length));
  return cand[0] || null;
}

const cutouts = {}, clubs = {}, colors = {};
let okCut = 0, okColor = 0, noMatch = [], noCut = [];

async function addCutout(id, slug, path) {
  const out = join(CUT_DIR, `${slug}.png`);
  await sharp(path).png().toFile(out);
  cutouts[id] = slug; okCut++;
  const c = await jerseyColor(out);
  if (c) { colors[id] = { band: c.band, band2: c.band2 }; okColor++; }
}

// --- PASSE 1 : roster actuel (noms complets → id unique, lève les homonymes). ---
const roster = readJson('players-roster.json', []);
for (const r of roster) {
  const name = typeof r === 'string' ? r : r.name;
  const pl = nameToPlayer.get(nk(name));
  if (!pl) { noMatch.push(name); continue; }
  const h = bestHeadshot(name);
  if (h) { try { await addCutout(String(pl.id), pl.slug, h.path); } catch { noCut.push(name + ' (err)'); } }
  else noCut.push(name);
}

// --- PASSE 2 : tous les autres joueurs ayant un headshot et une correspondance UNIQUE
// dans le roster de leur catégorie (homonymes ignorés). Étend la couverture à tout le monde. ---
const CATROSTER = {
  MASTERS: [/^results-\d{4}-\d{4}\.json$/, /^results-mixte-/],
  FEMMES: [/^results-femmes-/],
  'PARA-BILLARD': [/^results-para-/, /^results-paramv-/],
};
const usedSlugs = new Set(Object.values(cutouts));
let okExtra = 0; const ambig = [];
for (const cat of Object.keys(CATROSTER)) {
  const rost = []; const seen = new Set();
  for (const f of readdirSync(DATA)) {
    if (!CATROSTER[cat].some((r) => r.test(f))) continue;
    let R; try { R = JSON.parse(readFileSync(join(DATA, f), 'utf8')); } catch { continue; }
    for (const p of R.players || []) { if (p.id == null || seen.has(p.id)) continue; seen.add(p.id); rost.push({ id: p.id, slug: p.slug || nk(p.name).replace(/ /g, '-'), t: toks(p.name) }); }
  }
  const base = join(HS, cat); if (!existsSync(base)) continue;
  const latest = new Map();
  for (const season of readdirSync(base).sort()) {
    const sd = join(base, season); if (!statSync(sd).isDirectory()) continue;
    for (const file of readdirSync(sd)) { if (!IMG.test(file)) continue; latest.set(nk(file.replace(/\.[^.]+$/, '')), join(sd, file)); }
  }
  for (const [key, path] of latest) {
    const ht = toks(key);
    const cand = rost.filter((p) => subset(ht, p.t) && sharedLong(ht, p.t));
    if (cand.length !== 1) { if (cand.length > 1) ambig.push(`${cat}:${key}`); continue; }
    const id = String(cand[0].id);
    if (cutouts[id]) continue;                      // déjà couvert par le roster
    let slug = cand[0].slug; if (usedSlugs.has(slug)) slug = `${slug}-${id}`;
    try { await addCutout(id, slug, path); usedSlugs.add(slug); okExtra++; } catch {}
  }
}

// --- LOGOS : association nom -> club (player-clubs.json) ; le PNG doit exister dans public/billard/clubs/. ---
const playerClubs = readJson('player-clubs.json', {});
let okLogo = 0; const missClub = [];
for (const [name, clubKey] of Object.entries(playerClubs)) {
  const pl = nameToPlayer.get(nk(name));
  if (!pl) continue;
  if (!existsSync(join(CLUB_DIR, `${clubKey}.png`))) { missClub.push(`${name}:${clubKey}`); continue; }
  clubs[String(pl.id)] = clubKey; okLogo++;
}

// --- OVERRIDES couleurs (corrections manuelles par id). ---
const overrides = readJson('player-colors-overrides.json', {});
let okOvr = 0;
for (const [id, c] of Object.entries(overrides)) { if (c && c.band && c.band2) { colors[id] = { band: c.band, band2: c.band2 }; okOvr++; } }

const w = (name, obj) => writeFileSync(join(DATA, name), JSON.stringify(obj, null, 0) + '\n', 'utf8');
w('player-cutouts.json', cutouts);
w('club-logos.json', clubs);
w('player-colors.json', colors);

console.log(`Cutouts: ${okCut} (roster ${okCut - okExtra} + 2e passe ${okExtra}) · Couleurs: ${Object.keys(colors).length} · Logos: ${okLogo}${okOvr ? ` · Overrides: ${okOvr}` : ''}`);
console.log(`Homonymes ignorés: ${ambig.length}${ambig.length ? ' — ' + ambig.join(', ') : ''}`);
console.log(`Roster sans match résultats (${noMatch.length}): ${noMatch.join(', ') || '—'}`);
console.log(`Roster sans headshot (${noCut.length}): ${noCut.join(', ') || '—'}`);
if (missClub.length) console.log(`⚠ Logos club manquants dans public/billard/clubs/ (${missClub.length}): ${missClub.join(', ')}`);
