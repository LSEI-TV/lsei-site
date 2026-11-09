// ============================================================
//  Registre des SAISONS de la catégorie PRESTIGE VÉTÉRAN (Blackball).
//  Catégorie NEUVE créée par la FFB en 2026-2027 : elle n'a qu'UNE saison (en cours),
//  pas d'antériorité sur Cuescore (contrairement au Vétéran qui remonte à 2023-2024).
//  Données importées depuis Cuescore (scripts/import-category.mjs --cat prestige).
//  Pour AJOUTER une saison : relancer import-category.mjs --cat prestige puis l'ajouter ci-dessous.
// ============================================================
import { cal2627, palmaresOf, type Season, type ResultsData } from './seasons';
import rp2627 from './results-prestige-2026-2027.json';

export const COMPETITION_PRESTIGE = 'Prestige Vétéran';

// Une seule saison, EN COURS : elle utilise le calendrier commun cal2627.
export const prestigeSeasons: Season[] = [
  { slug: '2026-2027', label: '2026 / 2027', short: '26/27', status: 'current', competition: COMPETITION_PRESTIGE, calendar: cal2627, results: rp2627 as ResultsData },
];

export const PRESTIGE_DEFAULT_SEASON = '2026-2027';        // la seule saison (en cours)
export const PRESTIGE_LANDING_SEASON = prestigeSeasons[0].slug; // saison d'arrivée du hub
export const getPrestigeSeasons = () => prestigeSeasons;
export const getPrestigeSeason = (slug: string) => prestigeSeasons.find((s) => s.slug === slug);
export const prestigeDefaultSeason = () => getPrestigeSeason(PRESTIGE_DEFAULT_SEASON)!;
// Saison « vitrine » du hub : la plus récente avec des résultats.
export const prestigeShowcaseSeason = () => prestigeSeasons.find((s) => s.results) ?? prestigeDefaultSeason();
export const getPrestigePalmares = () => palmaresOf(prestigeSeasons);
