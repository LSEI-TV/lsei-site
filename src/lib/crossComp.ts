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
import { getVeteranSeasons } from '../data/billard/seasonsVeteran';
import { getPrestigeSeasons } from '../data/billard/seasonsPrestige';
import { getParaSeasons } from '../data/billard/seasonsPara';
import { getParaMvSeasons } from '../data/billard/seasonsParaMalvoyants';
import { playerSlugs } from './billardStats';

// `label` = libellé court (bande « Aussi présent en ») ; `epi` = libellé pour l'épithète du héros ;
// `color` = couleur propre à la compétition (miroir des accents des cartes du hub Blackball) —
// utilisée UNIQUEMENT pour le badge de catégorie, jamais pour les accents pilotés par le maillot.
const DEFS: { root: string; label: string; epi: string; color: string; seasons: () => Season[] }[] = [
  { root: '/billard', label: 'Masters', epi: 'Blackball Master', color: '#7C4DD6', seasons: getSeasons },
  { root: '/femmes', label: 'Femmes', epi: 'Blackball Femmes', color: '#F2B90A', seasons: getFemmesSeasons },
  { root: '/mixte', label: 'Mixte National', epi: 'Mixte National', color: '#D6397E', seasons: getMixteSeasons },
  { root: '/espoir', label: 'Espoir', epi: 'Espoir', color: '#2E9E5B', seasons: getEspoirSeasons },
  { root: '/junior', label: 'Junior', epi: 'Junior', color: '#0EA5C4', seasons: getJuniorSeasons },
  { root: '/veteran', label: 'Vétéran', epi: 'Vétéran', color: '#3457D5', seasons: getVeteranSeasons },
  { root: '/prestige', label: 'Prestige Vétéran', epi: 'Prestige Vétéran', color: '#C79A2E', seasons: getPrestigeSeasons },
  { root: '/para-billard', label: 'Para-billard fauteuil', epi: 'Para-billard fauteuil', color: '#14A38B', seasons: getParaSeasons },
  { root: '/para-billard-malvoyants', label: 'Para-billard malvoyants', epi: 'Para-billard malvoyants', color: '#E0563B', seasons: getParaMvSeasons },
];

// { root, label, epi, slugOf, byId: id -> nb de saisons jouées, curRank: id -> rang la saison EN COURS }
const INDEX = DEFS.map((d) => {
  const seasons = d.seasons();
  const byId = new Map<number, number>();
  const curRank = new Map<number, number | null>();
  const cur = seasons.find((s) => s.status === 'current' && s.results);
  if (cur) for (const p of (cur.results!.players as any[])) if (p.id != null) curRank.set(p.id, p.rank ?? null);
  for (const s of seasons) {
    if (!s.results) continue;
    for (const p of (s.results.players as any[])) {
      if (p.id == null) continue;
      byId.set(p.id, (byId.get(p.id) || 0) + 1);
    }
  }
  const { slugOf } = playerSlugs(seasons);
  return { root: d.root, label: d.label, epi: d.epi, color: d.color, slugOf, byId, curRank };
});

// Libellé + couleur propres à une compétition (pour le badge « vous êtes sur telle catégorie »).
export function categoryTag(root: string): { epi: string; color: string } {
  const c = INDEX.find((x) => x.root === root);
  return { epi: c?.epi ?? 'Billard', color: c?.color ?? '#1E7BE0' };
}

export interface CatInfo { root: string; epi: string; color: string; rank: number | null; text: string; current: boolean }
// Catégories de la saison en cours, la catégorie COURANTE (currentRoot) d'abord et marquée.
// `text` = libellé prêt à afficher (épi + rang, ex. « Mixte National 25ᵉ »).
export function currentCategoriesInfo(pid: number, currentRoot: string): CatInfo[] {
  const list: CatInfo[] = INDEX
    .filter((c) => c.curRank.has(pid))
    .map((c) => {
      const rank = c.curRank.get(pid) ?? null;
      return { root: c.root, epi: c.epi, color: c.color, rank, text: rank != null ? `${c.epi} ${ord(rank)}` : c.epi, current: c.root === currentRoot };
    });
  list.sort((a, b) => (a.current === b.current ? 0 : a.current ? -1 : 1)); // la courante en premier
  return list;
}

// Ordinal français court : 1 -> « 1er », n -> « n^e ».
const ord = (n: number) => (n === 1 ? '1ᵉʳ' : `${n}ᵉ`);

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

// Catégories où CETTE personne (id) est active la saison EN COURS, avec son RANG en cours,
// pour l'épithète du héros (ex. ['Blackball Master 10ᵉ', 'Espoir 6ᵉ']). Ordre fixe
// Masters → … → Para. Le rang suit automatiquement les mises à jour du classement (auto-refresh).
// Vide si le joueur n'a aucune catégorie en cours (ne figure que dans des saisons passées).
export function currentCategoriesEpi(pid: number): string[] {
  return INDEX
    .filter((c) => c.curRank.has(pid))
    .map((c) => { const r = c.curRank.get(pid); return r != null ? `${c.epi} ${ord(r)}` : c.epi; });
}
