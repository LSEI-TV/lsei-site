// ============================================================
//  Générateur de saison Blackball (Masters ou Féminin) depuis Cuescore.
//  Récupère le classement + les tournois d'une saison et produit le fichier
//  results-XXXX.json au format attendu par le site (voir seasons.ts).
//
//  USAGE :
//    npm run gen:season -- --ranking=<id> --out=<fichier> \
//        --competition="Blackball Féminin" --season="2026/2027"
//
//  EXEMPLES :
//    # Féminin 2025/2026 (id de classement Cuescore = 65726152)
//    npm run gen:season -- --ranking=65726152 \
//        --out=src/data/billard/results-femmes-2025-2026.json \
//        --competition="Blackball Féminin" --season="2025/2026"
//
//    # Masters 2026/2027
//    npm run gen:season -- --ranking=<ID_MASTERS_2627> \
//        --out=src/data/billard/results-2026-2027.json \
//        --competition="Blackball Master" --season="2026/2027"
//
//  Le lien de classement d'une saison se trouve sur cuescore.com ; l'id est le
//  nombre à la fin de l'URL (ex. .../ranking/FFB+-+Blackball+-+TN+-+Féminin/65726152).
//
//  APRÈS génération : enregistrer la saison dans src/data/billard/seasons.ts
//  (Masters) ou seasonsFemmes.ts (Féminin) — voir scripts/README.md.
// ============================================================
import { writeFileSync } from 'node:fs';

// --- arguments ---
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }),
);
const RANKING_ID = args.ranking;
const OUT = args.out;
const COMPETITION = args.competition || 'Blackball';
const SEASON = args.season || '';

if (!RANKING_ID || !OUT) {
  console.error('Usage : npm run gen:season -- --ranking=<id> --out=<fichier.json> --competition="..." --season="AAAA/AAAA"');
  process.exit(1);
}

const WALKOVER_ID = 1000615;
const isReal = (p) => p && p.playerId && p.playerId !== WALKOVER_ID && p.name !== 'Walk Over' && p.name !== 'Bye';
const slugify = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const j = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Cuescore ${r.status} sur ${url}`);
  return r.json();
};

const rk = await j(`https://api.cuescore.com/ranking/?id=${RANKING_ID}`);
console.log(`Classement : « ${rk.name} » — ${rk.participants.length} joueurs, ${rk.tournaments.length} tournois.`);

// Tournois : niveau (TN1.. / Championnat de France) et ville dérivés du nom.
// Gère plusieurs conventions de nommage Cuescore :
//   « FFB - Blackball - TN1 - Féminin - Mèze »
//   « BB_TN1_SAINT LOUIS_TOURNOI FEMMES »
//   « BB_CHF VILLENEUVE SUR LOT_FEMMES_2025 »
function parseTournament(name) {
  const isFrance = /championnat de france/i.test(name) || /(^|[^a-z])chf([^a-z]|$)/i.test(name);
  const tn = name.match(/TN[\s_-]*0*(\d+)/i);
  const level = isFrance ? 'Championnat de France' : (tn ? 'TN' + tn[1] : name);
  const noise = /^(bb|ffb|blackball|black-ball|tn\s*\d+|chf|f[ée]minin|femmes?|masters?|handi([\s-]*billard)?|para([\s-]*billard)?|tournoi(\s+femmes?)?|classement|20\d\d(\s*-\s*20\d\d)?|\d{4})$/i;
  const cand = name.split(/_|\s-\s/).map((s) => s.trim()).filter(Boolean)
    .filter((p) => !noise.test(p) && !/championnat de france/i.test(p) && !/tournoi/i.test(p))
    .map((p) => p.replace(/\b(TN\s*\d+|CHF|BB|FFB|Blackball|F[ée]minin|Femmes?|Masters?|Handi(?:[\s-]*Billard)?|Para(?:[\s-]*Billard)?|saison|20\d\d(?:\s*-\s*20\d\d)?|\d{4})\b/gi, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const city = cand.sort((a, b) => b.length - a.length)[0] || '';
  return { level, city, kind: isFrance ? 'france' : 'tn' };
}
// Tournois EXTRA (hors classement), ex. un Championnat de France séparé.
// --extra=<id>[,<id>...] : ajoute ces tournois et leurs joueurs (même non classés).
const EXTRA_IDS = (args.extra ? String(args.extra).split(',') : []).map((s) => s.trim()).filter(Boolean);

const tourMeta = rk.tournaments.map((t) => ({ id: String(t.id), name: t.name, starttime: t.starttime, data: null }));
for (const ex of EXTRA_IDS) {
  if (tourMeta.some((t) => t.id === String(ex))) continue;
  const et = await j(`https://api.cuescore.com/tournament/?id=${ex}`);
  tourMeta.push({ id: String(ex), name: et.name, starttime: et.starttime, data: et });
}
const tournaments = tourMeta.map((t) => {
  const p = parseTournament(t.name);
  return { id: t.id, name: t.name, level: p.level, city: p.city, date: (t.starttime || '').slice(0, 10), kind: p.kind };
});

// Matches (tous tournois) : on ne garde que les matchs décidés entre deux vrais joueurs.
const matches = [];
const countryOf = new Map();
const nameById = new Map();
for (let i = 0; i < tournaments.length; i++) {
  const t = tournaments[i];
  const td = tourMeta[i].data || (await j(`https://api.cuescore.com/tournament/?id=${t.id}`));
  for (const m of (td.matches || [])) {
    const a = m.playerA, b = m.playerB;
    if (!isReal(a) || !isReal(b) || m.matchstatus !== 'finished' || m.scoreA === m.scoreB) continue;
    matches.push({ tid: t.id, date: t.date, aId: a.playerId, bId: b.playerId, aName: a.name, bName: b.name, sA: m.scoreA, sB: m.scoreB, round: m.roundName || '' });
    if (a.country?.alpha3) countryOf.set(a.playerId, a.country.alpha3);
    if (b.country?.alpha3) countryOf.set(b.playerId, b.country.alpha3);
    nameById.set(a.playerId, a.name); nameById.set(b.playerId, b.name);
  }
  process.stdout.write(`  ${t.level} (${t.city}) : ${matches.filter((x) => x.tid === t.id).length} matchs\n`);
}

// Stats d'un joueur, calculées depuis les matchs.
const statsOf = (id) => {
  const ms = matches.filter((m) => m.aId === id || m.bId === id);
  let wins = 0, losses = 0, pf = 0, pa = 0; const tids = new Set();
  for (const m of ms) {
    const my = m.aId === id ? m.sA : m.sB, opp = m.aId === id ? m.sB : m.sA;
    pf += my; pa += opp; my > opp ? wins++ : losses++; tids.add(m.tid);
  }
  return { played: ms.length, wins, losses, winPct: ms.length ? Math.round((wins / ms.length) * 100) : 0, pf, pa, diff: pf - pa, tourns: tids.size };
};

// Joueurs : ceux du classement (rang + points FFB) + ceux vus uniquement dans les
// extras (ex. un CdF hors circuit), ajoutés à la suite avec 0 point.
const ranked = new Set(rk.participants.map((p) => p.participantId));
const rankedPlayers = rk.participants.map((p) => {
  const id = p.participantId, s = statsOf(id);
  return { id, name: p.name, slug: slugify(p.name), country: countryOf.get(id) || 'FRA', rank: p.rank, points: p.points, ...s, tourns: p.tournamentCount || s.tourns };
});
const extraOnly = [...nameById.keys()].filter((id) => !ranked.has(id)).map((id) => {
  const nm = nameById.get(id);
  return { id, name: nm, slug: slugify(nm), country: countryOf.get(id) || 'FRA', rank: 0, points: 0, ...statsOf(id) };
});
extraOnly.sort((a, b) => b.wins - a.wins || b.diff - a.diff);
const maxRank = rankedPlayers.reduce((mx, p) => Math.max(mx, p.rank), 0);
extraOnly.forEach((p, i) => { p.rank = maxRank + 1 + i; });
const players = [...rankedPlayers, ...extraOnly].sort((a, b) => a.rank - b.rank);
if (extraOnly.length) console.log(`  (+${extraOnly.length} joueurs vus uniquement dans les tournois extra)`);

writeFileSync(OUT, JSON.stringify({ competition: COMPETITION, season: SEASON, tournaments, players, matches }, null, 0));
console.log(`\n✓ Écrit : ${OUT}`);
console.log(`  ${players.length} joueurs · ${matches.length} matchs · ${tournaments.length} tournois`);
console.log(`  Top 3 : ${players.slice(0, 3).map((p) => `${p.rank}.${p.name} (${p.points}pts)`).join(' · ')}`);
const cdf = tournaments.find((t) => t.kind === 'france');
if (cdf) {
  const fin = matches.find((m) => m.tid === cdf.id && (m.round || '').toLowerCase() === 'final');
  console.log(`  Championnat de France : ${fin ? `${fin.aName} ${fin.sA}-${fin.sB} ${fin.bName}` : '(finale non trouvée — vérifier le nom du tour)'}`);
}
console.log('\n→ Pense à enregistrer la saison dans seasons.ts / seasonsFemmes.ts (voir scripts/README.md).');
