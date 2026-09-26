// ============================================================
//  Récupère le CALENDRIER de la Poule B (NM1) depuis nm1.ffbb.com et écrit
//  src/data/cache/basket-calendar.json.
//
//  La page /saison-reguliere/calendrier est rendue côté serveur → fetch + parsing.
//  On NE se fie PAS à l'étiquette « Group A/B » de la FFBB (incohérente, mélange
//  les phases). On garde uniquement les matchs dont LES DEUX équipes appartiennent
//  à notre Poule B (les 14 clubs de src/data/basket.ts). Les SCORES ne sont pas
//  récupérables (rendus en JavaScript) → fixtures seulement (dates + équipes).
//  Défensif : n'écrase pas le cache si la récupération échoue. 2×/jour via refresh.
// ============================================================
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const URL = 'https://nm1.ffbb.com/saison-reguliere/calendrier';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/cache/basket-calendar.json');

const norm = (s) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Nom (ou slug FFBB) normalisé → slug LSEI. Les 14 clubs de la Poule B.
const TO_SLUG = new Map(Object.entries({
  'angers': 'angers',
  'bordeaux': 'bordeaux', 'jsa bordeaux': 'bordeaux',
  'challans': 'challans',
  'chartres': 'chartres',
  'fougeres': 'fougeres', 'pays de fougeres': 'fougeres',
  'laval': 'laval',
  'lorient': 'lorient',
  'pole france': 'pole-france', 'cfbb': 'pole-france',
  'rennes': 'rennes',
  'sables': 'sables', 'les sables d olonne': 'sables', 'sables d olonne': 'sables',
  'tarbes': 'tarbes', 'tarbes lourdes': 'tarbes',
  'toulouse': 'toulouse',
  'tours': 'tours',
  'vitre': 'vitre',
}));
function toSlug(name) {
  const n = norm(name);
  if (TO_SLUG.has(n)) return TO_SLUG.get(n);
  for (const [alias, slug] of TO_SLUG) if (n.includes(alias) || alias.includes(n)) return slug;
  return null;
}

async function main() {
  const res = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0 (LSEI basket calendar bot)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${URL}`);
  const html = await res.text();

  const blocks = html.split(/(?=<span class="game__date")/);
  const seen = new Set();
  const matches = [];
  for (const b of blocks) {
    const dm = b.match(/class="date">\s*(\d{2})\/(\d{2})/);
    if (!dm) continue;
    const teams = [...b.matchAll(/\/saison-reguliere\/equipe\/\d+-[a-z0-9-]+"[^>]*title="([^"]+)"/g)].map((m) => m[1]);
    if (teams.length < 2) continue;
    const home = toSlug(teams[0]);
    const away = toSlug(teams[1]);
    if (!home || !away) continue; // au moins une équipe hors Poule B → ignoré
    const day = dm[1], month = dm[2];
    const year = Number(month) >= 8 ? '2026' : '2027'; // saison sept 2026 → juin 2027
    const date = `${year}-${month}-${day}`;
    const key = `${date}_${home}_${away}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({ date, homeSlug: home, awaySlug: away });
  }
  matches.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (matches.length < 20) throw new Error(`Calendrier suspect (${matches.length} matchs) — abandon, cache conservé.`);

  const payload = { updated: new Date().toISOString(), source: URL, pool: 'Poule B', matches };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  const fou = matches.filter((m) => m.homeSlug === 'fougeres' || m.awaySlug === 'fougeres').length;
  console.log(`✓ Calendrier écrit : ${matches.length} matchs Poule B (dont ${fou} de Fougères). → ${OUT}`);
}

main().catch((e) => { console.error('✗ Échec récupération calendrier basket :', e.message); process.exit(1); });
