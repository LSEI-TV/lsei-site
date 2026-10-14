import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkYoutube from './src/lib/remark-youtube.mjs';

// https://astro.build
export default defineConfig({
  site: 'https://lsei.tv',
  // Génère sitemap-index.xml + sitemap-0.xml au build (pour le référencement Google).
  // On exclut l'interface d'admin /admin.
  integrations: [
    sitemap({
      // Exclut /admin et les URL JOUEUR numériques (anciens liens) : chaque joueur n'a
      // qu'UNE URL canonique dans le sitemap — la version lisible (slug) — pour éviter
      // le contenu dupliqué. Les liens numériques restent valides (canonical → slug).
      filter: (page) => !page.includes('/admin') && !/\/joueur\/\d+\/?$/.test(page),
    }),
  ],
  // Rendu statique : le site est pré-généré au build (rapide, SEO, hébergement gratuit).
  // Les données YouTube sont récupérées au moment du build (voir src/lib/youtube.ts).
  markdown: {
    // Un lien YouTube seul sur une ligne dans un article devient un lecteur vidéo.
    remarkPlugins: [remarkYoutube],
  },
});
