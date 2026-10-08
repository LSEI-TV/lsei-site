// ============================================================
//  Récupère le CALENDRIER de la Poule B (NM1) depuis nm1.ffbb.com et écrit
//  src/data/cache/basket-calendar.json.
//
//  La page /saison-reguliere/calendrier est rendue côté serveur → fetch + parsing.
//  On NE se fie PAS à l'étiquette « Group A/B » de la FFBB (incohérente, mélange
//  les phases). On garde uniquement les matchs dont LES DEUX équipes appartiennent
//  à notre Poule B (les clubs de src/data/basket.ts). On lit AUSSI les SCORES
//  (span .team__score, présent dès que le match est joué) → résultats affichés
//  automatiquement, et les matchs passés RESTENT au calendrier (ils ne « tombent »
//  plus comme avant). Chaque <li> porte les 2 équipes en alt=… (passé ET à venir) ;
//  l'ancien parseur ne lisait que les liens /equipe/ des matchs À VENIR → il perdait
//  tous les matchs joués. Défensif : n'écrase pas le cache si la récupération échoue.
//  2×/jour via refresh.
// ============================================================
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const URL = 'https://nm1.ffbb.com/saison-reguliere/calendrier';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/cache/basket-calendar.json');

const norm = (s) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Nom (ou slug FFBB) normalisé → slug LSEI. Les clubs de la Poule B.
// (Pôle France a été versé dans une autre poule par la FFBB → retiré ici aussi,
//  sinon ses matchs entreraient dans le cache avant d'être filtrés en aval.)
const TO_SLUG = new Map(Object.entries({
  'angers': 'angers',
  'bordeaux': 'bordeaux', 'jsa bordeaux': 'bordeaux',
  'challans': 'challans',
  'chartres': 'chartres',
  'fougeres': 'fougeres', 'pays de fougeres': 'fougeres',
  'laval': 'laval',
  'lorient': 'lorient',
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

  // Un <li class="display-games__third-list__entry"> par match (passé OU à venir).
  const blocks = html.split(/<li class="display-games__third-list__entry/).slice(1);
  const seen = new Set();
  const matches = [];
  for (const b of blocks) {
    // Date : « 18/09 20:00 » — le jour peut être sur 1 chiffre (« 2/10 », « 7/10 »).
    const dm = b.match(/class="date">\s*(\d{1,2})\/(\d{2})/);
    if (!dm) continue;
    // Équipes : alt=… des 2 logos (présent pour les matchs passés ET à venir).
    const teams = [...b.matchAll(/<img class="picture"[^>]*alt="([^"]*)"/g)].map((m) => m[1]);
    if (teams.length < 2) continue;
    const home = toSlug(teams[0]);
    const away = toSlug(teams[1]);
    if (!home || !away) continue; // au moins une équipe hors Poule B → ignoré
    // Scores : span .team__score (vide tant que le match n'est pas joué), ordre DOM = [dom, ext].
    const scores = [...b.matchAll(/class="team__score[^"]*">\s*(\d+)\s*</g)].map((m) => Number(m[1]));
    const day = dm[1].padStart(2, '0'), month = dm[2];
    const year = Number(month) >= 8 ? '2026' : '2027'; // saison sept 2026 → juin 2027
    const date = `${year}-${month}-${day}`;
    const key = `${date}_${home}_${away}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const rec = { date, homeSlug: home, awaySlug: away };
    if (scores.length >= 2) { rec.homeScore = scores[0]; rec.awayScore = scores[1]; }
    matches.push(rec);
  }
  matches.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (matches.length < 20) throw new Error(`Calendrier suspect (${matches.length} matchs) — abandon, cache conservé.`);

  const payload = { updated: new Date().toISOString(), source: URL, pool: 'Poule B', matches };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  const fou = matches.filter((m) => m.homeSlug === 'fougeres' || m.awaySlug === 'fougeres').length;
  const played = matches.filter((m) => m.homeScore != null).length;
  console.log(`✓ Calendrier écrit : ${matches.length} matchs Poule B (dont ${fou} de Fougères, ${played} joués avec score). → ${OUT}`);
}

main().catch((e) => { console.error('✗ Échec récupération calendrier basket :', e.message); process.exit(1); });
