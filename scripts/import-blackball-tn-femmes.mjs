// Import des résultats Blackball FEMMES depuis Cuescore → results-femmes-2026-2027.json
// Usage : node scripts/import-blackball-tn-femmes.mjs
// Ajouter une étape = ajouter une entrée dans TOURNAMENTS ci-dessous, puis relancer.
// (Pas de liste de permanentes fournie → aucune « invitée » marquée pour l'instant.)
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'src', 'data', 'billard', 'results-femmes-2026-2027.json');

// Étapes Femmes 2026/2027 déjà jouées (id Cuescore). En ajouter ici au fil de la saison.
const TOURNAMENTS = [
  { id: 88637596, level: 'TN1', kind: 'tn' }, // Fumel
];

// Barème FFB par tour d'élimination (perdant du tour → points ; vainqueur final → 440).
const PTS = { 'Round 1': 100, 'Last sixteen': 160, 'Quarter final': 224, 'Semi final': 292, 'Final': 364 };
const CHAMP = 440;

const mk = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Forfait Cuescore : « Walk Over » n'est pas une joueuse → on ignore ces matchs.
const isWalkOver = (p) => /walk\s*over/i.test(p?.name || '') || !p?.playerId;

const tournaments = [];
const matches = [];
const players = new Map();

for (const cfg of TOURNAMENTS) {
  const api = await fetch(`https://api.cuescore.com/tournament/?id=${cfg.id}`).then((r) => r.json());
  const name = api.name || '';
  const city = (name.split(' - ').pop() || '').trim();
  const date = (api.starttime || '').slice(0, 10);
  tournaments.push({ id: String(cfg.id), name, level: cfg.level, city, date, kind: cfg.kind });

  const finished = (api.matches || []).filter(
    (m) => m.matchstatusCode === 2 && !isWalkOver(m.playerA) && !isWalkOver(m.playerB),
  );
  const ensure = (p) => {
    if (!players.has(p.playerId)) {
      players.set(p.playerId, {
        id: p.playerId, name: p.name, slug: slugify(p.name),
        country: p.country?.alpha3 || 'FRA', invite: false,
        points: 0, played: 0, wins: 0, losses: 0, pf: 0, pa: 0, tourns: new Set(), _lostRound: {}, _won: {},
      });
    }
    return players.get(p.playerId);
  };

  for (const m of finished) {
    const a = ensure(m.playerA), b = ensure(m.playerB);
    const sA = m.scoreA ?? 0, sB = m.scoreB ?? 0;
    const mdate = (m.starttime || date).slice(0, 10);
    matches.push({ tid: String(cfg.id), date: mdate, aId: a.id, bId: b.id, aName: a.name, bName: b.name, sA, sB, round: m.roundName });
    for (const [pl, my, opp, loser] of [[a, sA, sB, sA < sB], [b, sB, sA, sB < sA]]) {
      pl.played++; pl.pf += my; pl.pa += opp; pl.tourns.add(cfg.id);
      if (my > opp) pl.wins++; else pl.losses++;
      if (loser) pl._lostRound[cfg.id] = m.roundName;
      if (!loser && m.roundName === 'Final') pl._won[cfg.id] = true;
    }
  }
}

for (const p of players.values()) {
  for (const t of p.tourns) {
    if (p._won[t]) p.points += CHAMP;
    else if (p._lostRound[t]) p.points += (PTS[p._lostRound[t]] ?? 0);
  }
}

const list = [...players.values()].map((p) => ({
  id: p.id, name: p.name, slug: p.slug, country: p.country,
  points: p.points, played: p.played, wins: p.wins, losses: p.losses,
  winPct: p.played ? Math.round((p.wins / p.played) * 100) : 0,
  pf: p.pf, pa: p.pa, diff: p.pf - p.pa, tourns: p.tourns.size, invite: p.invite,
})).sort((a, b) => b.points - a.points || b.diff - a.diff || b.pf - a.pf);
list.forEach((p, i) => { p.rank = i + 1; });
const ordered = list.map((p) => ({
  id: p.id, name: p.name, slug: p.slug, country: p.country, rank: p.rank, points: p.points,
  played: p.played, wins: p.wins, losses: p.losses, winPct: p.winPct, pf: p.pf, pa: p.pa, diff: p.diff, tourns: p.tourns, invite: p.invite,
}));

const out = { competition: 'Blackball Femmes', season: '2026/2027', tournaments, players: ordered, matches };
await writeFile(OUT, JSON.stringify(out, null, 1) + '\n', 'utf8');
console.log(`OK → ${OUT}`);
console.log(`Tournois: ${tournaments.length} | Joueuses: ${ordered.length} | Matchs: ${matches.length}`);
console.log('Top 5:', ordered.slice(0, 5).map((p) => `${p.rank}. ${p.name} (${p.points})`).join(' | '));
