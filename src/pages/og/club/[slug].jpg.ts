import type { APIRoute } from 'astro';
import { nmClubs, nmClubBy, clubHasSite, NM1_LABEL, NM1_POOL } from '../../../data/basket';
import { renderClubCard } from '../../../lib/ogCard';

// Une image de partage par club de basket (mêmes clubs que les mini-sites /clubs/<slug>).
export function getStaticPaths() {
  return nmClubs.filter((c) => clubHasSite(c.slug)).map((c) => ({ params: { slug: c.slug }, props: { slug: c.slug } }));
}

export const GET: APIRoute = async ({ props }) => {
  const c = nmClubBy((props as { slug: string }).slug)!;
  const jpg = await renderClubCard(c.name, `Basket · ${NM1_LABEL} · ${NM1_POOL}`, c.city, c.logo ?? null, c.color);
  return new Response(new Uint8Array(jpg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
