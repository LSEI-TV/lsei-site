// ============================================================
//  Registre des SAISONS de la catégorie ESPOIR (Blackball — jeunes).
//  Même structure que les Masters/Femmes/Mixte (voir seasons.ts) — réutilise
//  calFrom/palmaresOf. Données importées depuis Cuescore (scripts/import-espoir.mjs) :
//  2023-2024 → saison en cours. L'Espoir est la catégorie d'âge : beaucoup de ses
//  joueurs jouent AUSSI en Mixte National / Masters (liens croisés sur les fiches).
//  Pour AJOUTER une saison : relancer import-espoir.mjs puis l'ajouter ci-dessous.
// ============================================================
import { calFrom, palmaresOf, cal2627, type Season, type ResultsData } from './seasons';
import re2627 from './results-espoir-2026-2027.json';
import re2526 from './results-espoir-2025-2026.json';
import re2425 from './results-espoir-2024-2025.json';
import re2324 from './results-espoir-2023-2024.json';

export const COMPETITION_ESPOIR = 'Espoir';

// La plus récente en premier. La saison 2026-2027 est EN COURS : elle utilise le
// calendrier commun cal2627 (partagé Masters/Femmes/Para/Mixte/Espoir — un seul circuit).
export const espoirSeasons: Season[] = [
  { slug: '2026-2027', label: '2026 / 2027', short: '26/27', status: 'current', competition: COMPETITION_ESPOIR, calendar: cal2627, results: re2627 as ResultsData },
  { slug: '2025-2026', label: '2025 / 2026', short: '25/26', status: 'past', competition: COMPETITION_ESPOIR, calendar: calFrom(re2526 as ResultsData), results: re2526 as ResultsData },
  { slug: '2024-2025', label: '2024 / 2025', short: '24/25', status: 'past', competition: COMPETITION_ESPOIR, calendar: calFrom(re2425 as ResultsData), results: re2425 as ResultsData },
  { slug: '2023-2024', label: '2023 / 2024', short: '23/24', status: 'past', competition: COMPETITION_ESPOIR, calendar: calFrom(re2324 as ResultsData), results: re2324 as ResultsData },
];

export const ESPOIR_DEFAULT_SEASON = '2025-2026';        // dernière saison COMPLÈTE (réf. stats)
export const ESPOIR_LANDING_SEASON = espoirSeasons[0].slug; // saison d'arrivée du hub
export const getEspoirSeasons = () => espoirSeasons;
export const getEspoirSeason = (slug: string) => espoirSeasons.find((s) => s.slug === slug);
export const espoirDefaultSeason = () => getEspoirSeason(ESPOIR_DEFAULT_SEASON)!;
// Saison « vitrine » du hub : la plus récente avec des résultats.
export const espoirShowcaseSeason = () => espoirSeasons.find((s) => s.results) ?? espoirDefaultSeason();
export const getEspoirPalmares = () => palmaresOf(espoirSeasons);
