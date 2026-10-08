// ============================================================
//  Auto-import des Tournois Nationaux Blackball FFB (Master + Femme) depuis Cuescore.
//
//  AUCUN lien à fournir : on lit la page de l'organisation FF Billard (cuescore.com/ffb)
//  qui liste tous ses tournois, on repère les TN de chaque compétition par leur nom, et
//  on importe les matchs joués. Les POINTS et l'ordre du classement viennent du CLASSEMENT
//  OFFICIEL Cuescore (API ranking) → identiques au site FFB. Les invités (présents au TN
//  mais pas au classement officiel du Masters — ce sont des joueurs du Mixte National) sont
//  EXCLUS du classement (rank null) mais conservés pour leurs fiches et la section invités.
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

// Corrections d'affichage de noms mal orthographiés sur Cuescore (Masters).
const NAME_FIX = { [mk('Jerome Lanthoen')]: "Jérome L'Anthoen" };
const fixName = (n) => NAME_FIX[mk(n)] || n;

// Secours (si le classement officiel est indisponible) : liste des 28 permanents Masters.
const PERMANENTS_MASTER = new Set([
  'Alexandre Buscetti', 'Alexis Klinka', 'Christophe Lambert', 'Christophe Thebeault', 'Damien Joly',
  'Elie Christidis', 'Jerome Lanthoen', 'Julien Duquesnoy', 'Julien Leroux', 'Killian Ballon',
  'Leonardo Moreira', 'Léo Ostrowska', 'Nordine Mokhtar Mehache', 'Paul Coldrick', 'Quentin Dumont',
  'Sap Nhi Tsan', 'Simon Pellissier', 'Thomas Louboutin', 'Yannick Beaufils', 'Yasser Amrani Hanchi',
  'Nicolas Larroquere', 'Théo Schneider', 'Levent Afyon', 'Calvin Creach', 'Francois Marotel',
  'Patrick Dang', 'Pierre Damien Coz', 'Pierrick Viton',
].map(mk));

// tnRe = nom d'un Tournoi National de la catégorie ; cdfRe = nom du Championnat de France
// de la catégorie (format différent : « - Masters/Femmes - » au lieu de « - Blackball Master/Femme - »).
// On importe les TN ET le Championnat de France (regex PRÉCISES pour ne pas attraper le Mixte National).
const COMPETITIONS = [
  {
    key: 'master',
    tnRe: /-\s*Blackball\s*Master\s*-/i,
    cdfRe: /Championnat\s+de\s+France\s*-\s*Masters?\s*-/i,
    out: 'results-2026-2027.json', competition: 'Blackball Master', rankingId: 88637449, hasInvites: true,
    mixteRankingId: 88637443, // classement Mixte National — pour afficher le rang Mixte des invités

    // Barème FFB Masters (secours si classement officiel indisponible).
    PTS: { 'Round 1': 100, 'Last sixteen': 160, 'Quarter final': 224, 'Semi final': 292, 'Final': 364 }, CHAMP: 440,
  },
  {
    key: 'femme',
    tnRe: /-\s*Femme\s*-/i,
    cdfRe: /Championnat\s+de\s+France\s*-\s*Femmes?\s*-/i,
    out: 'results-femmes-2026-2027.json', competition: 'Blackball Femmes', rankingId: 88637419, hasInvites: false,
    // Barème FFB Femmes (secours) — échelle plus basse que le Masters.
    PTS: { 'Round 1': 44, 'Last sixteen': 60, 'Quarter final': 80, 'Semi final': 104, 'Final': 132 }, CHAMP: 164,
  },
];

// Liste des tournois de l'organisation FF Billard (id → nom).
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

// Classement OFFICIEL d'une compétition (rang + points par joueur), via l'API ranking Cuescore.
async function officialRanking(rankingId) {
  if (!rankingId) return null;
  try {
    const rk = await fetch(`https://api.cuescore.com/ranking/?id=${rankingId}`).then((r) => r.json());
    const parts = rk.participants || [];
    if (!parts.length) return null;
    const byId = new Map(), byName = new Map();
    for (const p of parts) {
      const v = { rank: p.rank, points: p.points };
      byId.set(String(p.participantId), v); byName.set(mk(p.name), v);
    }
    return { byId, byName };
  } catch { return null; }
}

async function importCompetition(cfg, allTournaments) {
  // TN + Championnat de France de cette compétition, triés (TN par numéro, CHF en dernier).
  const tns = allTournaments
    .filter((t) => cfg.tnRe.test(t.name) || cfg.cdfRe.test(t.name))
    .map((t) => {
      const cdf = cfg.cdfRe.test(t.name);
      const mm = t.name.match(/\bTN\s*(\d+)\b/i);
      return { ...t, tn: cdf ? 999 : (mm ? Number(mm[1]) : 998), cdf };
    })
    .sort((a, b) => a.tn - b.tn);

  const tournaments = [];
  const matches = [];
  const players = new Map();

  for (const t of tns) {
    const api = await fetch(`https://api.cuescore.com/tournament/?id=${t.id}`).then((r) => r.json());
    const date = (api.starttime || '').slice(0, 10);
    if (date && (date < SEASON_START || date > SEASON_END)) continue;
    const finished = (api.matches || []).filter((m) => m.matchstatusCode === 2 && !isWalkOver(m.playerA) && !isWalkOver(m.playerB));
    if (!finished.length) continue;

    const name = api.name || t.name;
    const city = (name.split(' - ').pop() || '').trim();
    tournaments.push({
      id: String(t.id), name, city, date,
      level: t.cdf ? 'Championnat de France' : `TN${t.tn}`,
      kind: t.cdf ? 'france' : 'tn',
    });

    const ensure = (p) => {
      if (!players.has(p.playerId)) {
        const nm = cfg.hasInvites ? fixName(p.name) : p.name;
        players.set(p.playerId, {
          id: p.playerId, name: nm, slug: slugify(nm), rawName: p.name,
          country: p.country?.alpha3 || 'FRA',
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

  // Points de secours (barème FFB), remplacés ensuite par les points officiels si dispo.
  for (const p of players.values()) {
    for (const t of p.tourns) {
      if (p._won[t]) p.points += cfg.CHAMP;
      else if (p._lostRound[t]) p.points += (cfg.PTS[p._lostRound[t]] ?? 0);
    }
  }

  // Classement OFFICIEL : rang + points officiels, et statut invité (absent du classement officiel).
  const official = await officialRanking(cfg.rankingId);
  for (const p of players.values()) {
    const off = official ? (official.byId.get(String(p.id)) ?? official.byName.get(mk(p.rawName))) : undefined;
    if (off) { p.points = off.points; p.offRank = off.rank; }     // rang + points officiels
    if (cfg.hasInvites) {
      p.invite = official ? !off : !PERMANENTS_MASTER.has(mk(p.rawName));
    } else {
      p.invite = false;
    }
  }

  // Rang au Mixte National des invités (pour leur fiche : « Xe au Mixte National »).
  if (cfg.mixteRankingId) {
    const mixte = await officialRanking(cfg.mixteRankingId);
    if (mixte) for (const p of players.values()) {
      if (!p.invite) continue;
      const m = mixte.byId.get(String(p.id)) ?? mixte.byName.get(mk(p.rawName));
      if (m) p.mixteRank = m.rank;
    }
  }

  // Rangs : non-invités uniquement, dans l'ORDRE officiel Cuescore (rang officiel puis départage),
  // numérotés en SÉQUENTIEL 1..N (chaque joueur un rang unique, pas d'ex-aequo affiché).
  const ranked = [...players.values()].filter((p) => !p.invite)
    .sort((a, b) => (a.offRank ?? 1e9) - (b.offRank ?? 1e9) || b.points - a.points || (b.pf - b.pa) - (a.pf - a.pa) || (a.name < b.name ? -1 : 1));
  ranked.forEach((p, i) => { p.rank = i + 1; });
  const guests = [...players.values()].filter((p) => p.invite).sort((a, b) => b.points - a.points);
  guests.forEach((p) => { p.rank = null; });

  const toRow = (p) => ({
    id: p.id, name: p.name, slug: p.slug, country: p.country, rank: p.rank, points: p.points,
    played: p.played, wins: p.wins, losses: p.losses, winPct: p.played ? Math.round((p.wins / p.played) * 100) : 0,
    pf: p.pf, pa: p.pa, diff: p.pf - p.pa, tourns: p.tourns.size, invite: p.invite,
    ...(p.mixteRank ? { mixteRank: p.mixteRank } : {}),
  });
  const ordered = [...ranked.map(toRow), ...guests.map(toRow)];

  const out = { competition: cfg.competition, season: SEASON, tournaments, players: ordered, matches };
  const file = join(DATA, cfg.out);
  if (DRY) {
    console.log(`[dry][${cfg.key}] ${tournaments.length} TN · ${ranked.length} classés + ${guests.length} invité(s) · points ${official ? 'OFFICIELS' : 'barème (secours)'}`);
    console.log('       top 5:', ranked.slice(0, 5).map((p) => `${p.rank}. ${p.name} (${p.points})`).join(' | '));
    if (guests.length) console.log('       invités:', guests.map((p) => p.name).join(', '));
    return;
  }
  await writeFile(file, JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log(`[${cfg.key}] ${ranked.length} classés + ${guests.length} invité(s) · points ${official ? 'officiels' : 'barème'} → ${cfg.out}`);
}

const all = await ffbTournaments();
console.log(`Organisation FFB : ${all.length} tournois listés.`);
for (const cfg of COMPETITIONS) await importCompetition(cfg, all);
