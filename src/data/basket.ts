// ============================================================
//  BASKET — championnat NM1 + mini-sites clubs (« site dans le site »).
//  Données RÉELLES saison 2026-2027, Poule B (source : nm1.ffbb.com).
//  Le championnat débute le 18/09/2026 → pas encore de scores ni de stats.
//  Ajouter un club = une entrée dans `nmClubs` + (option) un roster dans `rosters`.
// ============================================================

/** false = données réelles (plus de bandeau « exemple »). */
export const SAMPLE = false;

export const NM1_LABEL = 'Nationale Masculine 1';
export const NM1_POOL = 'Poule B';
export const SEASON = '2026-2027';
export const SEASON_START = '18 septembre 2026';

export interface NmClub {
  slug: string;
  name: string;
  short: string;      // sigle court affiché dans le calendrier/classement
  city: string;
  logo?: string;      // /partenaires/… ou /clubs/<slug>/logo.webp ; sinon pastille initiales
  color: string;      // couleur d'accent (approximative pour les clubs sans logo)
  hasSite?: boolean;  // true = mini-site club disponible (clic actif)
}

// Poule B 2026-2027 (14 équipes). Fougères = club pilote (mini-site).
// Chaque logo est attendu dans public/basket/<slug>/logo.webp ; tant qu'il est
// absent, une pastille à initiales s'affiche (les pages vérifient via assetExists).
// Les couleurs sont indicatives (repli d'accent en l'absence de charte).
export const nmClubs: NmClub[] = [
  { slug: 'fougeres',    name: 'Pays de Fougères',     short: 'FOU',  city: 'Fougères',            logo: '/basket/fougeres/logo.webp',    color: '#2E6BE6', hasSite: true },
  { slug: 'angers',      name: 'Angers',                short: 'ANG',  city: 'Angers',             logo: '/basket/angers/logo.webp',      color: '#2B2F36' },
  { slug: 'bordeaux',    name: 'Bordeaux',              short: 'BOR',  city: 'Bordeaux',           logo: '/basket/bordeaux/logo.webp',    color: '#7B1E28' },
  { slug: 'challans',    name: 'Challans',              short: 'CHA',  city: 'Challans',           logo: '/basket/challans/logo.webp',    color: '#D33A2C' },
  { slug: 'chartres',    name: 'Chartres',              short: 'CHT',  city: 'Chartres',           logo: '/basket/chartres/logo.webp',    color: '#178A3A' },
  { slug: 'laval',       name: 'Laval',                 short: 'LAV',  city: 'Laval',              logo: '/basket/laval/logo.webp',       color: '#0E8C8C' },
  { slug: 'lorient',     name: 'Lorient',               short: 'LOR',  city: 'Lorient',            logo: '/basket/lorient/logo.webp',     color: '#F28C00' },
  { slug: 'pole-france', name: 'Pôle France',           short: 'CFBB', city: 'Paris (INSEP)',      logo: '/basket/pole-france/logo.webp', color: '#1D4ED8' },
  { slug: 'rennes',      name: 'Rennes',                short: 'REN',  city: 'Rennes',             logo: '/basket/rennes/logo.webp',      color: '#E4002B' },
  { slug: 'sables',      name: "Les Sables d'Olonne",   short: 'SAB',  city: "Les Sables-d'Olonne", logo: '/basket/sables/logo.webp',      color: '#12A150' },
  { slug: 'tarbes',      name: 'Tarbes Lourdes',        short: 'TAR',  city: 'Tarbes',             logo: '/basket/tarbes/logo.webp',      color: '#7A2FA0' },
  { slug: 'toulouse',    name: 'Toulouse',              short: 'TOU',  city: 'Toulouse',           logo: '/basket/toulouse/logo.webp',    color: '#6A0DAD' },
  { slug: 'tours',       name: 'Tours',                 short: 'TRS',  city: 'Tours',              logo: '/basket/tours/logo.webp',       color: '#14539A' },
  { slug: 'vitre',       name: 'Vitré',                 short: 'VIT',  city: 'Vitré',              logo: '/basket/vitre/logo.webp',       color: '#E4A400' },
];

export const nmClubBy = (slug: string) => nmClubs.find((c) => c.slug === slug);

export interface NmMatch {
  date: string;          // ISO (date seule — l'horaire exact n'est pas toujours connu)
  round?: number;        // n° de journée
  homeSlug: string;
  awaySlug: string;
  homeScore?: number;    // rempli quand le match est joué
  awayScore?: number;
  venue?: string;
}

// Calendrier RÉEL de Pays de Fougères — Poule B 2026-2027 (source nm1.ffbb.com).
// @ = extérieur, vs = domicile. Scores à compléter au fil de la saison.
export const nm1Calendar: NmMatch[] = [
  { date: '2026-09-18', round: 1,  homeSlug: 'challans',    awaySlug: 'fougeres' },
  { date: '2026-09-25', round: 2,  homeSlug: 'fougeres',    awaySlug: 'sables' },
  { date: '2026-09-29', round: 3,  homeSlug: 'angers',      awaySlug: 'fougeres' },
  { date: '2026-10-02', round: 4,  homeSlug: 'fougeres',    awaySlug: 'tarbes' },
  { date: '2026-10-09', round: 5,  homeSlug: 'lorient',     awaySlug: 'fougeres' },
  { date: '2026-10-16', round: 6,  homeSlug: 'fougeres',    awaySlug: 'pole-france' },
  { date: '2026-10-20', round: 7,  homeSlug: 'vitre',       awaySlug: 'fougeres' },
  { date: '2026-10-23', round: 8,  homeSlug: 'fougeres',    awaySlug: 'rennes' },
  { date: '2026-10-30', round: 9,  homeSlug: 'toulouse',    awaySlug: 'fougeres' },
  { date: '2026-11-06', round: 10, homeSlug: 'fougeres',    awaySlug: 'bordeaux' },
  { date: '2026-11-11', round: 11, homeSlug: 'laval',       awaySlug: 'fougeres' },
  { date: '2026-11-17', round: 12, homeSlug: 'fougeres',    awaySlug: 'tours' },
  { date: '2026-11-20', round: 13, homeSlug: 'fougeres',    awaySlug: 'chartres' },
  { date: '2026-12-04', round: 14, homeSlug: 'fougeres',    awaySlug: 'challans' },
  { date: '2026-12-11', round: 15, homeSlug: 'sables',      awaySlug: 'fougeres' },
  { date: '2026-12-15', round: 16, homeSlug: 'fougeres',    awaySlug: 'angers' },
  { date: '2026-12-18', round: 17, homeSlug: 'tarbes',      awaySlug: 'fougeres' },
  { date: '2027-01-08', round: 18, homeSlug: 'fougeres',    awaySlug: 'lorient' },
  { date: '2027-01-15', round: 19, homeSlug: 'pole-france', awaySlug: 'fougeres' },
  { date: '2027-01-19', round: 20, homeSlug: 'fougeres',    awaySlug: 'vitre' },
  { date: '2027-01-22', round: 21, homeSlug: 'rennes',      awaySlug: 'fougeres' },
  { date: '2027-01-29', round: 22, homeSlug: 'fougeres',    awaySlug: 'toulouse' },
  { date: '2027-02-05', round: 23, homeSlug: 'bordeaux',    awaySlug: 'fougeres' },
  { date: '2027-02-12', round: 24, homeSlug: 'fougeres',    awaySlug: 'laval' },
  { date: '2027-02-16', round: 25, homeSlug: 'tours',       awaySlug: 'fougeres' },
  { date: '2027-02-19', round: 26, homeSlug: 'chartres',    awaySlug: 'fougeres' },
];

export interface Player {
  number?: number;       // dossard (non communiqué par la FFBB pour l'instant)
  name: string;
  pos: string;           // Meneur, Arrière, Ailier, Ailier fort, Pivot
  height?: string;       // « 1,98 m »
  birth?: number;        // année de naissance
  nat?: string;          // « FRA »
  photo?: string;        // /clubs/<slug>/joueurs/<x>.webp ; sinon initiales
  stats?: { g: number; pts: number; reb: number; ast: number }; // moyennes NM1 (dès le 1er match)
}

// Effectif RÉEL de Pays de Fougères 2026-2027 (source nm1.ffbb.com).
// Postes FFBB : 1 Meneur · 2 Arrière · 3 Ailier · 4 Ailier fort · 5 Pivot.
// Pas de dossards ni de stats NM1 tant que le championnat n'a pas commencé.
export const rosters: Record<string, Player[]> = {
  fougeres: [
    { name: 'Kevin Bichard',          pos: 'Ailier fort', height: '1,95 m', birth: 1986 },
    { name: 'Daouda Conde',           pos: 'Pivot',       height: '2,04 m', birth: 1992 },
    { name: 'Romain Dardaine',        pos: 'Ailier fort', height: '2,00 m', birth: 1988 },
    { name: 'Yanis Harrath',          pos: 'Meneur',      height: '1,78 m', birth: 1998 },
    { name: 'Calvin Jubenot',         pos: 'Ailier fort', height: '1,98 m', birth: 1986 },
    { name: 'Malcolm Laubouet',       pos: 'Espoir',      height: '1,75 m', birth: 2006 },
    { name: 'Mael Lebrun',            pos: 'Ailier',      height: '1,95 m', birth: 1991 },
    { name: 'Victor Mopsus',          pos: 'Meneur',      height: '1,75 m', birth: 1999 },
    { name: 'Clement Poncet-Leberre', pos: 'Arrière',     height: '1,85 m', birth: 1995 },
    { name: 'Ansumana Tawredu',       pos: 'Ailier fort', height: '2,00 m', birth: 2003 },
  ],
};

export const rosterOf = (slug: string): Player[] => rosters[slug] ?? [];

// Classement dérivé des matchs joués (V=2 pts, D=1 pt).
// NB : seuls les matchs de Fougères sont saisis pour l'instant → le classement
// se remplira vraiment quand on ajoutera les rencontres des autres clubs.
export function nm1Standings() {
  const t: Record<string, { slug: string; w: number; l: number; pf: number; pa: number; played: number }> = {};
  for (const c of nmClubs) t[c.slug] = { slug: c.slug, w: 0, l: 0, pf: 0, pa: 0, played: 0 };
  for (const m of nm1Calendar) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const h = t[m.homeSlug], a = t[m.awaySlug];
    if (!h || !a) continue;
    h.played++; a.played++; h.pf += m.homeScore; h.pa += m.awayScore; a.pf += m.awayScore; a.pa += m.homeScore;
    if (m.homeScore > m.awayScore) { h.w++; a.l++; } else { a.w++; h.l++; }
  }
  return Object.values(t)
    .map((r) => ({ ...r, pts: r.w * 2 + r.l, diff: r.pf - r.pa }))
    .sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.pf - a.pf);
}

/** true dès qu'au moins un match a été joué (pour n'afficher scores/classement qu'après). */
export const seasonStarted = () => nm1Calendar.some((m) => m.homeScore != null && m.awayScore != null);

// ------------------------------------------------------------
//  LIEN CALENDRIER ↔ REPLAYS LSEI  (le différenciateur « web TV »)
//  On relie chaque match à sa vidéo LSEI automatiquement, en lisant le
//  titre YouTube. LSEI titre ses matchs de 2 façons, toutes deux gérées :
//    « 🏀 BASKETBALL NM1 26/27 | 18/09/2026 | Pays de Fougères Basket vs Challans »
//    « 🏀 JOURNEE 1 - 26/27 : Pays de Fougères Basket vs Challans »
//  → dès qu'un replay est mis en ligne avec ce format, le bouton « Revoir »
//    apparaît tout seul sur la bonne journée. Rien à saisir à la main.
// ------------------------------------------------------------
export interface ReplaySrc { id: string; title: string; season?: string }

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const seasonYY = SEASON.slice(2, 4) + '/' + SEASON.slice(7, 9); // '2026-2027' → '26/27'

function roundFromTitle(title: string): number | null {
  // 1) numéro de journée explicite : « JOURNEE 12 »
  const j = title.match(/journ[eé]+\s*(\d+)/i);
  if (j) return Number(j[1]);
  // 2) sinon, date JJ/MM/AAAA → on retrouve la journée par la date du calendrier
  const d = title.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (d) {
    const iso = `${d[3]}-${d[2]}-${d[1]}`;
    return nm1Calendar.find((m) => m.date === iso)?.round ?? null;
  }
  return null;
}

/** Associe chaque journée (round) à l'id de son replay LSEI, pour la saison en cours. */
export function fougeresReplayMap(videos: ReplaySrc[]): Record<number, string> {
  const out: Record<number, string> = {};
  for (const v of videos) {
    const t = v.title || '';
    if (!strip(t).includes('fougeres')) continue;
    const seasonOk = t.includes(seasonYY) || (v.season && v.season.replace('/', '-') === SEASON);
    if (!seasonOk) continue;
    const round = roundFromTitle(t);
    if (round == null || round in out) continue;
    out[round] = v.id;
  }
  return out;
}

export const youtubeWatch = (id: string) => `https://www.youtube.com/watch?v=${id}`;
