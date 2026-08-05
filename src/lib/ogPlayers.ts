// Liste centralisée des joueurs (chemins + nom + photo) — source unique partagée
// par la fiche joueur (/billard/joueur/[id]) ET l'endpoint image de partage
// (/og/joueur/[id].jpg). Évite toute divergence entre les deux.
import { getSeasons } from '../data/billard/seasons';
import { playerSlugs, photoOf } from './billardStats';
import rmixte2526 from '../data/billard/results-mixte-2025-2026.json';
import rmixte2425 from '../data/billard/results-mixte-2024-2025.json';
import rmixte2324 from '../data/billard/results-mixte-2023-2024.json';

// Reproduit EXACTEMENT les chemins générés par la fiche joueur.
export function playerPaths(): { params: { id: string }; props: { pid: number; nc?: any } }[] {
  const { entries } = playerSlugs(getSeasons());
  const paths: { params: { id: string }; props: { pid: number; nc?: any } }[] = [];
  const used = new Set<string>();
  for (const { id, slug } of entries) {
    used.add(slug);
    paths.push({ params: { id: slug }, props: { pid: id } });
    paths.push({ params: { id: String(id) }, props: { pid: id } });
  }

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
      paths.push({ params: { id: slug }, props: { pid: p.id, nc } });
      paths.push({ params: { id: String(p.id) }, props: { pid: p.id, nc } });
    }
  }
  return paths;
}

// Nom + photo d'un joueur, pour la carte de partage.
export function playerNamePhoto(pid: number, nc?: any): { name: string; photo: string | null } {
  if (nc) return { name: nc.name, photo: photoOf({ name: nc.name } as any, nc.mastersSlug) };
  for (const s of getSeasons()) {
    if (!s.results) continue;
    const p = (s.results.players as any[]).find((x) => x.id === pid);
    if (p) return { name: p.name, photo: photoOf(p, s.slug) };
  }
  return { name: String(pid), photo: null };
}
