// ============================================================
//  Liens croisés entre compétitions pour une même PERSONNE.
//  Sur Cuescore, un joueur garde le MÊME id d'une catégorie à l'autre : un jeune
//  « Espoir » joue souvent aussi en Mixte National, puis passe au Masters avec l'âge.
//  Ce helper retrouve, pour un id donné, toutes les AUTRES compétitions où il apparaît,
//  avec le lien vers sa fiche là-bas. Utilisé par le composant CrossComp.astro sur
//  chaque fiche joueur (option « Aussi présent en … »).
//
//  Index construit UNE SEULE FOIS au chargement du module (aucun recalcul par fiche).
// ============================================================
import { getSeasons, type Season } from '../data/billard/seasons';
import { getFemmesSeasons } from '../data/billard/seasonsFemmes';
import { getMixteSeasons } from '../data/billard/seasonsMixte';
import { getEspoirSeasons } from '../data/billard/seasonsEspoir';
import { getJuniorSeasons } from '../data/billard/seasonsJunior';
import { getParaSeasons } from '../data/billard/seasonsPara';
import { getParaMvSeasons } from '../data/billard/seasonsParaMalvoyants';
import { playerSlugs } from './billardStats';

const DEFS: { root: string; label: string; seasons: () => Season[] }[] = [
  { root: '/billard', label: 'Masters', seasons: getSeasons },
  { root: '/femmes', label: 'Femmes', seasons: getFemmesSeasons },
  { root: '/mixte', label: 'Mixte National', seasons: getMixteSeasons },
  { root: '/espoir', label: 'Espoir', seasons: getEspoirSeasons },
  { root: '/junior', label: 'Junior', seasons: getJuniorSeasons },
  { root: '/para-billard', label: 'Para-billard fauteuil', seasons: getParaSeasons },
  { root: '/para-billard-malvoyants', label: 'Para-billard malvoyants', seasons: getParaMvSeasons },
];

// { root, label, slugOf, byId: id -> nb de saisons jouées dans cette compétition }
const INDEX = DEFS.map((d) => {
  const seasons = d.seasons();
  const byId = new Map<number, number>();
  for (const s of seasons) {
    if (!s.results) continue;
    for (const p of (s.results.players as any[])) {
      if (p.id == null) continue;
      byId.set(p.id, (byId.get(p.id) || 0) + 1);
    }
  }
  const { slugOf } = playerSlugs(seasons);
  return { root: d.root, label: d.label, slugOf, byId };
});

export interface CrossLink { root: string; label: string; href: string; seasons: number }

// Autres compétitions où cette personne (id) apparaît, hors compétition courante (currentRoot).
export function otherCompetitions(pid: number, currentRoot: string): CrossLink[] {
  const out: CrossLink[] = [];
  for (const c of INDEX) {
    if (c.root === currentRoot || !c.byId.has(pid)) continue;
    out.push({ root: c.root, label: c.label, href: `${c.root}/joueur/${c.slugOf(pid)}/`, seasons: c.byId.get(pid)! });
  }
  return out;
}
