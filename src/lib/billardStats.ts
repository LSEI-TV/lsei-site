// MAQUETTE « Stats Billard » — lit un instantané de vraies données Cuescore
// (src/data/billard-masters-mock.json). À terme, ces données seront récupérées
// au build depuis l'API Cuescore ; ici c'est un snapshot figé pour la maquette.
import { defaultSeason, getSeasons, type Season } from '../data/billard/seasons';
import { getFemmesSeasons } from '../data/billard/seasonsFemmes';
import { getParaSeasons } from '../data/billard/seasonsPara';
import { readdirSync } from 'node:fs';

export interface Player {
  id: number; name: string; slug: string; country: string;
  rank: number; points: number;
  played: number; wins: number; losses: number; winPct: number;
  pf: number; pa: number; diff: number; tourns: number;
}

// Photos LOCALES des joueurs (vos propres photos), à déposer dans public/joueurs/.
// Le système RECONNAÎT le joueur à partir du NOM du fichier (souplement) :
//   « Alexis Klinka.jpg », « alexis-klinka.png », « Klinka Alexis.jpg »,
//   ou même « Klinka.jpg » (si le nom de famille est unique).
// Si aucune photo ne correspond, une pastille avec l'initiale s'affiche.
const _norm = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// Liste toutes les photos disponibles : celles « à plat » dans public/joueurs/
// (season = null) ET celles rangées par saison dans public/joueurs/archives joueurs/AAAA-AAAA/.
// Cache UNIQUEMENT au build (import.meta.env.PROD) — en dev, on relit à chaque fois pour
// prendre en compte les photos ajoutées sans redémarrer. Évite des milliers de readdirSync
// au build (photoOf est appelé pour chaque joueur ET chaque adversaire des fiches).
let _photoFiles: { url: string; key: string; season: string | null }[] | null = null;
function _listPhotos(): { url: string; key: string; season: string | null }[] {
  if (import.meta.env.PROD && _photoFiles) return _photoFiles;
  const out: { url: string; key: string; season: string | null }[] = [];
  const isImg = (f: string) => /\.(jpe?g|png|webp)$/i.test(f);
  const key = (f: string) => _norm(f.replace(/\.[^.]+$/, ''));
  const root = 'public/joueurs';
  try {
    for (const f of readdirSync(root)) if (isImg(f)) out.push({ url: '/joueurs/' + f, key: key(f), season: null });
  } catch { /* dossier absent */ }
  try {
    const arch = root + '/archives joueurs';
    for (const d of readdirSync(arch, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      try {
        for (const f of readdirSync(arch + '/' + d.name)) if (isImg(f)) out.push({ url: '/joueurs/archives joueurs/' + d.name + '/' + f, key: key(f), season: d.name });
      } catch { /* ignore */ }
    }
  } catch { /* pas de sous-dossier archives */ }
  if (import.meta.env.PROD) _photoFiles = out;
  return out;
}

// Index : pour chaque MOT de nom (normalisé), l'ensemble des joueurs qui le portent
// (toutes saisons confondues). Sert à savoir si un mot identifie un seul joueur.
let _wordIndex: Map<string, Set<number>> | null = null;
function _wordCount(word: string): number {
  if (!_wordIndex) {
    _wordIndex = new Map();
    for (const s of [...getSeasons(), ...getFemmesSeasons(), ...getParaSeasons()]) {
      if (!s.results) continue;
      for (const p of s.results.players as Player[]) {
        for (const part of (p.name || '').trim().split(/\s+/)) {
          const k = _norm(part);
          if (!k) continue;
          if (!_wordIndex.has(k)) _wordIndex.set(k, new Set());
          _wordIndex.get(k)!.add(p.id);
        }
      }
    }
  }
  return _wordIndex.get(word)?.size ?? 0;
}

// Renvoie l'URL de la photo du joueur si un fichier correspond, sinon null.
// seasonSlug (optionnel) : privilégie la photo rangée dans le dossier de cette saison
// (public/joueurs/archives joueurs/AAAA-AAAA/), sinon la photo « à plat », sinon la plus récente.
export function photoOf(p: Player, seasonSlug?: string): string | null {
  const files = _listPhotos();
  if (!files.length) return null;
  const w = p.name.trim().split(/\s+/);
  const candidates = new Set<string>();
  candidates.add(_norm(p.name)); // nom complet
  candidates.add(_norm([...w].reverse().join(' '))); // ordre inversé
  if (w.length > 1) {
    candidates.add(_norm(w.slice(1).join(' '))); // sans le prénom (nom composé complet)
    candidates.add(_norm(w.slice(0, -1).join(' '))); // sans le dernier mot
  }
  // Tout MOT du nom qui n'identifie qu'UN seul joueur (nom de famille, ou l'un
  // des mots d'un nom composé, ex. « Grandemange » de « Grandemange Denizot »).
  for (const part of w) {
    const k = _norm(part);
    if (k && _wordCount(k) === 1) candidates.add(k);
  }
  const match = files.filter((f) => candidates.has(f.key));
  if (!match.length) return null;
  const pick =
    (seasonSlug ? match.find((m) => m.season === seasonSlug) : undefined) ||
    match.find((m) => m.season === null) ||
    [...match].sort((a, b) => ((a.season || '') < (b.season || '') ? 1 : -1))[0];
  return pick.url;
}

// « Prénom Nom » depuis un nom de fichier : « BEAUFILS » → « Beaufils », « AMRANI HANCHI » → « Amrani Hanchi ».
const _titleCase = (s: string) =>
  (s || '').trim().toLowerCase().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// Saisons « photo seule » : sous-dossiers de public/joueurs/archives joueurs/ qui ne
// correspondent à AUCUNE saison avec données. Renvoie, par saison, la liste des photos.
export function photoOnlySeasons(dataSeasonSlugs: Set<string>) {
  const arch = 'public/joueurs/archives joueurs';
  const out: { slug: string; label: string; players: { name: string; url: string; key: string }[] }[] = [];
  let dirs: string[] = [];
  try {
    dirs = readdirSync(arch, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch { return []; }
  for (const d of dirs.sort().reverse()) { // plus récent d'abord
    if (dataSeasonSlugs.has(d)) continue; // saison avec données → pages complètes ailleurs
    let files: string[] = [];
    try { files = readdirSync(`${arch}/${d}`).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)); } catch { /* ignore */ }
    if (!files.length) continue;
    const players = files
      .map((f) => { const base = f.replace(/\.[^.]+$/, ''); return { name: _titleCase(base), url: `/joueurs/archives joueurs/${d}/${f}`, key: _norm(base) }; })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    out.push({ slug: d, label: d.replace('-', ' / '), players });
  }
  return out;
}

// Index inverse : clé normalisée d'un nom de fichier → joueur connu (pour relier une
// photo d'archive à une fiche carrière). Utilise les mêmes correspondances que photoOf.
export function playersByPhotoKey(seasonsList: Season[] = getSeasons()): Map<string, { id: number; name: string }> {
  const m = new Map<string, { id: number; name: string }>();
  for (const p of allPlayers(seasonsList)) {
    const w = p.name.trim().split(/\s+/);
    const keys = new Set<string>();
    keys.add(_norm(p.name));
    keys.add(_norm([...w].reverse().join(' ')));
    if (w.length > 1) { keys.add(_norm(w.slice(1).join(' '))); keys.add(_norm(w.slice(0, -1).join(' '))); }
    for (const part of w) { const k = _norm(part); if (k && _wordCount(k) === 1) keys.add(k); }
    for (const k of keys) if (k && !m.has(k)) m.set(k, { id: p.id, name: p.name });
  }
  return m;
}

export interface Match {
  tid: string; date: string; aId: number; bId: number;
  aName: string; bName: string; sA: number; sB: number; round: string;
}
export interface Tournament { id: string; name: string; level: string; city: string; date: string }

export const stats = defaultSeason().results as unknown as {
  competition: string; season: string;
  tournaments: Tournament[]; players: Player[]; matches: Match[];
};

// Données d'une saison (sous-ensemble suffisant pour les calculs).
export interface SeasonData { players: Player[]; matches: Match[]; tournaments: Tournament[] }

export const getPlayer = (data: SeasonData, id: number) => data.players.find((p) => p.id === id);
export const tournamentById = (data: SeasonData, tid: string) => data.tournaments.find((t) => t.id === tid);

// Matchs d'un joueur (dans une saison), plus récents d'abord.
export function playerMatches(data: SeasonData, id: number): Match[] {
  return data.matches
    .filter((m) => m.aId === id || m.bId === id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// Confrontations directes entre deux joueurs (dans une saison).
export function headToHead(data: SeasonData, aId: number, bId: number): Match[] {
  return data.matches.filter(
    (m) => (m.aId === aId && m.bId === bId) || (m.aId === bId && m.bId === aId),
  );
}

// Point de vue d'un joueur sur un match : adversaire, ses points, statut.
export function fromPov(m: Match, id: number) {
  const isA = m.aId === id;
  return {
    oppId: isA ? m.bId : m.aId,
    oppName: isA ? m.bName : m.aName,
    my: isA ? m.sA : m.sB,
    opp: isA ? m.sB : m.sA,
    win: (isA ? m.sA : m.sB) > (isA ? m.sB : m.sA),
    date: m.date,
    tid: m.tid,
    round: m.round,
  };
}

// ============================================================
//  FAITS MARQUANTS D'UNE SAISON (6 stats)
//  Calcul partagé entre la page classement et la fiche joueur.
//  prevR = résultats de la saison précédente (pour progression/baisse) ; optionnel.
// ============================================================
export interface Superlative {
  key: string;        // identifiant technique
  label: string;      // libellé affiché
  playerId: number;   // joueur concerné
  playerName: string;
  value: string;      // valeur principale (ex. "+16 places")
  sub?: string;       // détail secondaire
}

export function seasonSuperlatives(R: any, prevR?: any): Superlative[] {
  const players = (R?.players || []) as any[];
  const matches = (R?.matches || []) as any[];
  const tournaments = (R?.tournaments || []) as any[];
  const byId = new Map(players.map((p) => [p.id, p]));
  const out: Superlative[] = [];

  // 1 & 2 — Progression / baisse au classement vs saison précédente.
  if (prevR) {
    const prevRank = new Map((prevR.players as any[]).map((p) => [p.id, p.rank]));
    let up: { p: any; d: number } | null = null;
    let down: { p: any; d: number } | null = null;
    for (const p of players) {
      const pr = prevRank.get(p.id);
      if (pr == null) continue;
      const d = pr - p.rank; // positif = places gagnées
      if (d > 0 && (!up || d > up.d)) up = { p, d };
      if (d < 0 && (!down || d < down.d)) down = { p, d };
    }
    if (up) out.push({ key: 'progression', label: 'Plus forte progression', playerId: up.p.id, playerName: up.p.name, value: `+${up.d} places`, sub: `${up.p.rank}ᵉ cette saison` });
    if (down) out.push({ key: 'baisse', label: 'Plus forte baisse', playerId: down.p.id, playerName: down.p.name, value: `${down.d} places`, sub: `${down.p.rank}ᵉ cette saison` });
  }

  // 3 — Plus longue série de victoires (dans la saison).
  {
    const per = new Map<number, { date: string; win: boolean }[]>();
    for (const m of matches) {
      for (const id of [m.aId, m.bId]) {
        if (id == null) continue;
        const r = fromPov(m, id);
        (per.get(id) || per.set(id, []).get(id)!).push({ date: r.date, win: r.win });
      }
    }
    let best: { id: number; streak: number } | null = null;
    for (const [id, list] of per) {
      list.sort((a, b) => (a.date < b.date ? -1 : 1));
      let cur = 0, mx = 0;
      for (const g of list) { if (g.win) { cur++; mx = Math.max(mx, cur); } else cur = 0; }
      if (!best || mx > best.streak) best = { id, streak: mx };
    }
    if (best && best.streak > 1) out.push({ key: 'serie', label: 'Plus longue série de victoires', playerId: best.id, playerName: byId.get(best.id)?.name || '', value: `${best.streak} victoires d'affilée` });
  }

  // 4 — Meilleur pourcentage de victoires (min. 8 matchs pour être significatif).
  {
    const eligible = players.filter((p) => p.played >= 8);
    const pool = eligible.length ? eligible : players.filter((p) => p.played > 0);
    let best: any = null;
    for (const p of pool) if (!best || p.winPct > best.winPct) best = p;
    if (best && best.winPct > 0) out.push({ key: 'winpct', label: 'Meilleur % de victoires', playerId: best.id, playerName: best.name, value: `${best.winPct} %`, sub: `${best.wins} V – ${best.losses} D` });
  }

  // 5 — Plus large victoire (plus grand écart de manches).
  {
    let best: { m: any; margin: number } | null = null;
    for (const m of matches) {
      const margin = Math.abs((m.sA || 0) - (m.sB || 0));
      if (!best || margin > best.margin) best = { m, margin };
    }
    if (best && best.margin > 0) {
      const m = best.m;
      const aWin = m.sA > m.sB;
      out.push({ key: 'largevictoire', label: 'Plus large victoire', playerId: aWin ? m.aId : m.bId, playerName: aWin ? m.aName : m.bName, value: `${Math.max(m.sA, m.sB)}–${Math.min(m.sA, m.sB)}`, sub: `contre ${aWin ? m.bName : m.aName}` });
    }
  }

  // 6 — Plus de tournois gagnés.
  {
    const wins = new Map<number, { name: string; n: number }>();
    for (const t of tournaments) {
      let w = t.winner;
      if (!w) {
        const fin = matches.find((m) => m.tid === t.id && ['final', 'grand final'].includes((m.round || '').toLowerCase()));
        if (fin) w = fin.sA > fin.sB ? { id: fin.aId, name: fin.aName } : { id: fin.bId, name: fin.bName };
      }
      if (w && w.id != null) { const e = wins.get(w.id) || { name: w.name, n: 0 }; e.n++; wins.set(w.id, e); }
    }
    let best: { id: number; name: string; n: number } | null = null;
    for (const [id, e] of wins) if (!best || e.n > best.n) best = { id, name: e.name, n: e.n };
    if (best && best.n > 0) out.push({ key: 'tournois', label: 'Plus de tournois gagnés', playerId: best.id, playerName: best.name, value: best.n > 1 ? `${best.n} tournois` : `${best.n} tournoi` });
  }

  return out;
}

// Index des joueurs (toutes saisons d'un périmètre, dédoublonné) — pour la recherche.
// Par défaut : la compétition Masters. Passer getFemmesSeasons() pour le féminin.
export function allPlayers(seasonsList: Season[] = getSeasons()): { id: number; name: string; slug: string }[] {
  const map = new Map<number, { id: number; name: string; slug: string }>();
  for (const s of seasonsList) {
    if (!s.results) continue;
    for (const p of s.results.players as Player[]) {
      if (!map.has(p.id)) map.set(p.id, { id: p.id, name: p.name, slug: p.slug });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

// Slug lisible et UNIQUE par joueur (dans un périmètre de compétition), pour des URLs
// du type /billard/joueur/christophe-lambert. slugOf(id) → slug ; entries pour getStaticPaths.
const _slugify = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function playerSlugs(seasonsList: Season[] = getSeasons()) {
  const base = new Map<number, string>();
  for (const s of seasonsList) {
    if (!s.results) continue;
    for (const p of s.results.players as Player[]) {
      if (!base.has(p.id)) base.set(p.id, p.slug || _slugify(p.name) || String(p.id));
    }
  }
  const used = new Set<string>();
  const slug = new Map<number, string>();
  for (const [id, b] of base) {
    let s = b;
    if (used.has(s)) { let n = 2; while (used.has(`${b}-${n}`)) n++; s = `${b}-${n}`; }
    used.add(s); slug.set(id, s);
  }
  return {
    slugOf: (id: number) => slug.get(id) || String(id),
    entries: [...slug].map(([id, s]) => ({ id, slug: s })),
  };
}

// Normalisation « souple » d'un texte : sans accents, minuscules, ponctuation → espaces.
const _flat = (s: string) =>
  ' ' + (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';

// Joueurs (du référentiel) dont le NOM COMPLET apparaît dans un texte (titre, corps
// d'article…). Sert à relier automatiquement les articles/vidéos aux fiches joueurs.
export function playersInText(text: string, seasonsList: Season[] = getSeasons()): { id: number; name: string; slug: string }[] {
  if (!text) return [];
  const hay = _flat(text);
  const out: { id: number; name: string; slug: string }[] = [];
  const seen = new Set<number>();
  for (const p of allPlayers(seasonsList)) {
    const n = _flat(p.name).trim();
    if (n.length < 5) continue; // évite les faux positifs sur un mot trop court
    if (hay.includes(' ' + n + ' ') && !seen.has(p.id)) { seen.add(p.id); out.push({ id: p.id, name: p.name, slug: p.slug }); }
  }
  return out;
}

// Faits marquants d'une saison, calculés depuis les vraies données.
export function seasonHighlights(data: SeasonData) {
  const players = data.players;
  const matches = data.matches;

  // Plus large victoire (plus grand écart de manches).
  let biggest: { winId: number; winName: string; loseName: string; sw: number; sl: number; gap: number } | null = null;
  for (const m of matches) {
    const gap = Math.abs(m.sA - m.sB);
    const winA = m.sA > m.sB;
    if (!biggest || gap > biggest.gap) {
      biggest = { winId: winA ? m.aId : m.bId, winName: winA ? m.aName : m.bName, loseName: winA ? m.bName : m.aName, sw: Math.max(m.sA, m.sB), sl: Math.min(m.sA, m.sB), gap };
    }
  }

  // Plus longue série de victoires (par joueur, en chronologie).
  let streak = { id: 0, name: '', n: 0 };
  for (const p of players) {
    const ms = matches.filter((m) => m.aId === p.id || m.bId === p.id).sort((a, b) => (a.date < b.date ? -1 : 1));
    let cur = 0, best = 0;
    for (const m of ms) {
      const my = m.aId === p.id ? m.sA : m.sB, opp = m.aId === p.id ? m.sB : m.sA;
      if (my > opp) { cur++; best = Math.max(best, cur); } else cur = 0;
    }
    if (best > streak.n) streak = { id: p.id, name: p.name, n: best };
  }

  const topWins = [...players].sort((a, b) => b.wins - a.wins || b.winPct - a.winPct)[0];
  const bestPct = [...players].filter((p) => p.played >= 8).sort((a, b) => b.winPct - a.winPct || b.wins - a.wins)[0] || topWins;
  const mostActive = [...players].sort((a, b) => b.played - a.played)[0];
  const totalManches = matches.reduce((s, m) => s + m.sA + m.sB, 0);

  return {
    biggest, streak, topWins, bestPct, mostActive,
    totalMatches: matches.length, totalManches, playerCount: players.length, tournCount: data.tournaments.length,
  };
}

export const fmtDate = (iso: string) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '';

// Traduit en français les noms de tours renvoyés par Cuescore (en anglais).
export function frRound(r: string): string {
  if (!r) return '';
  const low = r.trim().toLowerCase();
  const map: Record<string, string> = {
    'final': 'Finale',
    'grand final': 'Grande finale',
    'semi final': 'Demi-finale', 'semifinal': 'Demi-finale', 'semi-final': 'Demi-finale',
    'quarter final': 'Quart de finale', 'quarterfinal': 'Quart de finale', 'quarter-final': 'Quart de finale',
    'last 16': '8e de finale', 'last 32': '16e de finale', 'last 64': '32e de finale', 'last 128': '64e de finale',
    'last two': 'Finale', 'last four': 'Demi-finale', 'last eight': 'Quart de finale',
    'last sixteen': '8e de finale', 'last thirty-two': '16e de finale', 'last thirty two': '16e de finale',
    'last sixty-four': '32e de finale', 'last sixty four': '32e de finale',
    'third place': '3e place', '3rd place': '3e place',
    'winners final': 'Finale (tableau gagnants)', 'losers final': 'Finale (tableau perdants)',
    'winners qualification': 'Qualif. gagnants', 'losers qualification': 'Qualif. perdants',
    'winners round 1': 'Gagnants · tour 1', 'loser round 1': 'Perdants · tour 1', 'losers round 1': 'Perdants · tour 1',
    'winner': 'Vainqueur', 'runner-up': 'Finaliste',
  };
  if (map[low]) return map[low];
  const round = low.match(/^round\s*(\d+)$/);
  if (round) return `Tour ${round[1]}`;
  const group = low.match(/^group\s*(.+)$/);
  if (group) return `Poule ${group[1].toUpperCase()}`;
  return r; // libellé inconnu : laissé tel quel
}
