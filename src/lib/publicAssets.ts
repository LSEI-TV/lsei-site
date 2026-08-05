// Vérifie qu'un asset existe dans /public au build (pour ne précharger que des
// fichiers réellement présents, jamais un 404). Utilisé pour le préchargement LCP.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function assetExists(publicPath: string | undefined | null): boolean {
  if (!publicPath) return false;
  return existsSync(join('public', publicPath.replace(/^\//, '')));
}
