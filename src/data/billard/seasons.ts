// ============================================================
//  Registre des SAISONS du Blackball Master.
//  Chaque saison a un calendrier ; si elle a été jouée, ses résultats
//  (classement, joueurs, matchs — depuis Cuescore).
//  → Socle des archives et de « l'histoire du billard ».
//  Pour AJOUTER une saison : générer son fichier results-XXXX-XXXX.json
//  (script depuis le lien de classement Cuescore) puis l'ajouter ci-dessous.
// ============================================================
import r2526 from './results-2025-2026.json';
import r2425 from './results-2024-2025.json';
import r2324 from './results-2023-2024.json';
import r2223 from './results-2022-2023.json';
import r2122 from './results-2021-2022.json';
import r1920 from './results-2019-2020.json';
import r1819 from './results-2018-2019.json';
import r1718 from './results-2017-2018.json';
import r1617 from './results-2016-2017.json';
import r1516 from './results-2015-2016.json';

export interface SeasonEvent {
  short: string; name: string; date: string; place: string;
  kind: 'tn' | 'coupe' | 'mondial' | 'france';
  winner?: { id: number; name: string };
}
export interface ResultsData {
  competition: string; season: string;
  tournaments: any[]; players: any[]; matches: any[];
}
export interface Season {
  slug: string; label: string; short: string;
  status: 'past' | 'current' | 'upcoming';
  competition: string;
  calendar: SeasonEvent[];
  results?: ResultsData;
}

// Calendrier dérivé des tournois joués d'une saison.
// Vainqueur : champ `winner` pré-calculé (finale jouée OU meilleur score/étape pour
// les saisons sans matchs, ex. 2015/2016) ; sinon dérivé de la finale (saisons Cuescore).
export function calFrom(results: ResultsData): SeasonEvent[] {
  return (results.tournaments as { id: string; level: string; city: string; date: string; kind?: string; winner?: { id: number; name: string } }[]).map((t) => {
    const fin = (results.matches as any[]).find(
      (m) => m.tid === t.id && ['final', 'grand final'].includes((m.round || '').toLowerCase()),
    );
    const winner = t.winner ?? (fin ? (fin.sA > fin.sB ? { id: fin.aId, name: fin.aName } : { id: fin.bId, name: fin.bName }) : undefined);
    return {
      short: t.level,
      name: t.kind === 'france' ? 'Championnat de France' : `Tournoi National ${(t.level || '').replace(/\D/g, '')}`,
      date: t.date,
      place: t.city || '—',
      kind: (t.kind as SeasonEvent['kind']) || 'tn',
      winner,
    };
  });
}

// Calendrier 2026/2027 — saisi depuis l'affiche officielle FFB (prévisionnel).
// Exporté pour être réutilisé par Femmes et Para (mêmes rendez-vous nationaux).
export const cal2627: SeasonEvent[] = [
  { short: 'TN1', name: 'Tournoi National 1', date: '2-4 oct. 2026', place: 'Fumel (47)', kind: 'tn' },
  { short: 'Mondial', name: 'Championnats du Monde', date: '21-28 oct. 2026', place: 'Londres (Angleterre)', kind: 'mondial' },
  { short: 'TN2', name: 'Tournoi National 2', date: '20-22 nov. 2026', place: 'Albi (81)', kind: 'tn' },
  { short: 'TN3', name: 'Tournoi National 3', date: 'Décembre 2026', place: 'Lieu à venir', kind: 'tn' },
  { short: 'TN4', name: 'Tournoi National 4', date: '15-17 janv. 2027', place: 'Villeneuve-sur-Lot (47)', kind: 'tn' },
  { short: 'TN5', name: 'Tournoi National 5', date: '19-21 févr. 2027', place: 'Hazebrouck (59)', kind: 'tn' },
  { short: 'TN6', name: 'Tournoi National 6', date: '12-14 mars 2027', place: 'Châtellerault (86)', kind: 'tn' },
  { short: 'TN7', name: 'Tournoi National 7', date: '9-11 avr. 2027', place: 'St Fulgent (85)', kind: 'tn' },
  { short: 'TN8 · CDF', name: 'Tournoi National 8 & Coupe de France', date: '6-9 mai 2027', place: 'Villeneuve-sur-Lot (47)', kind: 'coupe' },
  { short: 'France', name: 'Championnats de France', date: '25-27 juin 2027', place: 'Hauts-de-France, Nord (59)', kind: 'france' },
];

// La plus récente en premier.
export const seasons: Season[] = [
  { slug: '2026-2027', label: '2026 / 2027', short: '26/27', status: 'upcoming', competition: 'Blackball Master', calendar: cal2627 },
  { slug: '2025-2026', label: '2025 / 2026', short: '25/26', status: 'current', competition: 'Blackball Master', calendar: calFrom(r2526 as ResultsData), results: r2526 as ResultsData },
  { slug: '2024-2025', label: '2024 / 2025', short: '24/25', status: 'past', competition: 'Blackball Master', calendar: calFrom(r2425 as ResultsData), results: r2425 as ResultsData },
  { slug: '2023-2024', label: '2023 / 2024', short: '23/24', status: 'past', competition: 'Blackball Master', calendar: calFrom(r2324 as ResultsData), results: r2324 as ResultsData },
  { slug: '2022-2023', label: '2022 / 2023', short: '22/23', status: 'past', competition: 'Blackball Master', calendar: calFrom(r2223 as ResultsData), results: r2223 as ResultsData },
  { slug: '2021-2022', label: '2021 / 2022', short: '21/22', status: 'past', competition: 'Blackball Master', calendar: calFrom(r2122 as ResultsData), results: r2122 as ResultsData },
  { slug: '2019-2020', label: '2019 / 2020', short: '19/20', status: 'past', competition: 'Blackball Master', calendar: calFrom(r1920 as ResultsData), results: r1920 as ResultsData },
  { slug: '2018-2019', label: '2018 / 2019', short: '18/19', status: 'past', competition: 'Blackball Master', calendar: calFrom(r1819 as ResultsData), results: r1819 as ResultsData },
  { slug: '2017-2018', label: '2017 / 2018', short: '17/18', status: 'past', competition: 'Blackball Master', calendar: calFrom(r1718 as ResultsData), results: r1718 as ResultsData },
  { slug: '2016-2017', label: '2016 / 2017', short: '16/17', status: 'past', competition: 'Blackball Master', calendar: calFrom(r1617 as ResultsData), results: r1617 as ResultsData },
  { slug: '2015-2016', label: '2015 / 2016', short: '15/16', status: 'past', competition: 'Blackball Master', calendar: calFrom(r1516 as ResultsData), results: r1516 as ResultsData },
];

// Saison par défaut = la plus récente qui a des résultats.
// Palmarès : pour chaque saison jouée, le champion de saison (points TN) et
// le champion de France (vainqueur de la finale du Championnat de France).
export function palmaresOf(list: Season[]) {
  return list.filter((s) => s.results).map((s) => {
    const R = s.results!;
    const champ = (R.players as any[]).find((p) => p.rank === 1) || R.players[0];
    let cdf: { id: number; name: string } | null = null;
    const cdfT = (R.tournaments as any[]).find((t) => t.kind === 'france');
    if (cdfT) {
      const fin = (R.matches as any[]).find((m) => m.tid === cdfT.id && (m.round || '').toLowerCase() === 'final');
      if (fin) cdf = fin.sA > fin.sB ? { id: fin.aId, name: fin.aName } : { id: fin.bId, name: fin.bName };
      else if (cdfT.winner) cdf = cdfT.winner;
    }
    return { slug: s.slug, label: s.label, champ: { id: (champ as any).id, name: (champ as any).name, points: (champ as any).points }, cdf };
  });
}

export function getPalmares() { return palmaresOf(seasons); }

export const DEFAULT_SEASON = '2025-2026';       // saison de RÉFÉRENCE (dernière avec données) — sert de base aux stats
export const LANDING_SEASON = seasons[0].slug;   // saison d'ARRIVÉE du hub (la plus récente, ex. 2026-2027)
export const getSeasons = () => seasons;
export const getSeason = (slug: string) => seasons.find((s) => s.slug === slug);
export const defaultSeason = () => getSeason(DEFAULT_SEASON)!;
