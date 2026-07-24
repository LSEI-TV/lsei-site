// ============================================================
//  Registre des SAISONS de la compétition FÉMININE (Blackball Femmes).
//  Même structure que les Masters (voir seasons.ts) — réutilise calFrom/palmaresOf.
//  Pour AJOUTER une saison : générer results-femmes-XXXX-XXXX.json puis l'ajouter.
// ============================================================
import { calFrom, palmaresOf, cal2627, type Season, type ResultsData } from './seasons';
import rf2526 from './results-femmes-2025-2026.json';
import rf2425 from './results-femmes-2024-2025.json';
import rf2324 from './results-femmes-2023-2024.json';

export const COMPETITION_FEMMES = 'Blackball Femmes';

// La plus récente en premier.
export const femmesSeasons: Season[] = [
  { slug: '2026-2027', label: '2026 / 2027', short: '26/27', status: 'upcoming', competition: COMPETITION_FEMMES, calendar: cal2627 },
  { slug: '2025-2026', label: '2025 / 2026', short: '25/26', status: 'current', competition: COMPETITION_FEMMES, calendar: calFrom(rf2526 as ResultsData), results: rf2526 as ResultsData },
  { slug: '2024-2025', label: '2024 / 2025', short: '24/25', status: 'past', competition: COMPETITION_FEMMES, calendar: calFrom(rf2425 as ResultsData), results: rf2425 as ResultsData },
  { slug: '2023-2024', label: '2023 / 2024', short: '23/24', status: 'past', competition: COMPETITION_FEMMES, calendar: calFrom(rf2324 as ResultsData), results: rf2324 as ResultsData },
];

export const FEMMES_DEFAULT_SEASON = '2025-2026';        // dernière saison avec données (réf. stats)
export const FEMMES_LANDING_SEASON = femmesSeasons[0].slug; // saison d'arrivée du hub (2026-2027)
export const getFemmesSeasons = () => femmesSeasons;
export const getFemmesSeason = (slug: string) => femmesSeasons.find((s) => s.slug === slug);
export const femmesDefaultSeason = () => getFemmesSeason(FEMMES_DEFAULT_SEASON)!;
export const getFemmesPalmares = () => palmaresOf(femmesSeasons);
