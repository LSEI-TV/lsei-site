// Liste centralisée des joueurs (chemins + nom + photo) — source unique partagée
// par les fiches joueur (billard / femmes / para / para-malvoyants) ET l'endpoint
// image de partage (/og/joueur/[id].jpg). Évite toute divergence entre les deux.
import { getSeasons } from '../data/billard/seasons';
import { getFemmesSeasons } from '../data/billard/seasonsFemmes';
import { getParaSeasons } from '../data/billard/seasonsPara';
import { getParaMvSeasons } from '../data/billard/seasonsParaMalvoyants';
import { playerSlugs, photoOf } from './billardStats';
import rmixte2526 from '../data/billard/results-mixte-2025-2026.json';
import rmixte2425 from '../data/billard/results-mixte-2024-2025.json';
import rmixte2324 from '../data/billard/results-mixte-2023-2024.json';

// Toutes les catégories partagent le même endpoint OG (les id/slug Cuescore sont uniques).
const CATEGORIES = [getSeasons, getFemmesSeasons, getParaSeasons, getParaMvSeasons];

// Reproduit EXACTEMENT les chemins générés par les fiches joueur, toutes catégories.
export function playerPaths(): { params: { id: string }; props: { pid: number; nc?: any } }[] {
  const paths: { params: { id: string }; props: { pid: number; nc?: any } }[] = [];
  const seen = new Set<string>(); // params déjà ajoutés (dédoublonnage global)
  const add = (id: string, pid: number, nc?: any) => {
    if (seen.has(id)) return;
    seen.add(id);
    paths.push({ params: { id }, props: nc ? { pid, nc } : { pid } });
  };

  // --- BILLARD (Masters) : entrées + promus « nouveau » (nc), à l'identique de la fiche. ---
  const { entries } = playerSlugs(getSeasons());
  const used = new Set<string>();
  for (const { id, slug } of entries) { used.add(slug); add(slug, id); add(String(id), id); }

  const MIXTE: Record<string, any> = { '2025-2026': rmixte2526, '2024-2025': rmixte2425, '2023-2024': rmixte2324 };
  const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const knownIds = new Set<number>();
  const knownNames = new Set<string>();
  for (const s of getSeasons()) if (s.results) for (const p of s.results.players as any[]) { knownIds.add(p.id); knownNames.add(norm(p.name)); }
  const slugify = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const s of getSeasons()) {
    if (s.results) continue;
    const [ya, yb] = s.slug.split('-').map(Number);
    const feeder = MIXTE[`${ya - 1}-${yb - 1}`];
    if (!feeder) continue;
    const promoted = (feeder.players as any[]).slice().sort((a, b) => a.rank - b.rank).slice(0, 8).filter((p) => !knownIds.has(p.id) && !knownNames.has(norm(p.name)));
    for (const p of promoted) {
      const nc = { id: p.id, name: p.name, mastersSlug: s.slug };
      let base = slugify(p.name) || String(p.id), slug = base, k = 2;
      while (used.has(slug)) slug = `${base}-${k++}`;
      used.add(slug);
      add(slug, p.id, nc); add(String(p.id), p.id, nc);
    }
  }

  // --- Femmes, Para-billard, Para-malvoyants : mêmes slugs que leurs fiches. ---
  for (const getCat of [getFemmesSeasons, getParaSeasons, getParaMvSeasons]) {
    for (const { id, slug } of playerSlugs(getCat()).entries) { add(slug, id); add(String(id), id); }
  }

  return paths;
}

// Nom + photo + sous-titre (catégorie) d'un joueur, pour la carte de partage.
const CAT_LABEL: [() => any[], string][] = [
  [getSeasons, 'Blackball Master'],
  [getFemmesSeasons, 'Blackball Femmes'],
  [getParaSeasons, 'Para-billard fauteuil'],
  [getParaMvSeasons, 'Para-billard malvoyants'],
];
export function playerNamePhoto(pid: number, nc?: any): { name: string; photo: string | null; subtitle: string } {
  if (nc) return { name: nc.name, photo: photoOf({ name: nc.name } as any, nc.mastersSlug), subtitle: 'Blackball Master · Fiche carrière' };
  for (const [getCat, label] of CAT_LABEL) {
    for (const s of getCat()) {
      if (!s.results) continue;
      const p = (s.results.players as any[]).find((x) => x.id === pid);
      if (p) return { name: p.name, photo: photoOf(p, s.slug), subtitle: `${label} · Fiche carrière` };
    }
  }
  return { name: String(pid), photo: null, subtitle: 'Fiche carrière' };
}
