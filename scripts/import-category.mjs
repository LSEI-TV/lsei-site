// ============================================================
//  Import générique d'une catégorie Blackball FFB (Junior, Vétéran, Prestige Vétéran…)
//  depuis Cuescore — même recette que import-espoir.mjs, paramétrée par --cat.
//
//  Génère results-<prefix>-<saison>.json pour toutes les saisons où la catégorie
//  existe (2023-2024 → saison en cours). Points/rangs OFFICIELS FFB (id de classement
//  lu dans tournoi.rankings, un par saison). Forfaits 0-0 exclus. Même format que le Mixte.
//
//    node scripts/import-category.mjs --cat junior [--out <dir>] [--seasons 2023,2024] [--audit]
// ============================================================
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const getArg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const CAT = getArg('--cat', '');
const OUT = getArg('--out', join(__dirname, '..', 'src', 'data', 'billard'));
const AUDIT = argv.includes('--audit');
const ONLY = getArg('--seasons', '').split(',').filter(Boolean);

// --- Registre des catégories. nameRe = nom d'un tournoi (TN ou CHF) de la catégorie ;
//     rankRe = nom du classement officiel (champ tournoi.rankings) de la catégorie. ---
const V = '(?:v[ée]t[ée]ran)';
const CATS = {
  junior: {
    label: 'Junior', prefix: 'junior',
    nameRe: (n) => /(-\s*junior\s*-)|(tournoi\s+juniors?)|(_juniors?_)|(\bjuniors?\b.*saison)/i.test(n),
    rankRe: (n) => /junior/i.test(n),
  },
  veteran: {
    // « Vétéran » SANS « Prestige » (catégorie distincte ci-dessous).
    label: 'Vétéran', prefix: 'veteran',
    nameRe: (n) => new RegExp(`(-\\s*${V}\\s*-)|(tournoi\\s+${V}s?)|(_${V}s?_)|(\\b${V}s?\\b.*saison)`, 'i').test(n) && !/prestige/i.test(n),
    rankRe: (n) => new RegExp(V, 'i').test(n) && !/prestige/i.test(n),
  },
  prestige: {
    label: 'Prestige Vétéran', prefix: 'prestige',
    nameRe: (n) => /prestige/i.test(n) && new RegExp(V, 'i').test(n),
    rankRe: (n) => /prestige/i.test(n) && new RegExp(V, 'i').test(n),
  },
};
const cfg = CATS[CAT];
if (!cfg) { console.error(`--cat requis parmi : ${Object.keys(CATS).join(', ')}`); process.exit(1); }

const UA = { headers: { 'User-Agent': 'Mozilla/5.0 (LSEI blackball import bot)' } };
const mk = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const isWalkOver = (p) => /walk\s*over/i.test(p?.name || '') || !p?.playerId;
const jget = (u) => fetch(u, UA).then((r) => r.json());
const isPlayed = (m) => m.matchstatusCode === 2 && !isWalkOver(m.playerA) && !isWalkOver(m.playerB) && !((m.scoreA ?? 0) === 0 && (m.scoreB ?? 0) === 0);
const isCdf = (name) => /championnat\s+de\s+france/i.test(name || '') || /(?:^|[^a-z])chf(?:[^a-z]|$)/i.test(name || '');
const tnNum = (name) => { const m = String(name).match(/\btn\s*0*(\d+)/i) || String(name).match(/_tn0*(\d+)_/i); return m ? Number(m[1]) : null; };

const SEASONS = (ONLY.length ? ONLY.map(Number) : [2023, 2024, 2025, 2026]);

async function candidates(year) {
  const html = await fetch(`https://cuescore.com/ffb?season=${year}`, UA).then((r) => r.text());
  const re = /\/tournament\/([^"'/]+)\/(\d{6,})/g;
  const out = new Map();
  let m;
  while ((m = re.exec(html))) {
    const name = decodeURIComponent(m[1].replace(/\+/g, ' '));
    if (cfg.nameRe(name)) out.set(m[2], name);
  }
  return [...out.entries()].map(([id, name]) => ({ id, name }));
}

async function officialRanking(rankingId) {
  if (!rankingId) return null;
  try {
    const rk = await jget(`https://api.cuescore.com/ranking/?id=${rankingId}`);
    const parts = rk.participants || [];
    if (!parts.length) return null;
    const byId = new Map(), byName = new Map();
    for (const p of parts) { const v = { rank: p.rank, points: p.points }; byId.set(String(p.participantId), v); byName.set(mk(p.name), v); }
    return { byId, byName, name: rk.name };
  } catch { return null; }
}

async function importSeason(year) {
  const label = `${year}-${year + 1}`;
  const START = `${year}-08-01`, END = `${year + 1}-07-31`;
  const cands = await candidates(year);

  const tournaments = [], matches = [], players = new Map();
  let rankingId = null, rankingName = '';
  const tmeta = [];

  for (const c of cands) {
    let api;
    try { api = await jget(`https://api.cuescore.com/tournament/?id=${c.id}`); } catch { continue; }
    const date = (api.starttime || '').slice(0, 10);
    if (!date || date < START || date > END) continue;
    const finished = (api.matches || []).filter(isPlayed);
    if (!finished.length) continue;
    if (!rankingId) { const rk = (api.rankings || []).find((r) => cfg.rankRe(r.name)); if (rk) { rankingId = rk.rankingId; rankingName = rk.name; } }
    const name = api.name || c.name;
    const cdf = isCdf(name);
    const num = tnNum(name);
    let city;
    if (name.includes(' - ')) city = name.split(' - ').pop().trim();
    else { const sg = name.split('_'); city = (/^tn\d+$/i.test((sg[1] || '').trim()) ? (sg[2] || '') : (sg[1] || '').replace(/^chf\s+/i, '')).trim(); }
    tmeta.push({ id: String(c.id), name, date, cdf, tn: cdf ? 999 : (num ?? 998), city, finished });
  }
  tmeta.sort((a, b) => a.tn - b.tn);

  for (const t of tmeta) {
    tournaments.push({ id: t.id, name: t.name, city: t.city, date: t.date, level: t.cdf ? 'Championnat de France' : `TN${t.tn}`, kind: t.cdf ? 'france' : 'tn' });
    const ensure = (p) => {
      if (!players.has(p.playerId)) players.set(p.playerId, { id: p.playerId, name: p.name, slug: slugify(p.name), rawName: p.name, country: p.country?.alpha3 || 'FRA', points: 0, played: 0, wins: 0, losses: 0, pf: 0, pa: 0, tourns: new Set() });
      return players.get(p.playerId);
    };
    for (const m of t.finished) {
      const a = ensure(m.playerA), b = ensure(m.playerB);
      const sA = m.scoreA ?? 0, sB = m.scoreB ?? 0;
      const mdate = (m.starttime || t.date).slice(0, 10);
      matches.push({ tid: t.id, date: mdate, aId: a.id, bId: b.id, aName: a.name, bName: b.name, sA, sB, round: m.roundName, matchno: m.matchno ?? null, roundNo: m.round ?? null });
      for (const [pl, my, opp] of [[a, sA, sB], [b, sB, sA]]) { pl.played++; pl.pf += my; pl.pa += opp; pl.tourns.add(t.id); if (my > opp) pl.wins++; else pl.losses++; }
    }
  }

  if (!tournaments.length) { console.log(`[${cfg.label} ${label}] aucun tournoi trouvé.`); return null; }

  const official = await officialRanking(rankingId);
  for (const p of players.values()) {
    const off = official ? (official.byId.get(String(p.id)) ?? official.byName.get(mk(p.rawName))) : undefined;
    if (off) { p.points = off.points; p.offRank = off.rank; }
  }
  const ranked = [...players.values()].sort((a, b) => (a.offRank ?? 1e9) - (b.offRank ?? 1e9) || b.points - a.points || (b.pf - b.pa) - (a.pf - a.pa) || (a.name < b.name ? -1 : 1));
  ranked.forEach((p, i) => { p.rank = i + 1; });
  const toRow = (p) => ({ id: p.id, name: p.name, slug: p.slug, country: p.country, rank: p.rank, points: p.points, played: p.played, wins: p.wins, losses: p.losses, winPct: p.played ? Math.round((p.wins / p.played) * 100) : 0, pf: p.pf, pa: p.pa, diff: p.pf - p.pa, tourns: p.tourns.size });
  const out = { competition: cfg.label, season: `${year}/${year + 1}`, tournaments, players: ranked.map(toRow), matches };

  await mkdir(OUT, { recursive: true });
  const file = join(OUT, `results-${cfg.prefix}-${label}.json`);
  await writeFile(file, JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log(`[${cfg.label} ${label}] ${tournaments.length} tournois · ${ranked.length} joueurs · ${matches.length} matchs · classement ${official ? 'OFFICIEL (' + rankingId + ' ' + rankingName + ')' : 'absent'} → results-${cfg.prefix}-${label}.json`);
  console.log(`         niveaux: ${tournaments.map((t) => `${t.level}=${t.city}`).join('  ')}`);
  console.log(`         top 5: ${ranked.slice(0, 5).map((p) => `${p.rank}.${p.name}(${p.points})`).join('  ')}`);

  if (AUDIT) {
    let tot = 0;
    for (const t of tmeta) { const cs = await jget(`https://api.cuescore.com/tournament/?id=${t.id}`); tot += (cs.matches || []).filter(isPlayed).length; }
    console.log(`         audit matchs: générés=${matches.length} vs Cuescore joués=${tot}  → ${matches.length === tot ? 'OK' : 'ÉCART'}`);
  }
  return out;
}

console.log(`=== Import catégorie : ${cfg.label} ===`);
for (const y of SEASONS) await importSeason(y);
