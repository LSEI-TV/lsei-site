// ============================================================
//  Registre des SAISONS du PARA-BILLARD MALVOYANTS.
//  Compétition à ÉVÉNEMENT UNIQUE : le 1er Championnat de France de para-billard
//  malvoyants (Les Herbiers, 2026) — première de l'histoire du blackball en France.
//  Aucun circuit de Tournois Nationaux (contrairement aux Masters/Femmes/Fauteuil).
// ============================================================
import { calFrom, palmaresOf, type Season, type ResultsData } from './seasons';
import rmv2526 from './results-paramv-2025-2026.json';

export const COMPETITION_PARAMV = 'Blackball Para-billard malvoyants';

// La 1re édition (2025/2026) EST le Championnat de France officiel — pas une promotion.
export const PARAMV_CDF_FROM_SEASON = '2025-2026';

export const paraMvSeasons: Season[] = [
  { slug: '2025-2026', label: '2025 / 2026', short: '25/26', status: 'current', competition: COMPETITION_PARAMV, calendar: calFrom(rmv2526 as ResultsData), results: rmv2526 as ResultsData },
];

export const PARAMV_DEFAULT_SEASON = '2025-2026';          // dernière saison avec données (réf. stats)
export const PARAMV_LANDING_SEASON = paraMvSeasons[0].slug; // saison d'arrivée du hub
export const getParaMvSeasons = () => paraMvSeasons;
export const getParaMvSeason = (slug: string) => paraMvSeasons.find((s) => s.slug === slug);
export const paraMvDefaultSeason = () => getParaMvSeason(PARAMV_DEFAULT_SEASON)!;

// Palmarès malvoyants : le CdF 2025/2026 est officiel (jamais « promotion »).
export const getParaMvPalmares = () =>
  palmaresOf(paraMvSeasons).map((p) => ({ ...p, cdfPromo: false }));
