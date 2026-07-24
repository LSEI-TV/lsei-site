// Couverture d'un article :
//  1. l'image renseignée manuellement, si elle existe (priorité) ;
//  2. sinon, une image de la 1ʳᵉ vidéo YouTube du corps de l'article,
//     selon le « moment » choisi (défaut = miniature haute résolution).
const YT = /(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;

export interface Cover { src: string; fallback?: string }

// Rendu du corps d'article (HTML de l'éditeur visuel) : convertit les vidéos
// YouTube (iframe de l'éditeur ou lien collé) en lecteur « clic pour lire ».
export function renderArticleBody(html: string): string {
  if (!html) return '';
  const facade = (id: string) =>
    '<div class="article-video"><button class="yt-facade" type="button" data-id="' + id +
    '" aria-label="Lire la vidéo"><img class="yt-thumb" src="https://i.ytimg.com/vi/' + id +
    '/hqdefault.jpg" alt="" loading="lazy" /><span class="yt-play" aria-hidden="true">&#9654;</span></button></div>';
  // iframe inséré par l'éditeur (Quill video)
  html = html.replace(
    /<iframe[^>]*src="[^"]*(?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/)([\w-]{11})[^"]*"[^>]*>\s*<\/iframe>/g,
    (_m, id) => facade(id),
  );
  // lien / URL YouTube seul dans un paragraphe — même enveloppé dans des balises
  // de style (<span> de couleur, <a>, <strong>, <em>, <b>, <i>, <u>).
  html = html.replace(
    /<p>\s*(?:<(?:span|a|strong|em|b|i|u)[^>]*>\s*)*https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/)|youtu\.be\/)([\w-]{11})[^\s<]*\s*(?:<\/(?:span|a|strong|em|b|i|u)>\s*)*<\/p>/g,
    (_m, id) => facade(id),
  );
  return html;
}

export function articleCover(entry: { data: { cover?: string; coverFrame?: string }; body?: string }): Cover | undefined {
  if (entry.data.cover) return { src: entry.data.cover };
  const m = entry.body?.match(YT);
  if (!m) return undefined;
  const base = `https://i.ytimg.com/vi/${m[1]}`;
  switch (entry.data.coverFrame) {
    case 'start': return { src: `${base}/hq1.jpg` };
    case 'middle': return { src: `${base}/hq2.jpg` };
    case 'end': return { src: `${base}/hq3.jpg` };
    default: // miniature principale en haute résolution, repli si indisponible
      return { src: `${base}/maxresdefault.jpg`, fallback: `${base}/hqdefault.jpg` };
  }
}
