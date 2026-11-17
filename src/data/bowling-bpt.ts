// ============================================================
//  Données du Bowling Pro-Motion Tour (BPT) pour la page /disciplines/bowling.
//  LSEI est partenaire média. Source : press kit officiel 2026 (public/bowling promotion tour/).
//  Structure par édition (ajouter 2027 en tête le moment venu) + palmarès + partenaires.
// ============================================================

export interface BptStage {
  dates: string;       // libellé court (ex. "26-27 nov")
  iso?: string;        // date de début ISO (pour compte à rebours / tri)
  city: string;
  label: string;       // type d'épreuve
  tv?: boolean;        // étape avec matchs TV
}
export interface BptFavorite {
  name: string;
  initials: string;
  country: string;     // code pays affiché (ex. "USA")
  note: string;        // pourquoi favori
  photo?: string;      // /bowling/… (webp) si dispo
}
export interface BptPalmares { year: string; masters: string; women: string; }

export interface BptEdition {
  year: number;
  slug: string;
  editionLabel: string;   // "17ᵉ édition"
  datesLabel: string;     // "21 → 30 novembre 2026"
  startIso: string;       // 1re action (compte à rebours)
  status: 'upcoming' | 'live' | 'past';
  approved: string;       // "Épreuve de classement PBA France"
  tvMatches: number;
  nations: string[];
  stages: BptStage[];
  favorites: BptFavorite[];
  blurb: string;
}

export const BPT_NATIONS_2026 = ['France', 'USA', 'Allemagne', 'Pays-Bas', 'Belgique', 'Italie', 'Suisse', 'Slovaquie', 'Tchéquie', 'Saint-Marin'];

export const editions: BptEdition[] = [
  {
    year: 2026,
    slug: '2026',
    editionLabel: '17ᵉ édition',
    datesLabel: '21 → 30 novembre 2026',
    startIso: '2026-11-21T09:00:00+01:00',
    status: 'upcoming',
    approved: 'Épreuve de classement PBA France',
    tvMatches: 12,
    nations: BPT_NATIONS_2026,
    blurb:
      "Une semaine de compétition internationale : les stars américaines de la PBA et de la PWBA face à l'élite européenne, dix nations sur les pistes, du Mixte individuel aux séries féminines. Le dernier classement PBA France est au cœur de ce rendez-vous.",
    stages: [
      { dates: '21-22 nov', iso: '2026-11-21', city: 'Fontaine-le-Comte', label: "Séries féminines — pré-qualifications" },
      { dates: '24 nov', iso: '2026-11-24', city: 'Rennes', label: 'Arrivée et réunion des joueurs' },
      { dates: '25 nov', iso: '2026-11-25', city: 'Avranches', label: 'Teams — Strike Tour, jour 1' },
      { dates: '26-27 nov', iso: '2026-11-26', city: 'Bayeux', label: 'BPT PBA — qualifications (8 parties ×2)' },
      { dates: '28 nov', iso: '2026-11-28', city: 'Châteaubriant · Angers', label: 'Exhibition' },
      { dates: '29 nov', iso: '2026-11-29', city: 'Cap Malo · La Mézière', label: 'Teams — Strike Tour, jour 2' },
      { dates: '30 nov', iso: '2026-11-30', city: 'Cap Malo · La Mézière', label: 'Finales — 12 matchs TV', tv: true },
    ],
    favorites: [
      { name: 'Tim Foy Jr', initials: 'TF', country: 'USA', note: 'Tenant du titre 2025' },
      { name: 'Alexander Horton', initials: 'AH', country: 'USA', note: 'Vainqueur du dernier PBA TOC' },
      { name: 'Liz Johnson', initials: 'LJ', country: 'USA', note: 'Grande favorite des dames' },
    ],
  },
];

// Palmarès récent (Masters « Race for the Title » + Séries féminines). Source : press kit 2026.
export const palmares: BptPalmares[] = [
  { year: '2025', masters: 'Tim Foy Jr (USA)', women: 'Crystal Elliott (USA)' },
  { year: '2024', masters: 'Keny Billaut (France)', women: 'Eliisa Hiltunen (Finlande)' },
  { year: '2023', masters: 'Jaime Gonzalez (Colombie)', women: 'Karen K. Nielsen (Danemark)' },
  { year: '2022', masters: 'Dennis Grünheid (Allemagne)', women: 'Danielle McEwan (USA)' },
  { year: '2021', masters: 'Carl Eklund (Suède)', women: 'Daria Pajak (Pologne)' },
  { year: '2020', masters: 'Daria Pajak (Pologne)', women: 'Alexandra Lopes (France)' },
];

export const partners = {
  title: 'QubicaAMF France',          // sponsor titre du Master
  official: ['STORM', 'VIS Sportwear'],
  institutional: ['FFBSQ', 'Ville de Châteaubriant'],
  broadcasters: ['LSEI — Le Sport en Image', 'Sport en France', 'France 3 Bretagne', 'TV Rennes', 'WON Sports', 'Bowling TV'],
};

// Repères médias cumulés (press kit). Pour la barre de stats / « chiffres ».
export const mediaFigures = {
  subscribers: '40 000+',   // abonnés YouTube (n°1 zone euro)
  countries: 58,            // pays de diffusion depuis 2010
  tvShows: '1 000+',
  youtubeViews: '5,7 M',
};

export const contact = { email: 'bowlingpromotion@gmail.com', site: 'bowlingpromotiontour.com' };

export const currentEdition = () => editions[0];
