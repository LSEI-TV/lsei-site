// ============================================================
//  Registre des SAISONS de la catégorie JUNIOR (Blackball — jeunes).
//  Même structure que les Masters/Femmes/Mixte (voir seasons.ts) — réutilise
//  calFrom/palmaresOf. Données importées depuis Cuescore (scripts/import-junior.mjs) :
//  2023-2024 → saison en cours. L'Junior est la catégorie d'âge : beaucoup de ses
//  joueurs jouent AUSSI en Mixte National / Masters (liens croisés sur les fiches).
//  Pour AJOUTER une saison : relancer import-junior.mjs puis l'ajouter ci-dessous.
// ============================================================
import { calFrom, palmaresOf, cal2627, type Season, type ResultsData } from './seasons';
import rj2627 from './results-junior-2026-2027.json';
import rj2526 from './results-junior-2025-2026.json';
import rj2425 from './results-junior-2024-2025.json';
import rj2324 from './results-junior-2023-2024.json';

export const COMPETITION_JUNIOR = 'Junior';

// La plus récente en premier. La saison 2026-2027 est EN COURS : elle utilise le
// calendrier commun cal2627 (partagé Masters/Femmes/Para/Mixte/Junior — un seul circuit).
export const juniorSeasons: Season[] = [
  { slug: '2026-2027', label: '2026 / 2027', short: '26/27', status: 'current', competition: COMPETITION_JUNIOR, calendar: cal2627, results: rj2627 as ResultsData },
  { slug: '2025-2026', label: '2025 / 2026', short: '25/26', status: 'past', competition: COMPETITION_JUNIOR, calendar: calFrom(rj2526 as ResultsData), results: rj2526 as ResultsData },
  { slug: '2024-2025', label: '2024 / 2025', short: '24/25', status: 'past', competition: COMPETITION_JUNIOR, calendar: calFrom(rj2425 as ResultsData), results: rj2425 as ResultsData },
  { slug: '2023-2024', label: '2023 / 2024', short: '23/24', status: 'past', competition: COMPETITION_JUNIOR, calendar: calFrom(rj2324 as ResultsData), results: rj2324 as ResultsData },
];

export const JUNIOR_DEFAULT_SEASON = '2025-2026';        // dernière saison COMPLÈTE (réf. stats)
export const JUNIOR_LANDING_SEASON = juniorSeasons[0].slug; // saison d'arrivée du hub
export const getJuniorSeasons = () => juniorSeasons;
export const getJuniorSeason = (slug: string) => juniorSeasons.find((s) => s.slug === slug);
export const juniorDefaultSeason = () => getJuniorSeason(JUNIOR_DEFAULT_SEASON)!;
// Saison « vitrine » du hub : la plus récente avec des résultats.
export const juniorShowcaseSeason = () => juniorSeasons.find((s) => s.results) ?? juniorDefaultSeason();
export const getJuniorPalmares = () => palmaresOf(juniorSeasons);
