// ============================================================
//  Auto-import des Tournois Nationaux Blackball FFB (Master + Femme) depuis Cuescore.
//
//  AUCUN lien à fournir : on lit la page de l'organisation FF Billard (cuescore.com/ffb)
//  qui liste tous ses tournois, on repère les TN de chaque compétition par leur nom
//  (« FFB - Blackball - TN<n> - Blackball Master/Femme - <ville> »), et on importe ceux
//  qui ont des résultats joués. Génère results-2026-2027.json (Master) et
//  results-femmes-2026-2027.json (Femme). Lancé par refresh-data.yml (2×/jour).
//
//    node scripts/import-blackball.mjs          → importe
//    node scripts/import-blackball.mjs --dry     → simule (n'écrit rien)
// ============================================================
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'src', 'data', 'billard');
const DRY = process.argv.includes('--dry');

// Saison en cours (mettre à jour une fois par an à la bascule de saison).
const SEASON = '2026/2027';
const SEASON_START = '2026-08-01';
const SEASON_END = '2027-07-31';

const mk = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const isWalkOver = (p) => /walk\s*over/i.test(p?.name || '') || !p?.playerId;

// Barème FFB par tour d'élimination (perdant du tour → points ; vainqueur → 440).
const PTS = { 'Round 1': 100, 'Last sixteen': 160, 'Quarter final': 224, 'Semi final': 292, 'Final': 364 };
const CHAMP = 440;

// MASTERS uniquement : 28 permanents (tout autre engagé = invité). Femme : pas d'invité.
const PERMANENTS_MASTER = new Set([
  'Alexandre Buscetti', 'Alexis Klinka', 'Christophe Lambert', 'Christophe Thebeault', 'Damien Joly',
  'Elie Christidis', 'Jerome Lanthoen', 'Julien Duquesnoy', 'Julien Leroux', 'Killian Ballon',
  'Leonardo Moreira', 'Léo Ostrowska', 'Nordine Mokhtar Mehache', 'Paul Coldrick', 'Quentin Dumont',
  'Sap Nhi Tsan', 'Simon Pellissier', 'Thomas Louboutin', 'Yannick Beaufils', 'Yasser Amrani Hanchi',
  'Nicolas Larroquere', 'Théo Schneider', 'Levent Afyon', 'Calvin Creach', 'Francois Marotel',
  'Patrick Dang', 'Pierre Damien Coz', 'Pierrick Viton',
].map(mk));
// Corrections d'affichage de noms mal orthographiés sur Cuescore.
const NAME_FIX = { [mk('Jerome Lanthoen')]: "Jérome L'Anthoen" };
const fixName = (n) => NAME_FIX[mk(n)] || n;

const COMPETITIONS = [
  { key: 'master', re: /-\s*Blackball\s*Master\s*-/i, out: 'results-2026-2027.json',        competition: 'Blackball Master', permanents: PERMANENTS_MASTER },
  { key: 'femme',  re: /-\s*Femme\s*-/i,              out: 'results-femmes-2026-2027.json', competition: 'Blackball Femmes', permanents: null },
];

// 1) Liste des tournois de l'organisation FF Billard (id → nom).
async function ffbTournaments() {
  const html = await fetch('https://cuescore.com/ffb', {
    headers: { 'User-Agent': 'Mozilla/5.0 (LSEI blackball import bot)' },
  }).then((r) => r.text());
  const out = [];
  const seen = new Set();
  const re = /\/tournament\/([^"'/]+)\/(\d{6,})/g;
  let m;
  while ((m = re.exec(html))) {
    const id = m[2];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: decodeURIComponent(m[1].replace(/\+/g, ' ')) });
  }
  return out;
}

// 2) Import d'une compétition à partir de ses TN.
async function importCompetition(cfg, allTournaments) {
  // TN de cette compétition cette saison, triés par numéro.
  const tns = allTournaments
    .map((t) => {
      const mm = t.name.match(/\bTN(\d+)\b/i);
      return mm && cfg.re.test(t.name) ? { ...t, tn: Number(mm[1]) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.tn - b.tn);

  const tournaments = [];
  const matches = [];
  const players = new Map();

  for (const t of tns) {
    const api = await fetch(`https://api.cuescore.com/tournament/?id=${t.id}`).then((r) => r.json());
    const date = (api.starttime || '').slice(0, 10);
    if (date && (date < SEASON_START || date > SEASON_END)) continue;   // hors saison en cours
    const finished = (api.matches || []).filter(
      (m) => m.matchstatusCode === 2 && !isWalkOver(m.playerA) && !isWalkOver(m.playerB),
    );
    if (!finished.length) continue;   // TN pas encore joué → ignoré jusqu'à ce qu'il le soit

    const name = api.name || t.name;
    const city = (name.split(' - ').pop() || '').trim();
    tournaments.push({ id: String(t.id), name, level: `TN${t.tn}`, city, date, kind: 'tn' });

    const ensure = (p) => {
      if (!players.has(p.playerId)) {
        const nm = cfg.permanents ? fixName(p.name) : p.name;
        players.set(p.playerId, {
          id: p.playerId, name: nm, slug: slugify(nm),
          country: p.country?.alpha3 || 'FRA',
          invite: cfg.permanents ? !cfg.permanents.has(mk(p.name)) : false,
          points: 0, played: 0, wins: 0, losses: 0, pf: 0, pa: 0, tourns: new Set(), _lostRound: {}, _won: {},
        });
      }
      return players.get(p.playerId);
    };

    for (const m of finished) {
      const a = ensure(m.playerA), b = ensure(m.playerB);
      const sA = m.scoreA ?? 0, sB = m.scoreB ?? 0;
      const mdate = (m.starttime || date).slice(0, 10);
      matches.push({ tid: String(t.id), date: mdate, aId: a.id, bId: b.id, aName: a.name, bName: b.name, sA, sB, round: m.roundName });
      for (const [pl, my, opp, loser] of [[a, sA, sB, sA < sB], [b, sB, sA, sB < sA]]) {
        pl.played++; pl.pf += my; pl.pa += opp; pl.tourns.add(t.id);
        if (my > opp) pl.wins++; else pl.losses++;
        if (loser) pl._lostRound[t.id] = m.roundName;
        if (!loser && m.roundName === 'Final') pl._won[t.id] = true;
      }
    }
  }

  if (!tournaments.length) { console.log(`[${cfg.key}] aucun TN joué — fichier inchangé.`); return; }

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

  const out = { competition: cfg.competition, season: SEASON, tournaments, players: ordered, matches };
  const file = join(DATA, cfg.out);
  if (DRY) {
    console.log(`[dry][${cfg.key}] ${tournaments.length} TN, ${ordered.length} joueur(s) → ${cfg.out}`);
    console.log('       top 3:', ordered.slice(0, 3).map((p) => `${p.rank}. ${p.name} (${p.points})`).join(' | '));
    return;
  }
  await writeFile(file, JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log(`[${cfg.key}] ${tournaments.length} TN · ${ordered.length} joueur(s) · ${matches.length} matchs → ${cfg.out}`);
}

const all = await ffbTournaments();
console.log(`Organisation FFB : ${all.length} tournois listés.`);
for (const cfg of COMPETITIONS) await importCompetition(cfg, all);
