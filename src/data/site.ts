// ============================================================
//  Données éditoriales du site LSEI.
//  Ce fichier centralise tout ce qui ne vient PAS de YouTube :
//  disciplines, partenaires, chiffres-clés, textes.
//  → C'est ici qu'on modifie le contenu « fixe » du site.
// ============================================================

export interface SiteInfo {
  name: string;
  tagline: string;
  description: string;
  youtubeUrl: string;
  /** identifiant public de la chaîne (pour le lecteur de direct temps réel) */
  channelId: string;
  social: { youtube: string; facebook: string; instagram: string; tiktok: string };
}

export const site: SiteInfo = {
  name: 'LSEI',
  tagline: 'Le Sport en Image',
  description:
    'La web TV associative qui met en image les sports authentiques du territoire, du haut niveau aux clubs de proximité.',
  youtubeUrl: 'https://www.youtube.com/@LSEIWebTvSport',
  channelId: 'UCYUOdKr28cOjLzHWv6pTpjQ',
  social: {
    youtube: 'https://www.youtube.com/@LSEIWebTvSport',
    facebook: 'https://www.facebook.com/LSEI.LESPORTENIMAGE',
    instagram: 'https://www.instagram.com/lsei_web_tv_sport',
    tiktok: 'https://www.tiktok.com/@lseiwebtvsport',
  },
};

export type DisciplineSlug = 'basket' | 'billard' | 'palets' | 'football' | 'beach' | 'bowling' | 'subbuteo';

export interface Discipline {
  slug: DisciplineSlug;
  name: string;
  sub: string;
  /** libellé court affiché dans les vignettes/tags */
  label: string;
  /** variable CSS de couleur, ex. "var(--c-basket)" */
  colorVar: string;
  /** dégradé duotone des vignettes (placeholder tant qu'il n'y a pas de photo) */
  from: string;
  to: string;
  /** fond translucide du tag (rgba) */
  tagBg: string;
  /** compteur affiché sur la home (sera calculé depuis la playlist plus tard) */
  count: string;
  /** identifiant de la playlist YouTube de la discipline (à renseigner) */
  playlistId?: string;
  /** chapô de la page discipline */
  blurb: string;
  /** lien vers le hub « Classements & stats » de la discipline (si suivi). Optionnel. */
  statsHub?: string;
  /** nom de la compétition suivie (ex. « Blackball Master »), pour le bandeau stats. */
  statsTitle?: string;
  /** page d'accueil du « hub » de la discipline (le site dans le site). Optionnel. */
  hub?: string;
}

export const disciplines: Discipline[] = [
  {
    slug: 'basket',
    name: 'Basketball',
    sub: 'Nationale Masculine 1',
    label: 'Basket',
    colorVar: 'var(--c-basket)',
    from: '#E06A24',
    to: '#7a2f0e',
    tagBg: 'rgba(224,106,36,.14)',
    count: '42 matchs diffusés',
    blurb:
      "Le parquet vu de l'intérieur : rencontres commentées, coulisses des clubs et temps forts de la saison, du Pays de Fougères Basket aux déplacements les plus chauds.",
  },
  {
    slug: 'billard',
    name: 'Billard',
    sub: 'Blackball, snooker & billard américain',
    label: 'Billard',
    colorVar: 'var(--c-billard)',
    from: '#1E7BE0',
    to: '#0C3E77',
    tagBg: 'rgba(30,123,224,.14)',
    count: '18 lives',
    blurb:
      "La précision faite spectacle : Masters, championnats et démonstrations, filmés au plus près de la bande avec l'analyse de nos experts.",
    statsHub: '/billard/saison/2025-2026/classement',
    statsTitle: 'Blackball Master',
    hub: '/billard/hub',
  },
  {
    slug: 'palets',
    name: 'Palets bretons',
    sub: 'Sur planche & terre',
    label: 'Palets',
    colorVar: 'var(--c-palets)',
    from: '#D2A521',
    to: '#6B4E12',
    tagBg: 'rgba(210,165,33,.16)',
    count: '12 tournois',
    blurb:
      "Un patrimoine bien vivant : tournois, championnats de Bretagne et portraits de joueurs qui perpétuent un jeu centenaire.",
  },
  {
    slug: 'football',
    name: 'Football',
    sub: 'Ligue de Bretagne',
    label: 'Football',
    colorVar: 'var(--c-foot)',
    from: '#2E9E52',
    to: '#145c2e',
    tagBg: 'rgba(46,158,82,.14)',
    count: 'Événements ponctuels',
    blurb:
      "Le foot du territoire : coupes, sélections et grands rendez-vous que LSEI filme pour la Ligue de Bretagne de Football et ses clubs, quelques temps forts dans l'année.",
  },
  {
    slug: 'beach',
    name: 'Beach-volley',
    sub: 'Coupe de France',
    label: 'Beach-volley',
    colorVar: 'var(--c-beach)',
    from: '#0E9BB5',
    to: '#0a4a58',
    tagBg: 'rgba(14,155,181,.14)',
    count: '15 vidéos',
    blurb:
      "Le sable, le filet et le soleil : la Coupe de France et les grands tournois de beach-volley, filmés au plus près de l'action.",
  },
  {
    slug: 'bowling',
    name: 'Bowling',
    sub: 'Compétitions & open',
    label: 'Bowling',
    colorVar: 'var(--c-bowling)',
    from: '#6E4AD1',
    to: '#38246f',
    tagBg: 'rgba(110,74,209,.14)',
    count: '9 étapes',
    blurb:
      "La piste sous tous les angles : opens, compétitions et étapes de circuit, avec le détail des strikes qui font basculer une partie.",
  },
  {
    slug: 'subbuteo',
    name: 'Subbuteo',
    sub: 'Football de table',
    label: 'Subbuteo',
    colorVar: 'var(--c-subbuteo)',
    from: '#C7305E',
    to: '#6b1830',
    tagBg: 'rgba(199,48,94,.14)',
    count: 'Coupe du Monde 2026',
    blurb:
      "Le football de table dans toute sa précision : LSEI filmera la Coupe du Monde 2026 de Subbuteo et les grands rendez-vous de la discipline, chiquenaude après chiquenaude.",
  },
];

export function getDiscipline(slug: DisciplineSlug): Discipline {
  const d = disciplines.find((x) => x.slug === slug);
  if (!d) throw new Error(`Discipline inconnue : ${slug}`);
  return d;
}

export interface Partner { name: string; logo: string; url?: string }

export const partners: Partner[] = [
  { name: 'Fédération Française de Billard', logo: '/partenaires/ffbillard.webp', url: 'https://www.ffbillard.com' },
  { name: 'Pays de Fougères Basket', logo: '/partenaires/fougeres-basket.webp', url: 'https://www.paysdefougeresbasket.fr' },
  { name: 'Ligue de Bretagne de Football', logo: '/partenaires/ligue-bretagne-foot.webp', url: 'https://footbretagne.fff.fr' },
  { name: 'Bambis Palets', logo: '/partenaires/bambis-palets.webp', url: 'https://www.facebook.com/cfipalet.35' },
  { name: 'Palet Club Lanrelas', logo: '/partenaires/palet-club-lanrelas.webp', url: 'https://www.facebook.com/PaletClubLanrelas' },
  { name: 'Bowling Promotion', logo: '/partenaires/bowling-promotion.webp', url: 'https://www.bowlingpromotiontour.com' },
  { name: 'Sport en France', logo: '/partenaires/sport-en-france.webp', url: 'https://sportenfrance.com' },
];

export interface Stat { num: string; unit?: string; label: string }

export const stats: Stat[] = [
  {
    num: '14 K',
    unit: '+',
    label: 'Abonnés sur YouTube, et une communauté qui grandit à chaque saison.',
  },
  {
    num: '7',
    label: 'Disciplines couvertes en direct comme en replay, du parquet au tapis.',
  },
];

// Informations légales. Les valeurs entre crochets sont des PLACEHOLDERS
// à remplacer par les vraies informations de l'association.
export const legal = {
  orgName: 'LSEI — Le Sport en Image',
  orgType: 'Association loi 1901',
  address: 'rue du général Audibert, 35200 Rennes',
  publisher: 'Association Le Sport en Image / Le Billard en Image',
  rna: 'N° RNA W931004350',
  host: {
    name: 'OVH SAS',
    address: '2 rue Kellermann, 59100 Roubaix, France — www.ovhcloud.com',
  },
  updated: '15 juillet 2026',
};

export const cta = {
  eyebrow: 'Votre club, à l’antenne',
  title: 'Portez haut et fort les valeurs de votre sport',
  text: 'Vous organisez une compétition, un tournoi, une rencontre ?',
  text2: 'LSEI capte, diffuse et raconte votre discipline.',
};
