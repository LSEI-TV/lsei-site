// =============================================================================
//  VIDÉOS DE CHRISTOPHE LAMBERT — https://lsei.tv/billard/donnees/videos-lambert.json
//
//  Le site de Christophe Lambert (christophelambert8pool.com, dépôt
//  c8lambert/site-lambert) lit ce fichier 2×/jour pour mettre à jour tout
//  seul ses vidéos (accueil + page Vidéos). Ajouté le 28/11/2026.
//
//  = les vidéos de channel-billard.json dont le titre contient « lambert »
//  (casse ignorée), dédoublonnées, de la plus récente à la plus ancienne.
//  Le tri fin (Killian Lambert, disciplines, saisons…) est fait côté Lambert.
//  Ne pas renommer sans adapter _maj-videos.py du site Lambert.
// =============================================================================
import type { APIRoute } from 'astro';
import chaine from '../../../data/billard/channel-billard.json';

type Video = { id: string; title: string; date: string };

export const GET: APIRoute = () => {
  const vus = new Set<string>();
  const liste = (chaine as Video[])
    .filter((v) => v.title.toLowerCase().includes('lambert'))
    .filter((v) => (vus.has(v.id) ? false : (vus.add(v.id), true)))
    .map(({ id, title, date }) => ({ id, title, date }))
    .sort((a, b) => b.date.localeCompare(a.date));
  return new Response(JSON.stringify(liste), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
