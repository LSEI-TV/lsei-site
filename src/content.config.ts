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

// Collection « social » (publications réseaux) — posts Facebook/Instagram choisis à
// la main. AUCUN script tiers : juste une image + une légende + le lien vers le post.
// → cohérent avec « aucune donnée collectée ». Éditable via /admin.
const social = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/social' }),
  schema: z.object({
    platform: z.enum(['facebook', 'instagram']),
    date: z.coerce.date(),
    caption: z.string(),
    // lien vers la publication d'origine (Facebook/Instagram)
    link: z.string().url(),
    // image du post (téléversée via l'admin) — optionnelle
    image: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// Collection « événements » — affiches d'événements à mettre en avant (bandeau d'accueil).
// Éditable via /admin. Le bandeau disparaît automatiquement après la date de l'événement.
const evenements = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/evenements' }),
  schema: z.object({
    title: z.string(),
    image: z.string(),            // affiche / bannière (large, ex. 1760×334)
    date: z.coerce.date(),        // date de l'événement — le bandeau disparaît après
    link: z.string().optional(),  // lien optionnel (direct YouTube, billetterie, page info…)
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles, social, evenements };
