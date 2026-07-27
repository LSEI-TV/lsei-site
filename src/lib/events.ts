// ÉVÉNEMENTS du bandeau « À l'affiche » (page d'accueil).
// Deux sources, fusionnées :
//   1) La collection « evenements » (fiches .md, éditables via /admin).
//   2) Le dossier public/evenements/ : il suffit d'y DÉPOSER une affiche bien
//      nommée, aucune fiche à écrire. Nommage :
//        « AAAA-MM-JJ - AAAA-MM-JJ - Titre.webp »  (début d'affichage - fin - titre)
//        « AAAA-MM-JJ - Titre.webp »               (affiché tout de suite - fin - titre)
//      La 1re date = quand le bandeau APPARAÎT, la 2e = quand il DISPARAÎT.
import { getCollection } from 'astro:content';
import { readdirSync } from 'node:fs';

const DEFAULT_LINK = 'https://www.youtube.com/@LSEIWebTvSport';
const DAY = 86400000;

export interface EventItem {
  title: string;
  image: string;
  link: string | null;
  start: number | null; // timestamp d'apparition (null = tout de suite)
  end: number;          // timestamp de retrait
}

// Liste récursivement les images de public/evenements/ (racine ET sous-dossiers de
// saison, ex. 2026-2027/). Renvoie le nom du fichier + son chemin relatif au dossier.
function listImages(sub = ''): { file: string; rel: string }[] {
  const dir = 'public/evenements' + (sub ? '/' + sub : '');
  let entries: import('node:fs').Dirent[];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  const out: { file: string; rel: string }[] = [];
  for (const e of entries) {
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...listImages(rel));            // sous-dossier de saison
    else if (/\.(webp|jpe?g|png)$/i.test(e.name)) out.push({ file: e.name, rel });
  }
  return out;
}

// Événements « dépôt de fichier » : tout est déduit du NOM du fichier (dates + titre).
// Le sous-dossier de saison ne sert qu'au rangement/archivage — il n'influence pas
// l'affichage (ce sont les dates du nom qui pilotent apparition et retrait).
function fromFolder(): EventItem[] {
  const out: EventItem[] = [];
  for (const { file, rel } of listImages()) {
    const base = file.replace(/\.[^.]+$/, '');
    const two = base.match(/^(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})\s*-\s*(.+)$/); // début - fin - titre
    const one = base.match(/^(\d{4}-\d{2}-\d{2})\s*-\s*(.+)$/);                            // fin - titre
    let start: number | null = null, end: number, title: string;
    if (two) { start = Date.parse(two[1]); end = Date.parse(two[2]); title = two[3].trim(); }
    else if (one) { end = Date.parse(one[1]); title = one[2].trim(); }
    else continue; // nom non conforme → ignoré (pas de plantage)
    if (Number.isNaN(end)) continue;
    const url = '/evenements/' + rel.split('/').map(encodeURIComponent).join('/');
    out.push({ title, image: url, link: DEFAULT_LINK, start, end });
  }
  return out;
}

// Liste unifiée et filtrée pour l'affichage : uniquement les événements dont la
// fenêtre d'affichage est en cours (apparus, pas encore expirés), triés par fin.
export async function getEvents(now: number = Date.now()): Promise<EventItem[]> {
  const md = (await getCollection('evenements', ({ data }) => !data.draft)).map((e) => ({
    title: e.data.title,
    image: e.data.image,
    link: e.data.link ?? null,
    start: null as number | null,
    end: e.data.date.valueOf(),
  }));
  return [...md, ...fromFolder()]
    .filter((e) => e.end + DAY > now && (e.start == null || e.start <= now))
    .sort((a, b) => a.end - b.end);
}
