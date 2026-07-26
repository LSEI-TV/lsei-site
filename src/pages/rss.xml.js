import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site } from '../data/site';

// Flux RSS des actualités : permet de s'abonner aux articles et aux agrégateurs
// de les reprendre. Accessible sur /rss.xml
export async function GET(context) {
  const articles = (await getCollection('articles', ({ data }) => !data.draft && data.date.valueOf() <= Date.now()))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'LSEI — Actualités',
    description: site.description,
    site: context.site,
    items: articles.map((a) => ({
      title: a.data.title,
      description: a.data.excerpt,
      pubDate: a.data.date,
      link: `/actualites/${a.id}`,
      author: a.data.author,
      categories: a.data.discipline ? [a.data.discipline] : undefined,
    })),
    customData: `<language>fr-fr</language>`,
  });
}
