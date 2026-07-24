import { visit } from 'unist-util-visit';

// Transforme un paragraphe contenant un lien YouTube en lecteur vidéo
// « clic pour lire » (façade + iframe au clic, RGPD-friendly).
// Robuste : fonctionne même s'il y a du texte autour du lien (ex. « ▶ Vidéo : … »).
const YT = /(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;

function paragraphText(node) {
  let s = '';
  for (const c of node.children || []) {
    if (c.type === 'text' || c.type === 'inlineCode') s += c.value;
    else if (c.type === 'link') s += ' ' + c.url;
    else if (c.children) s += paragraphText(c);
  }
  return s;
}

export default function remarkYoutube() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index === undefined) return;
      const m = paragraphText(node).match(YT);
      if (!m) return;
      const id = m[1];
      const html =
        '<div class="article-video">' +
        '<button class="yt-facade" type="button" data-id="' + id + '" aria-label="Lire la vidéo">' +
        '<img class="yt-thumb" src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy" />' +
        '<span class="yt-play" aria-hidden="true">&#9654;</span>' +
        '</button></div>';
      parent.children[index] = { type: 'html', value: html };
    });
  };
}
