import type { APIRoute } from 'astro';
import { disciplines } from '../../../data/site';
import { renderDisciplineCard } from '../../../lib/ogCard';

// Couleur (hex) de chaque sport — miroir des variables --c-* de global.css
// (l'endpoint ne peut pas lire les variables CSS, on les fige ici).
const COLOR: Record<string, string> = {
  basket: '#E06A24', billard: '#1E7BE0', palets: '#D2A521', football: '#2E9E52',
  beach: '#0E9BB5', bowling: '#6E4AD1', subbuteo: '#C7305E',
};

// Une image de partage par sport filmé par LSEI.
export function getStaticPaths() {
  return disciplines.map((d) => ({ params: { slug: d.slug }, props: { d } }));
}

export const GET: APIRoute = async ({ props }) => {
  const d = (props as { d: { slug: string; name: string; sub?: string } }).d;
  const jpg = await renderDisciplineCard(d.name, d.sub ?? '', COLOR[d.slug] ?? '#1E7BE0');
  return new Response(new Uint8Array(jpg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
