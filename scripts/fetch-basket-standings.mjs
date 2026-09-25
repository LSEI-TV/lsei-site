// ============================================================
//  Récupère le CLASSEMENT NM1 (poule de Fougères) depuis nm1.ffbb.com et
//  écrit src/data/cache/basket-standings.json.
//
//  La page est rendue côté serveur (Symfony/Proballers) → un simple fetch + un
//  parsing HTML suffit (pas de navigateur headless). Défensif : en cas d'échec
//  ou de page modifiée, le script sort en erreur SANS toucher au cache existant,
//  et le site continue d'afficher la dernière version connue (ou le calcul par
//  calendrier en repli). Lancer : `node scripts/fetch-basket-standings.mjs`.
// ============================================================
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const URL = 'https://nm1.ffbb.com/saison-reguliere/classement';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/cache/basket-standings.json');

// Normalisation accents/casse/ponctuation → clé comparable.
const norm = (s) =>
  (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Nom OU slug FFBB (normalisés) → slug LSEI (cf. nmClubs dans src/data/basket.ts).
// Les 14 clubs de la poule ; plusieurs alias par sécurité (nom complet, ville, slug FFBB).
const TO_SLUG = new Map(Object.entries({
  'angers': 'angers',
  'bordeaux': 'bordeaux',
  'challans': 'challans',
  'chartres': 'chartres',
  'fougeres': 'fougeres', 'pays de fougeres': 'fougeres',
  'laval': 'laval',
  'lorient': 'lorient',
  'pole france': 'pole-france', 'cfbb': 'pole-france', 'insep': 'pole-france',
  'rennes': 'rennes',
  'sables': 'sables', 'les sables d olonne': 'sables', 'sables d olonne': 'sables',
  'tarbes': 'tarbes', 'tarbes lourdes': 'tarbes',
  'toulouse': 'toulouse',
  'tours': 'tours',
  'vitre': 'vitre',
}));

function resolveSlug(name, ffbbSlug) {
  const nName = norm(name);
  const nSlug = norm(ffbbSlug);
  if (TO_SLUG.has(nName)) return TO_SLUG.get(nName);
  if (TO_SLUG.has(nSlug)) return TO_SLUG.get(nSlug);
  // Repli : un token distinctif de l'un de nos alias apparaît dans le nom/slug.
  for (const [alias, slug] of TO_SLUG) {
    if (nName.includes(alias) || nSlug.includes(alias) || alias.includes(nSlug)) return slug;
  }
  return null;
}

function parseRows(tableHtml) {
  const body = tableHtml.match(/<tbody[\s\S]*?<\/tbody>/i)?.[0] ?? tableHtml;
  const trs = body.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const rows = [];
  for (const tr of trs) {
    if (/correspondance_erreur/i.test(tr)) continue;
    const rank = Number(tr.match(/class="position"[^>]*>\s*(\d+)/i)?.[1]);
    const aTag = tr.match(/<a[^>]*class="team"[^>]*>/i)?.[0] ?? '';
    const name = (aTag.match(/title="([^"]*)"/i)?.[1] ?? '').replace(/&#0?39;|&apos;/g, "'").trim();
    const ffbbSlug = aTag.match(/\/equipe\/\d+-([a-z0-9-]+)/i)?.[1] ?? '';
    // Les 9 colonnes numériques (td.right) dans l'ordre : Pts, MJ, V, D, PM, PMmoy, PE, PEmoy, Diff
    const nums = [...tr.matchAll(/<td[^>]*class="right"[^>]*>\s*([-\d.]+)\s*<\/td>/gi)].map((m) => m[1]);
    if (!rank || !name || nums.length < 9) continue;
    const [pts, mj, v, d, pf, , pa] = nums.map(Number);
    const slug = resolveSlug(name, ffbbSlug);
    rows.push({ slug, ffbbName: name, ffbbSlug, rank, pts, played: mj, w: v, l: d, pf, pa, diff: pf - pa });
  }
  return rows;
}

async function main() {
  const res = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0 (LSEI basket standings bot)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${URL}`);
  const html = await res.text();
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  if (!tables.length) throw new Error('Aucune <table> trouvée — la page a peut-être changé.');

  // Choisit la table de NOTRE poule = celle avec le plus d'équipes reconnues (contient Fougères).
  let best = null;
  for (const t of tables) {
    const rows = parseRows(t);
    const mapped = rows.filter((r) => r.slug).length;
    if (!best || mapped > best.mapped) best = { rows, mapped };
  }
  if (!best || best.mapped < 6) throw new Error(`Poule non identifiée (seulement ${best?.mapped ?? 0} équipes reconnues).`);

  const rows = best.rows;
  const unmapped = rows.filter((r) => !r.slug);
  if (unmapped.length) {
    console.warn('⚠ Équipes non mappées :', unmapped.map((r) => `${r.ffbbName} (${r.ffbbSlug})`).join(', '));
  }
  if (!rows.some((r) => r.slug === 'fougeres')) throw new Error('Fougères absent de la poule parsée — abandon (cache conservé).');

  const clean = rows
    .filter((r) => r.slug)
    .map(({ slug, rank, pts, played, w, l, pf, pa, diff }) => ({ slug, rank, pts, played, w, l, pf, pa, diff }))
    .sort((a, b) => a.rank - b.rank);

  const payload = {
    updated: new Date().toISOString(),
    source: URL,
    pool: 'Poule B',
    rows: clean,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`✓ Classement écrit : ${clean.length} équipes (Fougères ${clean.find((r) => r.slug === 'fougeres')?.rank}e). → ${OUT}`);
}

main().catch((e) => { console.error('✗ Échec récupération classement basket :', e.message); process.exit(1); });
