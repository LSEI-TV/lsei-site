// =============================================================================
//  RÉSULTATS BLACKBALL MASTERS EN JSON — https://lsei.tv/billard/donnees/
//  Une adresse par saison : /billard/donnees/results-2026-2027.json, etc.
//
//  Pourquoi : le site de Christophe Lambert (christophelambert8pool.com,
//  dépôt c8lambert/site-lambert) lit ces fichiers 2×/jour pour mettre à
//  jour tout seul son palmarès et sa page Résultats après chaque tournoi.
//  Comme refresh-data.yml rebuild lsei.tv 2×/jour, ces fichiers suivent
//  Cuescore. Ajouté le 28/11/2026.
//
//  Ce sont les MÊMES fichiers que src/data/billard/results-AAAA-AAAA.json
//  (Masters uniquement), servis tels quels : aucune donnée nouvelle n'est
//  rendue publique, tout est déjà affiché sur les pages joueur de lsei.tv.
//  Ne pas renommer ce dossier sans prévenir : le site Lambert en dépend.
// =============================================================================
import type { APIRoute, GetStaticPaths } from 'astro';
import { saisonsMasters, donneesSaison } from '../../../lib/donneesMasters';

export const getStaticPaths = (() =>
  saisonsMasters.map((nom) => ({ params: { fichier: nom } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) =>
  new Response(JSON.stringify(donneesSaison(params.fichier!)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
