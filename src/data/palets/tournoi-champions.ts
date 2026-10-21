// TOURNOI DES CHAMPIONS (palets) — rendez-vous annuel de début janvier, 16 joueurs.
// Formule : phase de poule (3 parties) → les 8 premiers en quarts → demis → finale en 15.
//
// AJOUTER UNE ÉDITION : copier un bloc de `editions` (la plus récente en tête),
// compléter `players` si nouveaux joueurs, déposer les photos dans
// public/tournoi-des-champions/joueurs/<id>.webp (720×900, ou laisser vide → initiales).

export interface TdcPlayer {
  first: string;
  last: string;
  club?: string;
}

/** Fiche joueur — l'id sert aussi de nom de fichier photo. */
export const players: Record<string, TdcPlayer> = {
  'adrien-morel': { first: 'Adrien', last: 'Morel' },
  'alvyn-prunier': { first: 'Alvyn', last: 'Prunier', club: 'Bonnemain' },
  'axel-boizart': { first: 'Axel', last: 'Boizart', club: 'Pleudihen' },
  'benoit-dufil': { first: 'Benoît', last: 'Dufil', club: 'Châteaugiron' },
  'cyrille-jouault': { first: 'Cyrille', last: 'Jouault', club: 'Loiron' },
  'edith-houssais': { first: 'Edith', last: 'Houssais', club: 'Janzé' },
  'elody-guillot': { first: 'Elody', last: 'Guillot', club: 'La Noë-Blanche' },
  'eric-jeusset': { first: 'Eric', last: 'Jeusset', club: 'Cornillé' },
  'florent-dufeil': { first: 'Florent', last: 'Dufeil', club: 'Pleudihen' },
  'frederic-even': { first: 'Frédéric', last: 'Even' },
  'hugo-collet': { first: 'Hugo', last: 'Collet', club: 'Vieux-Vy-sur-Couesnon' },
  'jacky-delalande': { first: 'Jacky', last: 'Delalande', club: 'Cornillé' },
  'jean-francois-chasse': { first: 'Jean-François', last: 'Chasse', club: 'Cornillé' },
  'jean-marc-toutirais': { first: 'Jean-Marc', last: 'Toutirais', club: 'Loiron' },
  'louhenvel-adam': { first: 'Louhenvel', last: 'Adam', club: 'Loiron' },
  'nathalie-allard': { first: 'Nathalie', last: 'Allard', club: 'Taillis' },
  'nathan-rehel': { first: 'Nathan', last: 'Rehel', club: 'Lanrelas' },
  'patrice-beucher': { first: 'Patrice', last: 'Beucher', club: 'Mézières-sur-Couesnon' },
  'sebastien-huet': { first: 'Sébastien', last: 'Huet', club: 'Châteaugiron' },
  'steven-bonneau': { first: 'Steven', last: 'Bonneau', club: 'Méral' },
  'sylvain-pechot': { first: 'Sylvain', last: 'Pechot', club: 'Saulnières' },
  'thomas-gauthier': { first: 'Thomas', last: 'Gauthier', club: 'Saint-Just' },
};

/** Ligne du classement de poule (ordre = position). ga = goal average. */
export interface TdcPoolRow { id: string; w: number; ga: number }
/** Match à élimination directe : vainqueur d'abord. Ordre du tableau : les quarts
 *  0-1 alimentent la demi 0, les quarts 2-3 la demi 1. */
export interface TdcMatch { win: string; lose: string; sw: number; sl: number }

export interface TdcEdition {
  year: number;
  /** date ISO du tournoi */
  date: string;
  /** vidéo YouTube du live (id) */
  video?: string;
  /** photo de groupe (chemin /public) */
  groupPhoto?: string;
  pool: TdcPoolRow[];
  quarters: TdcMatch[];
  semis: TdcMatch[];
  final: TdcMatch;
}

/** Nombre de qualifiés à l'issue de la poule. */
export const QUALIFIED = 8;

export const editions: TdcEdition[] = [
  {
    year: 2026,
    date: '2026-01-03',
    video: '1XzKh__Z6cM',
    pool: [
      { id: 'jean-marc-toutirais', w: 3, ga: 23 },
      { id: 'adrien-morel', w: 3, ga: 12 },
      { id: 'sylvain-pechot', w: 2, ga: 15 },
      { id: 'cyrille-jouault', w: 2, ga: 12 },
      { id: 'eric-jeusset', w: 2, ga: 10 },
      { id: 'steven-bonneau', w: 2, ga: 8 },
      { id: 'louhenvel-adam', w: 2, ga: 7 },
      { id: 'nathan-rehel', w: 2, ga: 2 },
      { id: 'alvyn-prunier', w: 1, ga: 2 },
      { id: 'thomas-gauthier', w: 1, ga: 0 },
      { id: 'jean-francois-chasse', w: 1, ga: -3 },
      { id: 'benoit-dufil', w: 1, ga: -11 },
      { id: 'frederic-even', w: 1, ga: -12 },
      { id: 'hugo-collet', w: 1, ga: -12 },
      { id: 'edith-houssais', w: 0, ga: -25 },
      { id: 'elody-guillot', w: 0, ga: -28 },
    ],
    quarters: [
      { win: 'jean-marc-toutirais', lose: 'nathan-rehel', sw: 12, sl: 4 },
      { win: 'sylvain-pechot', lose: 'steven-bonneau', sw: 12, sl: 8 },
      { win: 'cyrille-jouault', lose: 'eric-jeusset', sw: 12, sl: 1 },
      { win: 'adrien-morel', lose: 'louhenvel-adam', sw: 12, sl: 6 },
    ],
    semis: [
      { win: 'jean-marc-toutirais', lose: 'sylvain-pechot', sw: 12, sl: 6 },
      { win: 'cyrille-jouault', lose: 'adrien-morel', sw: 12, sl: 1 },
    ],
    final: { win: 'jean-marc-toutirais', lose: 'cyrille-jouault', sw: 15, sl: 14 },
  },
  {
    year: 2025,
    date: '2025-01-04',
    video: 'AsbZYgDvYY0',
    groupPhoto: '/tournoi-des-champions/2025/groupe.webp',
    pool: [
      { id: 'cyrille-jouault', w: 3, ga: 28 },
      { id: 'sylvain-pechot', w: 3, ga: 22 },
      { id: 'steven-bonneau', w: 3, ga: 17 },
      { id: 'jean-marc-toutirais', w: 2, ga: 18 },
      { id: 'nathan-rehel', w: 2, ga: 8 },
      { id: 'eric-jeusset', w: 2, ga: 2 },
      { id: 'jean-francois-chasse', w: 2, ga: 1 },
      { id: 'frederic-even', w: 2, ga: -2 },
      { id: 'jacky-delalande', w: 2, ga: -3 },
      { id: 'sebastien-huet', w: 1, ga: 1 },
      { id: 'louhenvel-adam', w: 1, ga: -3 },
      { id: 'benoit-dufil', w: 1, ga: -12 },
      { id: 'patrice-beucher', w: 0, ga: -17 },
      { id: 'axel-boizart', w: 0, ga: -18 },
      { id: 'florent-dufeil', w: 0, ga: -20 },
      { id: 'nathalie-allard', w: 0, ga: -22 },
    ],
    quarters: [
      { win: 'sylvain-pechot', lose: 'steven-bonneau', sw: 12, sl: 8 },
      { win: 'eric-jeusset', lose: 'nathan-rehel', sw: 12, sl: 6 },
      { win: 'cyrille-jouault', lose: 'jean-marc-toutirais', sw: 12, sl: 9 },
      { win: 'jean-francois-chasse', lose: 'frederic-even', sw: 12, sl: 3 },
    ],
    semis: [
      { win: 'sylvain-pechot', lose: 'eric-jeusset', sw: 12, sl: 6 },
      { win: 'jean-francois-chasse', lose: 'cyrille-jouault', sw: 12, sl: 11 },
    ],
    final: { win: 'jean-francois-chasse', lose: 'sylvain-pechot', sw: 15, sl: 10 },
  },
];

export const playerName = (id: string) => {
  const p = players[id];
  return p ? `${p.first} ${p.last}` : id;
};

/** Nombre de participations / titres / finales d'un joueur, toutes éditions. */
export function careerOf(id: string) {
  const eds = editions.filter((e) => e.pool.some((r) => r.id === id));
  return {
    played: eds.length,
    titles: editions.filter((e) => e.final.win === id).length,
    finals: editions.filter((e) => e.final.win === id || e.final.lose === id).length,
  };
}
