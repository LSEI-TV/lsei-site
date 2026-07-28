// ============================================================
//  Générateur de résultats depuis UN SEUL tournoi Cuescore (sans classement).
//  Pour les compétitions à événement unique — ex. le 1er Championnat de France
//  Para-billard malvoyants (aucun circuit TN, aucun ranking).
//
//  USAGE :
//    npm run gen:tournament -- --tournament=<id> --out=<fichier.json> \
//        --competition="Blackball Para-billard malvoyants" --season="2025/2026"
//
//  Le RANG vient du classement final officiel (standings Cuescore) ; les stats
//  (V/D, manches, %) sont calculées depuis TOUS les matchs joués (poule + finale).
// ============================================================
import { writeFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }),
);
const TID = args.tournament;
const OUT = args.out;
const COMPETITION = args.competition || 'Blackball';
const SEASON = args.season || '';
if (!TID || !OUT) {
  console.error('Usage : npm run gen:tournament -- --tournament=<id> --out=<fichier.json> --competition="..." --season="AAAA/AAAA"');
  process.exit(1);
}

const WALKOVER_ID = 1000615;
const isReal = (p) => p && p.playerId && p.playerId !== WALKOVER_ID && p.name !== 'Walk Over' && p.name !== 'Bye';
const slugify = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const j = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`Cuescore ${r.status} sur ${url}`); return r.json(); };

// Niveau + ville dérivés du nom (même convention que generate-season).
function parseTournament(name) {
  const isFrance = /championnat de france/i.test(name) || /(^|[^a-z])chf([^a-z]|$)/i.test(name);
  const tn = name.match(/TN[\s_-]*0*(\d+)/i);
  const level = isFrance ? 'Championnat de France' : (tn ? 'TN' + tn[1] : name);
  const noise = /^(bb|ffb|blackball|black-ball|tn\s*\d+|chf|f[ée]minin|femmes?|masters?|handi([\s-]*billard)?|para([\s-]*billard)?|malvoyants?|fauteuil|tournoi(\s+femmes?)?|classement|20\d\d(\s*-\s*20\d\d)?|\d{4})$/i;
  const cand = name.split(/_|\s-\s/).map((s) => s.trim()).filter(Boolean)
    .filter((p) => !noise.test(p) && !/championnat de france/i.test(p) && !/tournoi/i.test(p))
    .map((p) => p.replace(/\b(TN\s*\d+|CHF|BB|FFB|Blackball|F[ée]minin|Femmes?|Masters?|Handi(?:[\s-]*Billard)?|Para(?:[\s-]*Billard)?|Malvoyants?|Fauteuil|saison|20\d\d(?:\s*-\s*20\d\d)?|\d{4})\b/gi, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const city = cand.sort((a, b) => b.length - a.length)[0] || '';
  return { level, city, kind: isFrance ? 'france' : 'tn' };
}

const td = await j(`https://api.cuescore.com/tournament/?id=${TID}`);
const p = parseTournament(td.name);
const date = (td.starttime || '').slice(0, 10);
const tournament = { id: String(TID), name: td.name, level: p.level, city: p.city, date, kind: p.kind };
console.log(`Tournoi : « ${td.name} »`);
console.log(`  → ${p.level} · ${p.city} · ${date} · ${p.kind}`);

// Matchs décidés entre deux vrais joueurs.
const matches = [];
const countryOf = new Map();
for (const m of (td.matches || [])) {
  const a = m.playerA, b = m.playerB;
  if (!isReal(a) || !isReal(b) || m.matchstatus !== 'finished' || m.scoreA === m.scoreB) continue;
  matches.push({ tid: String(TID), date, aId: a.playerId, bId: b.playerId, aName: a.name, bName: b.name, sA: m.scoreA, sB: m.scoreB, round: m.roundName || '' });
  if (a.country?.alpha3) countryOf.set(a.playerId, a.country.alpha3);
  if (b.country?.alpha3) countryOf.set(b.playerId, b.country.alpha3);
}

const statsOf = (id) => {
  const ms = matches.filter((m) => m.aId === id || m.bId === id);
  let wins = 0, losses = 0, pf = 0, pa = 0;
  for (const m of ms) {
    const my = m.aId === id ? m.sA : m.sB, opp = m.aId === id ? m.sB : m.sA;
    pf += my; pa += opp; my > opp ? wins++ : losses++;
  }
  return { played: ms.length, wins, losses, winPct: ms.length ? Math.round((wins / ms.length) * 100) : 0, pf, pa, diff: pf - pa, tourns: 1 };
};

// RANG = classement final officiel (standings). POINTS = points de poule Cuescore.
const groups = td.standings && typeof td.standings === 'object' ? Object.values(td.standings).flat() : [];
const standByRank = groups
  .map((row) => ({ id: row.player.playerId, name: row.player.name, country: row.player.country?.alpha3 || countryOf.get(row.player.playerId) || 'FRA', position: row.position, points: row.points ?? 0 }))
  .sort((a, b) => a.position - b.position);

const players = standByRank.map((s, i) => ({
  id: s.id, name: s.name, slug: slugify(s.name), country: s.country,
  rank: i + 1, points: s.points, ...statsOf(s.id),
}));

writeFileSync(OUT, JSON.stringify({ competition: COMPETITION, season: SEASON, tournaments: [tournament], players, matches }, null, 0));
console.log(`\n✓ Écrit : ${OUT}`);
console.log(`  ${players.length} joueurs · ${matches.length} matchs · 1 tournoi`);
console.log(`  Classement : ${players.map((p) => `${p.rank}.${p.name}`).join(' · ')}`);
const fin = matches.find((m) => (m.round || '').toLowerCase() === 'final');
if (fin) console.log(`  Finale : ${fin.aName} ${fin.sA}-${fin.sB} ${fin.bName}`);
