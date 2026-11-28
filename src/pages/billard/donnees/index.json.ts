// Liste des saisons Masters publiées en JSON (voir [fichier].json.ts).
// https://lsei.tv/billard/donnees/index.json  →  ["results-2015-2016", …]
import type { APIRoute } from 'astro';
import { saisonsMasters } from '../../../lib/donneesMasters';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(saisonsMasters), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
