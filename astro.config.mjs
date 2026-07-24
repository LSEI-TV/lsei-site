import { defineConfig } from 'astro/config';
import remarkYoutube from './src/lib/remark-youtube.mjs';

// https://astro.build
export default defineConfig({
  site: 'https://lsei.tv',
  // Confort : /admin (sans slash) → page de l'interface d'administration.
  redirects: {
    '/admin': '/admin/index.html',
  },
  // Rendu statique : le site est pré-généré au build (rapide, SEO, hébergement gratuit).
  // Les données YouTube sont récupérées au moment du build (voir src/lib/youtube.ts).
  markdown: {
    // Un lien YouTube seul sur une ligne dans un article devient un lecteur vidéo.
    remarkPlugins: [remarkYoutube],
  },
});
