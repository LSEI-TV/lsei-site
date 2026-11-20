// Étapes du Blackball Masters suivies en direct dans NOVA (nova.lsei.tv).
// La page de la saison affiche le tableau NOVA de la DERNIÈRE étape listée ici (bloc « en direct »
// pendant le week-end, puis « tableau final »). Les résultats officiels restent ceux de Cuescore
// (import automatique) : NOVA est un essai en parallèle.
//
// Ajouter une étape = une ligne : slug = la fin de l'adresse de la vue publique NOVA
// (https://nova.lsei.tv/live.html?t=<slug>), dates de début et de fin (AAAA-MM-JJ).
export interface NovaStage {
  season: string;   // slug de la saison sur lsei.tv, ex. '2026-2027'
  tn: string;       // ex. 'TN2'
  city: string;     // ex. 'Albi'
  slug: string;     // slug NOVA
  from: string;     // premier jour
  to: string;       // dernier jour
}

export const NOVA_MASTERS: NovaStage[] = [
  { season: '2026-2027', tn: 'TN2', city: 'Albi', slug: 'tn2-masters-albi-2026', from: '2026-11-21', to: '2026-11-22' },
];

/** Dernière étape NOVA d'une saison (ou null). */
export function novaStageOf(season: string): NovaStage | null {
  const list = NOVA_MASTERS.filter((s) => s.season === season).sort((a, b) => a.from.localeCompare(b.from));
  return list[list.length - 1] ?? null;
}
