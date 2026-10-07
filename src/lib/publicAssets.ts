// Vérifie qu'un asset existe dans /public au build (pour ne précharger que des
// fichiers réellement présents, jamais un 404). Utilisé pour le préchargement LCP.
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function assetExists(publicPath: string | undefined | null): boolean {
  if (!publicPath) return false;
  return existsSync(join('public', publicPath.replace(/^\//, '')));
}

// Image affichable : soit une URL distante (http/https, ex. miniature YouTube),
// soit un fichier local réellement présent dans /public. Utilisé pour les posts
// réseaux dont l'image peut être une miniature YouTube (auto) ou un visuel local.
export function imgOk(src: string | undefined | null): boolean {
  if (!src) return false;
  if (/^https?:\/\//.test(src)) return true;
  return assetExists(src);
}

// URL de l'asset avec un « cache-bust » basé sur la taille du fichier : quand l'image
// change (nouveau contenu → nouvelle taille), l'URL change → Cloudflare/navigateur
// servent la nouvelle version sans purge manuelle. Renvoie le chemin tel quel si absent.
export function assetUrl(publicPath: string): string {
  try { return `${publicPath}?v=${statSync(join('public', publicPath.replace(/^\//, ''))).size}`; }
  catch { return publicPath; }
}
