import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Collection « articles » (actualités) — fichiers Markdown dans src/content/articles/
// Éditables plus tard via l'interface d'admin (/admin).
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string(),
    // couverture : URL d'image (ou chemin /uploads/… après upload via l'admin)
    cover: z.string().optional(),
    // si pas de couverture : quelle image de la vidéo utiliser
    coverFrame: z.enum(['default', 'start', 'middle', 'end']).default('default'),
    // discipline liée (optionnel) — pour taguer/afficher sur la page du sport
    discipline: z.enum(['basket', 'billard', 'palets', 'football', 'beach', 'bowling', 'subbuteo']).optional(),
    author: z.string().default('La rédaction LSEI'),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
