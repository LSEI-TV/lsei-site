// ============================================================
//  Registre des SAISONS de la catégorie VÉTÉRAN (Blackball — +40 ans).
//  Même structure que les Masters/Femmes/Mixte (voir seasons.ts) — réutilise
//  calFrom/palmaresOf. Données importées depuis Cuescore (scripts/import-category.mjs --cat veteran) :
//  2023-2024 → saison en cours. Beaucoup de Vétérans jouent AUSSI en Mixte National /
//  Masters (liens croisés sur les fiches).
//  Pour AJOUTER une saison : relancer import-category.mjs --cat veteran puis l'ajouter ci-dessous.
// ============================================================
import { calFrom, palmaresOf, cal2627, type Season, type ResultsData } from './seasons';
import rv2627 from './results-veteran-2026-2027.json';
import rv2526 from './results-veteran-2025-2026.json';
import rv2425 from './results-veteran-2024-2025.json';
import rv2324 from './results-veteran-2023-2024.json';

export const COMPETITION_VETERAN = 'Vétéran';

// La plus récente en premier. La saison 2026-2027 est EN COURS : elle utilise le
// calendrier commun cal2627 (partagé Masters/Femmes/Para/Mixte/Junior/Vétéran — un seul circuit).
export const veteranSeasons: Season[] = [
  { slug: '2026-2027', label: '2026 / 2027', short: '26/27', status: 'current', competition: COMPETITION_VETERAN, calendar: cal2627, results: rv2627 as ResultsData },
  { slug: '2025-2026', label: '2025 / 2026', short: '25/26', status: 'past', competition: COMPETITION_VETERAN, calendar: calFrom(rv2526 as ResultsData), results: rv2526 as ResultsData },
  { slug: '2024-2025', label: '2024 / 2025', short: '24/25', status: 'past', competition: COMPETITION_VETERAN, calendar: calFrom(rv2425 as ResultsData), results: rv2425 as ResultsData },
  { slug: '2023-2024', label: '2023 / 2024', short: '23/24', status: 'past', competition: COMPETITION_VETERAN, calendar: calFrom(rv2324 as ResultsData), results: rv2324 as ResultsData },
];

export const VETERAN_DEFAULT_SEASON = '2025-2026';        // dernière saison COMPLÈTE (réf. stats)
export const VETERAN_LANDING_SEASON = veteranSeasons[0].slug; // saison d'arrivée du hub
export const getVeteranSeasons = () => veteranSeasons;
export const getVeteranSeason = (slug: string) => veteranSeasons.find((s) => s.slug === slug);
export const veteranDefaultSeason = () => getVeteranSeason(VETERAN_DEFAULT_SEASON)!;
// Saison « vitrine » du hub : la plus récente avec des résultats.
export const veteranShowcaseSeason = () => veteranSeasons.find((s) => s.results) ?? veteranDefaultSeason();
export const getVeteranPalmares = () => palmaresOf(veteranSeasons);
