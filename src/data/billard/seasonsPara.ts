// ============================================================
//  Registre des SAISONS du PARA-BILLARD (Blackball Para-billard / Handi Billard).
//  Même structure que Masters/Femmes — réutilise calFrom/palmaresOf.
// ============================================================
import { calFrom, palmaresOf, cal2627, type Season, type ResultsData, type SeasonEvent } from './seasons';
import rp2526 from './results-para-2025-2026.json';
import rp2425 from './results-para-2024-2025.json';
import rp2324 from './results-para-2023-2024.json';

export const COMPETITION_PARA = 'Blackball Para-billard';

// Le Championnat de France de para-billard RECONNU par les instances ne commence
// qu'en 2025/2026. Avant, les « CHF » n'étaient que des tournois de promotion
// organisés en marge des autres catégories du championnat → ni titre, ni CdF officiel.
export const PARA_CDF_FROM_SEASON = '2025-2026';

// Calendrier para : avant 2025/2026, on relabelle le « Championnat de France » en
// tournoi de promotion pour qu'aucune vue ne le présente comme le CdF officiel.
function paraCal(results: ResultsData, slug: string): SeasonEvent[] {
  const cal = calFrom(results);
  if (slug >= PARA_CDF_FROM_SEASON) return cal;
  return cal.map((e) =>
    e.kind === 'france'
      ? { ...e, kind: 'tn', short: 'CHF · promotion', name: 'Championnat de France (promotion)' }
      : e,
  );
}

export const paraSeasons: Season[] = [
  { slug: '2026-2027', label: '2026 / 2027', short: '26/27', status: 'upcoming', competition: COMPETITION_PARA, calendar: cal2627 },
  { slug: '2025-2026', label: '2025 / 2026', short: '25/26', status: 'current', competition: COMPETITION_PARA, calendar: paraCal(rp2526 as ResultsData, '2025-2026'), results: rp2526 as ResultsData },
  { slug: '2024-2025', label: '2024 / 2025', short: '24/25', status: 'past', competition: COMPETITION_PARA, calendar: paraCal(rp2425 as ResultsData, '2024-2025'), results: rp2425 as ResultsData },
  { slug: '2023-2024', label: '2023 / 2024', short: '23/24', status: 'past', competition: COMPETITION_PARA, calendar: paraCal(rp2324 as ResultsData, '2023-2024'), results: rp2324 as ResultsData },
];

export const PARA_DEFAULT_SEASON = '2025-2026';          // dernière saison avec données (réf. stats)
export const PARA_LANDING_SEASON = paraSeasons[0].slug;  // saison d'arrivée du hub (2026-2027)
export const getParaSeasons = () => paraSeasons;
export const getParaSeason = (slug: string) => paraSeasons.find((s) => s.slug === slug);
export const paraDefaultSeason = () => getParaSeason(PARA_DEFAULT_SEASON)!;

// Palmarès para : le CdF est conservé, mais marqué « promotion » (cdfPromo) pour les
// saisons antérieures à la 1re édition officielle (2025/2026). La fiche l'affiche alors
// comme « Champion de France · promotion », distinct et non compté dans les titres.
export const getParaPalmares = () =>
  palmaresOf(paraSeasons).map((p) => ({ ...p, cdfPromo: p.slug < PARA_CDF_FROM_SEASON }));
