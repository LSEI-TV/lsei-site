// Fiches CLUB — pour les pages « vitrine club » (ex. /disciplines/basket = Pays de
// Fougères Basket). Ajouter un club filmé = ajouter une fiche ici + déposer sa photo
// dans public/clubs/<slug>/hero-<slug>.webp. La page éditoriale se génère toute seule.
import type { DisciplineSlug } from './site';

export interface Club {
  slug: string;
  name: string;                 // nom affiché, avec accents (« Pays de Fougères Basket »)
  discipline: DisciplineSlug;   // discipline rattachée (ses vidéos alimentent la vidéothèque)
  kicker: string;               // sur-titre du hero (« Basket · Nationale 1 »)
  competition: string;          // libellé compétition (« Nationale 1 · NM1 »)
  url: string;                  // site officiel du club
  logo: string;                 // /partenaires/xxx.webp
  hero: string;                 // /clubs/<slug>/hero-<slug>.webp
  blurb: string;                // phrase courte sous le hero
  intro: string[];              // paragraphes de présentation (balises <b> autorisées)
  highlight: { num: string; label: string }; // 3ᵉ chiffre (fait marquant du club)
}

export const clubs: Club[] = [
  {
    slug: 'fougeres',
    name: 'Pays de Fougères Basket',
    discipline: 'basket',
    kicker: 'Basket · Nationale 1',
    competition: 'Nationale 1 · NM1',
    url: 'https://www.paysdefougeresbasket.fr',
    logo: '/partenaires/fougeres-basket.webp',
    hero: '/clubs/fougeres/hero-fougeres.webp',
    blurb: 'Les Blues Brothers, en NM1 — filmés et diffusés par LSEI depuis plusieurs saisons.',
    intro: [
      "Né en 2009 de la fusion de trois clubs fougerais, le <b>Pays de Fougères Basket</b> s'est imposé comme l'un des piliers du basket d'Ille-et-Vilaine et de Bretagne. Son équipe fanion, les <b>Blues Brothers</b>, évolue au 3ᵉ échelon national, en <b>Nationale 1</b>, et brille aussi sur les tournois (triplé au Felger en 2022, 2023 et 2024).",
      "Fidèle à sa devise « <b>Grandir ensemble</b> », le club se veut autant un acteur sportif de haut niveau qu'un vrai créateur de lien social, du mini-basket aux seniors.",
      "<b>LSEI</b> filme et diffuse les matchs du club depuis plusieurs saisons — toutes les rencontres sont à revoir saison par saison ci-dessous.",
    ],
    highlight: { num: '3', label: 'Titres Le Felger' },
  },
];

export const clubForDiscipline = (slug: DisciplineSlug): Club | undefined =>
  clubs.find((c) => c.discipline === slug);
