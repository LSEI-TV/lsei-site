// Import des résultats Blackball Master depuis Cuescore → results-2026-2027.json
// Usage : node scripts/import-blackball-tn.mjs
// Ajouter une étape = ajouter une entrée dans TOURNAMENTS ci-dessous, puis relancer.
// Les points suivent le barème FFB (élimination directe à 32) ; l'invité = joueur
// engagé sur l'étape mais absent de la liste des 28 permanents.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'src', 'data', 'billard', 'results-2026-2027.json');

// Étapes Masters 2026/2027 déjà jouées (id Cuescore). En ajouter ici au fil de la saison.
const TOURNAMENTS = [
  { id: 88638331, level: 'TN1', kind: 'tn' }, // Fumel
];

// Barème FFB par tour d'élimination (perdant du tour → points ; vainqueur final → 440).
const PTS = { 'Round 1': 100, 'Last sixteen': 160, 'Quarter final': 224, 'Semi final': 292, 'Final': 364 };
const CHAMP = 440;

// 28 permanents 2026/2027 (20 de retour + 8 accédants). Tout autre engagé = invité.
// Clé de comparaison SANS espaces ni accents (robuste aux coquilles Cuescore, ex. « L anthoen »).
const mk = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const PERMANENTS = new Set([
  'Alexandre Buscetti', 'Alexis Klinka', 'Christophe Lambert', 'Christophe Thebeault', 'Damien Joly',
  'Elie Christidis', 'Jerome Lanthoen', 'Julien Duquesnoy', 'Julien Leroux', 'Killian Ballon',
  'Leonardo Moreira', 'Léo Ostrowska', 'Nordine Mokhtar Mehache', 'Paul Coldrick', 'Quentin Dumont',
  'Sap Nhi Tsan', 'Simon Pellissier', 'Thomas Louboutin', 'Yannick Beaufils', 'Yasser Amrani Hanchi',
  'Nicolas Larroquere', 'Théo Schneider', 'Levent Afyon', 'Calvin Creach', 'Francois Marotel',
  'Patrick Dang', 'Pierre Damien Coz', 'Pierrick Viton',
].map(mk));
const isPermanent = (name) => PERMANENTS.has(mk(name));
// Corrections d'affichage de noms mal orthographiés sur Cuescore.
const NAME_FIX = { [mk('Jerome Lanthoen')]: "Jérome L'Anthoen" };
const fixName = (name) => NAME_FIX[mk(name)] || name;

const slugify = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const tournaments = [];
const matches = [];
const players = new Map(); // id -> stats

for (const cfg of TOURNAMENTS) {
  const api = await fetch(`https://api.cuescore.com/tournament/?id=${cfg.id}`).then((r) => r.json());
  const name = api.name || '';
  const city = (name.split(' - ').pop() || '').trim();
  const date = (api.starttime || '').slice(0, 10);
  tournaments.push({ id: String(cfg.id), name, level: cfg.level, city, date, kind: cfg.kind });

  const finished = (api.matches || []).filter((m) => m.matchstatusCode === 2 && m.playerA?.playerId && m.playerB?.playerId);
  const ensure = (p) => {
    if (!players.has(p.playerId)) {
      const nm = fixName(p.name);
      players.set(p.playerId, {
        id: p.playerId, name: nm, slug: slugify(nm),
        country: p.country?.alpha3 || 'FRA', invite: !isPermanent(p.name),
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

// Points par joueur = somme sur chaque étape (barème FFB selon le tour d'élimination).
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
// Remettre les clés dans l'ordre du schéma (rank après slug/country).
const ordered = list.map((p) => ({
  id: p.id, name: p.name, slug: p.slug, country: p.country, rank: p.rank, points: p.points,
  played: p.played, wins: p.wins, losses: p.losses, winPct: p.winPct, pf: p.pf, pa: p.pa, diff: p.diff, tourns: p.tourns, invite: p.invite,
}));

const out = { competition: 'Blackball Master', season: '2026/2027', tournaments, players: ordered, matches };
await writeFile(OUT, JSON.stringify(out, null, 1) + '\n', 'utf8');
console.log(`OK → ${OUT}`);
console.log(`Tournois: ${tournaments.length} | Joueurs: ${ordered.length} | Matchs: ${matches.length} | Invités: ${ordered.filter((p) => p.invite).map((p) => p.name).join(', ')}`);
