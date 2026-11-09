import type { APIRoute } from 'astro';
import { renderSiteCard } from '../../lib/ogCard';

// Image de partage de la page d'accueil (carte « marque » LSEI).
export const GET: APIRoute = async () => {
  const jpg = await renderSiteCard('LSEI', 'Le sport en image · Billard, basket, palets, football & plus');
  return new Response(new Uint8Array(jpg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
