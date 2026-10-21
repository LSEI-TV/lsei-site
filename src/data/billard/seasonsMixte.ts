// ============================================================
//  Registre des SAISONS du MIXTE NATIONAL (Blackball Mixte).
//  Même structure que les Masters/Femmes (voir seasons.ts) — réutilise
//  calFrom/palmaresOf. Données historiques importées (data-import FFB) :
//  2023-2024 → 2025-2026. Le Mixte sert aussi de « feeder » au Masters N+1.
//  Pour AJOUTER une saison : générer results-mixte-XXXX-XXXX.json puis l'ajouter.
// ============================================================
import { calFrom, palmaresOf, cal2627, type Season, type ResultsData } from './seasons';
import rm2627 from './results-mixte-2026-2027.json';
import rm2526 from './results-mixte-2025-2026.json';
import rm2425 from './results-mixte-2024-2025.json';
import rm2324 from './results-mixte-2023-2024.json';

export const COMPETITION_MIXTE = 'Mixte National';

// La plus récente en premier. La saison 2026-2027 est EN COURS : elle utilise le
// calendrier commun cal2627 (partagé Masters/Femmes/Para/Mixte) — un seul circuit.
export const mixteSeasons: Season[] = [
  { slug: '2026-2027', label: '2026 / 2027', short: '26/27', status: 'current', competition: COMPETITION_MIXTE, calendar: cal2627, results: rm2627 as ResultsData },
  { slug: '2025-2026', label: '2025 / 2026', short: '25/26', status: 'past', competition: COMPETITION_MIXTE, calendar: calFrom(rm2526 as ResultsData), results: rm2526 as ResultsData },
  { slug: '2024-2025', label: '2024 / 2025', short: '24/25', status: 'past', competition: COMPETITION_MIXTE, calendar: calFrom(rm2425 as ResultsData), results: rm2425 as ResultsData },
  { slug: '2023-2024', label: '2023 / 2024', short: '23/24', status: 'past', competition: COMPETITION_MIXTE, calendar: calFrom(rm2324 as ResultsData), results: rm2324 as ResultsData },
];

export const MIXTE_DEFAULT_SEASON = '2025-2026';        // dernière saison COMPLÈTE (réf. stats)
export const MIXTE_LANDING_SEASON = mixteSeasons[0].slug; // saison d'arrivée du hub (2025-2026)
export const getMixteSeasons = () => mixteSeasons;
export const getMixteSeason = (slug: string) => mixteSeasons.find((s) => s.slug === slug);
export const mixteDefaultSeason = () => getMixteSeason(MIXTE_DEFAULT_SEASON)!;
// Saison « vitrine » du hub : la plus récente avec des résultats.
export const mixteShowcaseSeason = () => mixteSeasons.find((s) => s.results) ?? mixteDefaultSeason();
export const getMixtePalmares = () => palmaresOf(mixteSeasons);
