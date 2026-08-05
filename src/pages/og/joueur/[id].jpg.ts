import type { APIRoute } from 'astro';
import { playerPaths, playerNamePhoto } from '../../../lib/ogPlayers';
import { renderPlayerCard } from '../../../lib/ogCard';

export function getStaticPaths() {
  return playerPaths().map((p) => ({ params: p.params, props: p.props }));
}

export const GET: APIRoute = async ({ props }) => {
  const { pid, nc } = props as { pid: number; nc?: any };
  const { name, photo } = playerNamePhoto(pid, nc);
  const jpg = await renderPlayerCard(name, photo);
  return new Response(new Uint8Array(jpg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
