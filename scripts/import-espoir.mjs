// ============================================================
//  Import des Tournois Nationaux Blackball FFB — catégorie ESPOIR — depuis Cuescore.
//
//  Génère un fichier results-espoir-<saison>.json par saison (même format que le Mixte),
//  pour TOUTES les saisons où l'Espoir existe sur Cuescore (2023-2024 → saison en cours).
//
//  - Les tournois d'une saison sont repérés sur la page de l'organisation FF Billard
//    (cuescore.com/ffb?season=YYYY), filtrés par leur NOM (2 conventions : ancienne
//    « TOURNOI ESPOIR » / « _ESPOIRS_ », nouvelle « - Espoir - ») et par leur DATE.
//  - Les POINTS et l'ordre du classement viennent du CLASSEMENT OFFICIEL Cuescore
//    (API ranking) dont l'id est lu dans le champ `rankings` de chaque tournoi — donc
//    un id par saison, identique au site FFB.
//
//    node scripts/import-espoir.mjs [--out <dir>] [--seasons 2023,2024] [--audit]
// ============================================================
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const getArg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = getArg('--out', join(__dirname, '..', 'src', 'data', 'billard'));
const AUDIT = argv.includes('--audit');
const ONLY = getArg('--seasons', '').split(',').filter(Boolean); // ex. "2023,2024"

const UA = { headers: { 'User-Agent': 'Mozilla/5.0 (LSEI blackball import bot)' } };
const mk = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const isWalkOver = (p) => /walk\s*over/i.test(p?.name || '') || !p?.playerId;
const jget = (u) => fetch(u, UA).then((r) => r.json());
// Match réellement joué : terminé, 2 vrais joueurs, et score non 0-0 (exclut forfaits/no-shows).
const isPlayed = (m) => m.matchstatusCode === 2 && !isWalkOver(m.playerA) && !isWalkOver(m.playerB) && !((m.scoreA ?? 0) === 0 && (m.scoreB ?? 0) === 0);

// Un nom de tournoi Espoir (TN ou Championnat de France), anciennes + nouvelles conventions.
const isEspoir = (name) => /(-\s*espoir\s*-)|(tournoi\s+espoirs?)|(_espoirs?_)|(\bespoirs?\b.*saison)/i.test(name || '');
const isCdf = (name) => /championnat\s+de\s+france/i.test(name || '') || /(?:^|[^a-z])chf(?:[^a-z]|$)/i.test(name || '');
const tnNum = (name) => { const m = String(name).match(/\btn\s*0*(\d+)/i) || String(name).match(/_tn0*(\d+)_/i); return m ? Number(m[1]) : null; };

// Saisons à traiter (année de début FFB, saisonStart = septembre). 2023 = saison 2023-2024.
const SEASONS = (ONLY.length ? ONLY.map(Number) : [2023, 2024, 2025, 2026]);

// Liste des tournois Espoir candidats d'une saison (id + nom), via la page org filtrée.
async function espoirCandidates(year) {
  const html = await fetch(`https://cuescore.com/ffb?season=${year}`, UA).then((r) => r.text());
  const re = /\/tournament\/([^"'/]+)\/(\d{6,})/g;
  const out = new Map();
  let m;
  while ((m = re.exec(html))) {
    const name = decodeURIComponent(m[1].replace(/\+/g, ' '));
    if (isEspoir(name)) out.set(m[2], name);
  }
  return [...out.entries()].map(([id, name]) => ({ id, name }));
}

// Classement officiel (rang + points) d'une saison, depuis l'id lu dans tournoi.rankings.
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
  const cands = await espoirCandidates(year);

  const tournaments = [], matches = [], players = new Map();
  let rankingId = null;
  const tmeta = [];

  for (const c of cands) {
    let api;
    try { api = await jget(`https://api.cuescore.com/tournament/?id=${c.id}`); } catch { continue; }
    const date = (api.starttime || '').slice(0, 10);
    if (!date || date < START || date > END) continue; // écarte l'intrus courant (ex. TN2 Albi 26-27 présent sur toutes les pages)
    const finished = (api.matches || []).filter(isPlayed);
    if (!finished.length) continue;
    // id du classement officiel de la saison (champ rankings du tournoi)
    if (!rankingId) { const rk = (api.rankings || []).find((r) => /espoir/i.test(r.name)); if (rk) rankingId = rk.rankingId; }
    const name = api.name || c.name;
    const cdf = isCdf(name);
    const num = tnNum(name);
    // Ville : nouveau format « FFB - … - <Ville> » → dernier segment ; ancien « BB_TN1_<VILLE>_… »
    // ou « BB_CHF <VILLE>_… » → segment après le niveau.
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

  if (!tournaments.length) { console.log(`[${label}] aucun tournoi Espoir trouvé.`); return null; }

  const official = await officialRanking(rankingId);
  for (const p of players.values()) {
    const off = official ? (official.byId.get(String(p.id)) ?? official.byName.get(mk(p.rawName))) : undefined;
    if (off) { p.points = off.points; p.offRank = off.rank; }
  }
  const ranked = [...players.values()].sort((a, b) => (a.offRank ?? 1e9) - (b.offRank ?? 1e9) || b.points - a.points || (b.pf - b.pa) - (a.pf - a.pa) || (a.name < b.name ? -1 : 1));
  ranked.forEach((p, i) => { p.rank = i + 1; });
  const toRow = (p) => ({ id: p.id, name: p.name, slug: p.slug, country: p.country, rank: p.rank, points: p.points, played: p.played, wins: p.wins, losses: p.losses, winPct: p.played ? Math.round((p.wins / p.played) * 100) : 0, pf: p.pf, pa: p.pa, diff: p.pf - p.pa, tourns: p.tourns.size });
  const out = { competition: 'Espoir', season: `${year}/${year + 1}`, tournaments, players: ranked.map(toRow), matches };

  await mkdir(OUT, { recursive: true });
  const file = join(OUT, `results-espoir-${label}.json`);
  await writeFile(file, JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log(`[${label}] ${tournaments.length} tournois · ${ranked.length} joueurs · ${matches.length} matchs · classement ${official ? 'OFFICIEL (' + rankingId + ')' : 'absent'} → results-espoir-${label}.json`);
  console.log(`         top 5: ${ranked.slice(0, 5).map((p) => `${p.rank}.${p.name}(${p.points})`).join('  ')}`);

  if (AUDIT) {
    // Audit match par match : nos matchs (ré-extraits) vs Cuescore (re-téléchargé) — doit être 0 écart par construction.
    let tot = 0, conc = 0;
    for (const t of tmeta) {
      const cs = await jget(`https://api.cuescore.com/tournament/?id=${t.id}`);
      const csP = (cs.matches || []).filter(isPlayed);
      tot += csP.length; conc += t.finished.length;
    }
    console.log(`         audit matchs: générés=${matches.length} vs Cuescore joués=${tot}`);
  }
  return out;
}

for (const y of SEASONS) await importSeason(y);
