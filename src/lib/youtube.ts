// ============================================================
//  Couche de données « vidéo » du site.
//
//  Aujourd'hui : renvoie des données de DÉMONSTRATION, pour que
//  le site tourne immédiatement, sans clé API.
//
//  Demain : dès qu'on renseigne YOUTUBE_API_KEY + YOUTUBE_CHANNEL_ID
//  (fichier .env) et les playlists des disciplines (src/data/site.ts),
//  ces fonctions iront chercher les vraies vidéos sur YouTube au build.
//  Le reste du site (pages, composants) n'a PAS à changer : il consomme
//  toujours les mêmes fonctions ci-dessous.
// ============================================================

import type { DisciplineSlug } from '../data/site';
import { disciplines } from '../data/site';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

export interface Video {
  /** identifiant de la vidéo YouTube (pour l'URL de lecture) */
  id: string;
  discipline: DisciplineSlug;
  title: string;
  excerpt?: string;
  /** libellé de type de contenu, ex. "Replay · 1 h 12" */
  kicker: string;
  /** libellé affiché sur la vignette, ex. "Billard · Masters" */
  caption: string;
  /** date lisible, ex. "Il y a 2 jours" */
  when: string;
  /** vues formatées, ex. "3,4 k" */
  views?: string;
  /** miniature réelle (URL image) — sinon vignette dégradée par défaut */
  thumb?: string;
  /** saison sportive, ex. "2025/2026" (déduite de la date de diffusion) */
  season?: string;
  /** catégorie/compétition (billard uniquement), ex. "Masters" */
  category?: string;
  /** date de diffusion au format ISO (pour les données structurées SEO) */
  date?: string;
}

// --- Catégories billard (par compétition), déduites du titre de la playlist ---
export const BILLARD_CATEGORIES = [
  'Masters', 'Femmes', 'Para-billard', 'Espoirs', 'Tournois Nationaux',
  'Coupe de France', 'Championnat', 'Ligue de Bretagne',
  'Snooker', 'Pool', 'Billard américain', 'Autres',
];

// Description éditoriale propre à chaque catégorie (référencement : chaque page
// catégorie a ainsi son propre texte riche en mots-clés, au lieu du texte générique).
export const CATEGORY_INTRO: Record<string, string> = {
  'Masters': "Les Masters, catégorie reine du Blackball français : retrouvez en replay les tournois nationaux, phases finales et grands rendez-vous du Blackball Master, filmés et commentés par LSEI.",
  'Femmes': "Le Blackball féminin à l'honneur : tournois et compétitions féminines de billard blackball, en replay commenté sur LSEI — Le Sport en Image.",
  'Para-billard': "Le para-billard blackball : le Championnat de France de para-billard et les rencontres de blackball handisport, filmés et diffusés par LSEI.",
  'Espoirs': "Les Espoirs du blackball : la relève du billard français, ses tournois et ses phases finales, en replay commenté sur LSEI.",
  'Tournois Nationaux': "Les Tournois Nationaux (TN) de blackball : les étapes du circuit national français, en replay commenté par LSEI.",
  'Coupe de France': "La Coupe de France de blackball : la grande compétition nationale par équipes et ses phases finales, filmées par LSEI.",
  'Championnat': "Les championnats de blackball : rencontres et phases de championnat, en replay sur LSEI — Le Sport en Image.",
  'Ligue de Bretagne': "Le blackball en Bretagne : les compétitions et rencontres de la Ligue de Bretagne, filmées et commentées par LSEI.",
  'Snooker': "Le snooker : rencontres, tournois et démonstrations de snooker en vidéo sur LSEI — Le Sport en Image.",
  'Pool': "Le pool et le billard américain (8-ball, blackball US) : tournois et rencontres en replay commenté sur LSEI.",
  'Billard américain': "Le billard américain : rencontres et compétitions filmées et commentées par LSEI — Le Sport en Image.",
  'Autres': "Rencontres et compétitions de billard diverses, filmées et diffusées par LSEI — Le Sport en Image.",
};

function billardCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('para') || t.includes('handi')) return 'Para-billard';
  if (t.includes('femme')) return 'Femmes';
  if (t.includes('espoir')) return 'Espoirs';
  if (t.includes('master')) return 'Masters';
  if (t.includes('snooker')) return 'Snooker';
  if (t.includes('américain') || t.includes('americain') || /\bus\b/.test(t)) return 'Billard américain';
  if (t.includes('pool') || t.includes('8ball') || t.includes('8 ball') || t.includes('chinese') || t.includes('ultimate')) return 'Pool';
  if (t.includes('coupe de france')) return 'Coupe de France';
  if (t.includes('championnat')) return 'Championnat';
  if (t.includes('ligue de bretagne') || /\bldb\b/.test(t)) return 'Ligue de Bretagne';
  if (t.includes('nationaux') || t.includes('national') || /\btn\b/.test(t)) return 'Tournois Nationaux';
  return 'Autres';
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[àáâä]/g,'a').replace(/[éèêë]/g,'e').replace(/[îï]/g,'i').replace(/[ôö]/g,'o').replace(/[ûü]/g,'u').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const categorySlug = (c: string) => slugify(c);
export const categoryFromSlug = (slug: string) => BILLARD_CATEGORIES.find((c) => slugify(c) === slug);

// Saison sportive (août → juillet) à partir d'une date ISO. Ex. juillet 2026 → "2025/2026".
export function seasonOf(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const start = d.getMonth() + 1 >= 8 ? y : y - 1;
  return `${start}/${start + 1}`;
}
export const seasonSlug = (s: string) => s.replace('/', '-');
export const seasonFromSlug = (slug: string) => slug.replace('-', '/');

// Saison lue dans un titre de playlist, ex. « 25/26 - BLACKBALL MASTERS » → "2025/2026",
// « 2024/2025 - … » → "2024/2025". Renvoie '' si aucun motif de saison n'est présent.
export function seasonFromTitle(title: string): string {
  const m = (title || '').match(/\b(?:20)?(\d{2})\s*[\/\-_]\s*(?:20)?(\d{2})\b/);
  if (!m) return '';
  const y1 = 2000 + Number(m[1]);
  const y2 = 2000 + Number(m[2]);
  if (y2 !== y1 + 1) return ''; // deux années consécutives seulement (évite les faux positifs)
  return `${y1}/${y2}`;
}

export interface LiveFeature {
  discipline: DisciplineSlug;
  caption: string;
  title: string;
  /** identifiant de la vidéo YouTube (pour lecture en place) */
  id: string;
  href: string;
  /** true = direct en cours (badge + score) ; false = simple mise en avant */
  isLive: boolean;
  /** 'live' = en direct · 'upcoming' = programmé (bientôt) · 'replay' = à revoir */
  status: 'live' | 'upcoming' | 'replay';
  score?: string;
  dek?: string;
  venue?: string;
  viewers?: string;
  thumb?: string;
}

export interface TickerItem {
  label: string;
  main: string;
  status: string;
}

export interface ProgrammeItem {
  time: string;
  live: boolean;
  title: string;
  meta: string;
  /** discipline OU 'magazine' pour la couleur du tag */
  tag: DisciplineSlug | 'magazine';
  id?: string;      // id de la vidéo YouTube (pour la miniature / le lien)
  thumb?: string;   // miniature HD YouTube
}

// ---- utilitaire couleur du tag « au programme » ----
export function tagStyle(tag: DisciplineSlug | 'magazine'): string {
  if (tag === 'magazine') return 'background:rgba(30,64,229,.12);color:var(--accent)';
  const d = disciplines.find((x) => x.slug === tag)!;
  return `background:${d.tagBg};color:${d.colorVar}`;
}

// =============== CLASSEMENT DES PLAYLISTS PAR DISCIPLINE ===============
//
//  Les playlists de la chaîne LSEI sont organisées par COMPÉTITION, pas par
//  discipline. Cette fonction déduit la discipline à partir du titre de la
//  playlist, par mots-clés. Elle sera utilisée lors du branchement réel :
//  pour chaque playlist YouTube → classifyPlaylist(titre) → discipline.

// Ordre important : la première règle qui matche l'emporte.
const DISCIPLINE_RULES: { slug: DisciplineSlug; keywords: string[] }[] = [
  { slug: 'beach', keywords: ['beach', 'volley'] },
  { slug: 'basket', keywords: ['basket'] },
  { slug: 'palets', keywords: ['palet'] },
  { slug: 'subbuteo', keywords: ['subbuteo', 'fistf'] },
  { slug: 'football', keywords: ['football', 'foot'] },
  { slug: 'bowling', keywords: ['bowling'] },
  { slug: 'billard', keywords: ['billard', 'blackball', 'black-ball', 'snooker', 'pool', 'carambole', 'masters', 'ultimate', 'para-billard', 'handi-billard'] },
];

// Exceptions : pour les playlists dont le titre ne contient aucun mot-clé
// reconnaissable (ex. « 25/26 - DN1 », « TN FEMMES »). À compléter une fois,
// en collant le titre exact (ou un fragment) de la playlist.
const DISCIPLINE_OVERRIDES: { match: string; slug: DisciplineSlug }[] = [
  { match: 'dn1', slug: 'billard' },
  { match: 'tn femmes', slug: 'billard' },
  { match: 'championnat de france us', slug: 'billard' },
];

// Playlists volontairement NON classées (archives génériques, tout mélangé).
const IGNORED_PLAYLISTS = ['les lives'];

export function classifyPlaylist(title: string): DisciplineSlug | null {
  const t = title.toLowerCase();
  if (IGNORED_PLAYLISTS.some((k) => t.includes(k))) return null;
  for (const o of DISCIPLINE_OVERRIDES) if (t.includes(o.match)) return o.slug;
  for (const r of DISCIPLINE_RULES) if (r.keywords.some((k) => t.includes(k))) return r.slug;
  return null; // non reconnu → à ajouter dans DISCIPLINE_OVERRIDES
}

// =============== DONNÉES DE DÉMONSTRATION ===============

const MOCK_LIVE: LiveFeature = {
  discipline: 'basket',
  id: 'demo-live',
  isLive: true,
  status: 'live',
  caption: 'Basketball · Poule A',
  score: 'PAYS DE FOUGÈRES 68 — 64 RUEIL · 4E QUART · 04:12',
  title: 'Fougères tient tête à Rueil dans un money-time bouillant',
  dek: "Menés de dix points à la pause, les Fougerais ont renversé la rencontre porté par un public en fusion. Suivez la fin de match commentée, image et son signés LSEI.",
  venue: 'Salle Justy Specker · Fougères',
  viewers: '1 240 spectateurs connectés',
  href: '#',
};

const MOCK_TICKER: TickerItem[] = [
  { label: 'Basket', main: 'Fougères 68 – 64 Rueil', status: 'Q4 04:12' },
  { label: 'Billard', main: 'Masters, 1/2 finale', status: 'en cours' },
  { label: 'Palets', main: 'Championnat de Bretagne', status: '18:30' },
];

const MOCK_PROGRAMME: ProgrammeItem[] = [
  { time: 'LIVE', live: true, title: 'Fougères – Rueil', meta: 'Basket · 4e quart-temps', tag: 'basket' },
  { time: 'LIVE', live: true, title: 'Masters de billard — 1/2 finale', meta: 'Billard français · à la bande', tag: 'billard' },
  { time: '18:30', live: false, title: 'Championnat de Bretagne de palets', meta: 'Palets bretons · phase finale', tag: 'palets' },
  { time: '21:00', live: false, title: "L'Œil du dimanche — le mag", meta: 'Débrief de la semaine sportive', tag: 'magazine' },
];

const MOCK_REPLAYS: Video[] = [
  { id: 'demo-bil-1', discipline: 'billard', title: 'Le rappel de bande qui a fait basculer la demi-finale', excerpt: 'Retour au ralenti sur le point qui a scellé la qualification, commenté par nos experts.', kicker: 'Replay · 1 h 12', caption: 'Billard · Masters', when: 'Il y a 2 jours', views: '3,4 k' },
  { id: 'demo-bsk-1', discipline: 'basket', title: 'Dans les coulisses du Pays de Fougères Basket', excerpt: "Vestiaire, entraînement, ferveur : trois jours au cœur d'un club qui monte.", kicker: 'Magazine · 8 min', caption: 'Basket · Interview', when: 'Il y a 4 jours', views: '6,1 k' },
  { id: 'demo-pal-1', discipline: 'palets', title: 'Le palet breton, un patrimoine qui ne rouille pas', excerpt: 'À la rencontre des artisans et des joueurs qui perpétuent un jeu centenaire.', kicker: 'Magazine · 11 min', caption: 'Palets · Portrait', when: 'Il y a 6 jours', views: '2,8 k' },
  { id: 'demo-bsk-2', discipline: 'basket', title: 'Fougères – Le Havre : le résumé d\'une soirée record', excerpt: 'Les temps forts du match qui a rempli la salle Justy Specker.', kicker: 'Replay · 1 h 05', caption: 'Basket · Poule A', when: 'Il y a 1 semaine', views: '4,7 k' },
  { id: 'demo-bil-2', discipline: 'billard', title: 'Masters : la finale intégrale', excerpt: 'Le match pour le titre, sans coupure, avec les commentaires en direct.', kicker: 'Replay · 1 h 34', caption: 'Billard · Finale', when: 'Il y a 1 semaine', views: '2,1 k' },
  { id: 'demo-beach-1', discipline: 'beach', title: 'Coupe de France de beach-volley : la finale au sommet', excerpt: 'Un dernier set irrespirable pour désigner les champions sur le sable.', kicker: 'Replay · 52 min', caption: 'Beach-volley · Coupe de France', when: 'Il y a 5 jours', views: '5,3 k' },
  { id: 'demo-beach-2', discipline: 'beach', title: 'Les plus beaux points du tournoi', excerpt: 'Défenses impossibles et smashes décisifs : le best-of de la compétition.', kicker: 'Magazine · 9 min', caption: 'Beach-volley · Best-of', when: 'Il y a 2 semaines', views: '1,9 k' },
  { id: 'demo-bow-1', discipline: 'bowling', title: 'Open de l\'Ouest : la remontée décisive', excerpt: 'Trois strikes de suite pour renverser la finale.', kicker: 'Replay · 41 min', caption: 'Bowling · Open', when: 'Il y a 3 jours', views: '1,4 k' },
  { id: 'demo-bow-2', discipline: 'bowling', title: 'Technique : lire la piste comme un pro', excerpt: 'Les conseils des meilleurs joueurs du circuit.', kicker: 'Magazine · 7 min', caption: 'Bowling · Technique', when: 'Il y a 2 semaines', views: '2,6 k' },
  { id: 'demo-pal-2', discipline: 'palets', title: 'Championnat de Bretagne : la finale au sommet', excerpt: 'Le duel qui a désigné le champion, planche par planche.', kicker: 'Replay · 48 min', caption: 'Palets · Championnat', when: 'Il y a 10 jours', views: '1,7 k' },
  { id: 'demo-sub-1', discipline: 'subbuteo', title: 'Subbuteo : cap sur la Coupe du Monde 2026', excerpt: 'Présentation de la discipline avant le grand rendez-vous mondial que LSEI filmera.', kicker: 'Bientôt', caption: 'Subbuteo · Coupe du Monde', when: 'À venir' },
];

// =============== VIDÉOS FOOTBALL (RÉELLES) ===============
//  Les lives foot de LSEI sont diffusés sur la chaîne de la Ligue de Bretagne
//  (« LBF TV », @liguebretagne), pas sur la chaîne LSEI. On les référence donc
//  par leur ID de vidéo. Titres récupérés via l'oEmbed public YouTube ;
//  miniatures via l'URL publique i.ytimg.com (aucune clé API nécessaire).
//  → Pour ajouter un nouveau live foot : ajouter une ligne { id, title, year }.
const FOOTBALL_SOURCE: { id: string; title: string; year: string }[] = [
  { id: 'sljGEjNaQQg', title: 'Finale Coupe Région Bretagne 2026 — Hommes', year: '2026' },
  { id: 'lnrgKz9fDp4', title: 'Finale Coupe Région Bretagne 2026 — Femmes', year: '2026' },
  { id: '_hTT6nhKmD4', title: 'Finale Coupe Région Bretagne 2026 — U14', year: '2026' },
  { id: 's4stIglUr6w', title: 'Finale Coupe Région Bretagne 2026 — U18 F', year: '2026' },
  { id: 'H3fVptWoS1c', title: 'Finale Coupe Région Bretagne 2026 — U17', year: '2026' },
  { id: 'nMuRzZdcwgQ', title: 'Finale Coupe Région Bretagne 2026 — U15 F', year: '2026' },
  { id: '909ob18Thzg', title: 'Finale CRB 2025 — Hommes : RC Ploumagoar – Lamballe FC', year: '2025' },
  { id: 'FzJ7nidLfXs', title: 'Finale CRB 2025 — Femmes : FC Lorient – CPB Bréquigny 2', year: '2025' },
  { id: 'k951iwbiD3o', title: 'Finale CRB U15 F 2025 : EA Saint-Renan – Stade Brestois 29', year: '2025' },
  { id: '4elmEM2tLJw', title: 'Finale CRB U17 2025 : CPB Bréquigny – Stade Plabennec', year: '2025' },
  { id: 'nw0WsXf18RM', title: 'Finale CRB U16 2025 : US Fougères – Vannes OC', year: '2025' },
  { id: 'd5r_opE_j3s', title: 'Finale CRB U14 2025 : TA Rennes – Stade Rennais FC', year: '2025' },
];

const FOOTBALL_VIDEOS: Video[] = FOOTBALL_SOURCE.map((v) => ({
  id: v.id,
  discipline: 'football',
  title: v.title,
  kicker: 'Replay',
  caption: 'Football · Coupe de Bretagne',
  when: v.year,
  thumb: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
  // finales de fin de saison (mai-juin) → saison qui s'achève cette année-là
  season: `${Number(v.year) - 1}/${v.year}`,
  date: `${v.year}-06-01`,
}));

// =============== API PUBLIQUE (consommée par les pages) ===============

const KEY = import.meta.env.YOUTUBE_API_KEY as string | undefined;
const CHANNEL = import.meta.env.YOUTUBE_CHANNEL_ID as string | undefined;
const hasYouTube = Boolean(KEY && CHANNEL);
const API = 'https://www.googleapis.com/youtube/v3';
// Mode « rafraîchissement » : seul le job programmé (REFRESH_YOUTUBE=1) va RÉELLEMENT
// chercher toutes les vidéos sur YouTube (appel coûteux). Les déploiements normaux
// lisent le cache commité → aucun risque de dépasser le quota, build rapide.
const REFRESH = Boolean(import.meta.env.REFRESH_YOUTUBE);

// -------- utilitaires API --------
// Appel API avec délai d'expiration (évite qu'un appel qui pend ne bloque tout le
// build) + une petite relance sur latence/erreur serveur transitoire.
async function yt(path: string, attempt = 0): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`${API}/${path}&key=${KEY}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`YouTube API ${res.status} — ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  } catch (e) {
    const retriable = (e as Error).name === 'AbortError' || / 5\d\d /.test((e as Error).message || '');
    if (retriable && attempt < 2) return yt(path, attempt + 1);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function ytPaged(path: string, max = 500): Promise<any[]> {
  const out: any[] = [];
  let token = '';
  do {
    const data = await yt(`${path}&maxResults=50${token ? `&pageToken=${token}` : ''}`);
    out.push(...(data.items || []));
    token = data.nextPageToken || '';
  } while (token && out.length < max);
  return out;
}

function frenchDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function disciplineLabel(slug: DisciplineSlug): string {
  return disciplines.find((d) => d.slug === slug)?.label ?? slug;
}

// -------- récupération réelle des replays (avec cache par build) --------
let _realReplays: Video[] | null = null;

// Cache de secours COMMITÉ : si un build ne parvient pas à joindre YouTube
// (quota dépassé, panne réseau…), on repart de la dernière liste connue au lieu
// de déployer un site vide. Rafraîchi à chaque build réussi.
const REPLAYS_MIN = 50; // en dessous, on considère le fetch YouTube comme raté/partiel
const REPLAYS_CACHE_FILE = 'src/data/cache/replays.json';
function writeReplaysCache(v: Video[]): void {
  try { mkdirSync('src/data/cache', { recursive: true }); writeFileSync(REPLAYS_CACHE_FILE, JSON.stringify(v)); } catch { /* non bloquant */ }
}
function readReplaysCache(): Video[] | null {
  try { const v = JSON.parse(readFileSync(REPLAYS_CACHE_FILE, 'utf8')); return Array.isArray(v) && v.length ? (v as Video[]) : null; } catch { return null; }
}

interface RawVid { id: string; discipline: DisciplineSlug; title: string; thumb?: string; pub: string; category?: string; plSeason?: string }

async function fetchRealReplays(): Promise<Video[]> {
  if (_realReplays) return _realReplays;
  try {
  const playlists = await ytPaged(`playlists?part=snippet&channelId=${CHANNEL}`);

  // Priorité des catégories billard : quand une même vidéo figure dans PLUSIEURS
  // playlists (ex. un match Masters est aussi dans la playlist fourre-tout « Tournois
  // Nationaux »), on garde la catégorie la plus SPÉCIFIQUE (Masters/Femmes/Para…),
  // pas la première rencontrée — sinon la playlist générique « volerait » les vidéos.
  const CAT_PRIORITY: Record<string, number> = {
    'Masters': 0, 'Femmes': 0, 'Para-billard': 0, 'Espoirs': 0,
    'Snooker': 1, 'Pool': 1, 'Billard américain': 1,
    'Coupe de France': 2, 'Championnat': 2, 'Ligue de Bretagne': 3,
    'Tournois Nationaux': 4, 'Autres': 5,
  };
  const catRank = (c?: string) => (c && c in CAT_PRIORITY ? CAT_PRIORITY[c] : 9);

  // 1) Collecter les vidéos des playlists classées, dédoublonnées par id.
  //    Les items sont récupérés EN PARALLÈLE (par lots) — sinon 80 playlists en
  //    série rendent le build interminable. Une playlist en échec (404/privée)
  //    est simplement ignorée. On garde l'ordre des playlists pour un dédoublonnage
  //    déterministe.
  const classified = (playlists as any[])
    .map((pl) => ({ pl, disc: classifyPlaylist(pl.snippet?.title || '') }))
    .filter((x) => !!x.disc) as { pl: any; disc: DisciplineSlug }[];
  const CONC = 8;
  const withItems: { pl: any; disc: DisciplineSlug; items: any[] }[] = [];
  for (let i = 0; i < classified.length; i += CONC) {
    const batch = classified.slice(i, i + CONC);
    const res = await Promise.all(batch.map(async ({ pl, disc }) => {
      try { return { pl, disc, items: await ytPaged(`playlistItems?part=snippet,contentDetails&playlistId=${pl.id}`) }; }
      catch { return { pl, disc, items: [] as any[] }; } // playlist inaccessible → ignorée
    }));
    withItems.push(...res);
  }

  const map = new Map<string, RawVid>();
  for (const { pl, disc, items } of withItems) {
    const plSeason = seasonFromTitle(pl.snippet?.title || ''); // ex. « 25/26 - … » → "2025/2026"
    const plCat = disc === 'billard' ? billardCategory(pl.snippet?.title || '') : undefined;
    for (const it of items) {
      const s = it.snippet || {};
      const id = it.contentDetails?.videoId || s.resourceId?.videoId;
      const title: string = s.title || '';
      if (!id || title === 'Private video' || title === 'Deleted video') continue;
      // Ignorer les vidéos d'autres chaînes ajoutées à une playlist LSEI (ex. musique, références).
      if (s.videoOwnerChannelId && s.videoOwnerChannelId !== CHANNEL) continue;
      const existing = map.get(id);
      if (existing) {
        // Déjà vue : on remplace la catégorie si CETTE playlist est plus spécifique
        // (ex. « Masters » l'emporte sur « Tournois Nationaux »).
        if (disc === 'billard' && catRank(plCat) < catRank(existing.category)) {
          existing.category = plCat;
          if (plSeason) existing.plSeason = plSeason;
        }
        continue;
      }
      map.set(id, {
        id,
        discipline: disc,
        title,
        thumb: (s.thumbnails?.high || s.thumbnails?.medium || s.thumbnails?.default)?.url,
        pub: it.contentDetails?.videoPublishedAt || s.publishedAt || '',
        category: plCat,
        plSeason,
      });
    }
  }

  // 2) Récupérer l'heure RÉELLE de diffusion (actualStartTime) pour trier les
  //    lives dans le bon ordre — la date de « publication » YouTube est peu fiable
  //    pour les directs (elle ne suit pas l'ordre des matchs).
  const ids = [...map.keys()];
  const airTime = new Map<string, string>();
  const upcomingIds = new Set<string>(); // lives PROGRAMMÉS, pas encore diffusés → exclus des replays
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
  const detailResults = await Promise.all(
    chunks.map((chunk) => yt(`videos?part=liveStreamingDetails&id=${chunk.join(',')}`).catch(() => ({ items: [] }))),
  );
  for (const res of detailResults) {
    for (const v of res.items || []) {
      const d = v.liveStreamingDetails;
      if (d?.actualStartTime) airTime.set(v.id, d.actualStartTime);
      else if (d?.scheduledStartTime) upcomingIds.add(v.id); // programmé mais jamais diffusé
    }
  }

  // 3) Trier par date effective (diffusion si live, sinon publication), plus récent d'abord.
  //    On EXCLUT les lives programmés non encore diffusés (ce ne sont pas des « replays »).
  const list = [...map.values()].filter((m) => !upcomingIds.has(m.id)).map((m) => {
    const eff = airTime.get(m.id) || m.pub;
    return {
      eff,
      v: {
        id: m.id,
        discipline: m.discipline,
        title: m.title,
        kicker: 'Replay',
        caption: disciplineLabel(m.discipline),
        when: frenchDate(eff),
        thumb: m.thumb,
        season: m.plSeason || seasonOf(eff), // le « 25/26 » du nom de playlist fait foi
        category: m.category,
        date: eff, // ISO, pour les données structurées vidéo
      } as Video,
    };
  });
  list.sort((a, b) => (a.eff < b.eff ? 1 : -1));
  const fresh = list.map((x) => x.v);
  const cached = readReplaysCache();
  if (fresh.length >= REPLAYS_MIN && fresh.length >= (cached?.length ?? 0)) {
    // fetch aussi complet (ou plus) que le cache → on rafraîchit le cache commité
    writeReplaysCache(fresh);
    _realReplays = fresh;
  } else if (cached) {
    // fetch partiel (quota épuisé en cours de route…) → on garde le cache, plus complet
    _realReplays = cached;
  } else {
    _realReplays = fresh;
  }
  return _realReplays;
  } catch (e) {
    // fetch impossible → repli sur le cache commité plutôt que la démo vide
    const cached = readReplaysCache();
    if (cached) {
      console.warn(`[YouTube] fetchRealReplays a échoué → cache commité (${cached.length} vidéos) :`, (e as Error).message);
      _realReplays = cached;
      return cached;
    }
    throw e; // aucun cache disponible → getReplays basculera sur la démo
  }
}

export async function getReplays(opts: { discipline?: DisciplineSlug; limit?: number } = {}): Promise<Video[]> {
  // Disciplines de la chaîne LSEI.
  let others: Video[];
  if (REFRESH && hasYouTube) {
    // Job de rafraîchissement programmé : on interroge YouTube et on met à jour le cache.
    try {
      others = await fetchRealReplays();
    } catch (e) {
      console.warn('[YouTube] rafraîchissement échoué → cache/démo :', (e as Error).message);
      others = readReplaysCache() ?? MOCK_REPLAYS;
    }
  } else {
    // Déploiement NORMAL : aucun appel YouTube coûteux — on sert le cache commité
    // (dernière liste connue), et la démo seulement s'il n'existe pas encore de cache.
    others = readReplaysCache() ?? MOCK_REPLAYS;
  }
  // Le football vient TOUJOURS de la liste curatée (chaîne LBF TV), pas de l'API LSEI.
  let items = [...others, ...FOOTBALL_VIDEOS];
  if (opts.discipline) items = items.filter((v) => v.discipline === opts.discipline);
  if (opts.limit) items = items.slice(0, opts.limit);
  return items;
}

// Liste des saisons présentes (la plus récente d'abord).
export async function getSeasons(): Promise<string[]> {
  const all = await getReplays();
  const set = new Set<string>();
  for (const v of all) if (v.season) set.add(v.season);
  return [...set].sort().reverse();
}

// Saisons + nombre de vidéos (globalement ou pour une discipline), récente d'abord.
export async function getSeasonCounts(discipline?: DisciplineSlug): Promise<{ season: string; count: number }[]> {
  const vids = await getReplays(discipline ? { discipline } : {});
  const m = new Map<string, number>();
  for (const v of vids) if (v.season) m.set(v.season, (m.get(v.season) || 0) + 1);
  return [...m.entries()]
    .map(([season, count]) => ({ season, count }))
    .sort((a, b) => (a.season < b.season ? 1 : -1));
}

// "2025/2026" → "25/26"
export const seasonShort = (s: string) => s.split('/').map((y) => y.slice(-2)).join('/');

// Catégories billard + nombre de vidéos, dans l'ordre défini.
export async function getBillardCategories(): Promise<{ category: string; count: number }[]> {
  const vids = await getReplays({ discipline: 'billard' });
  const m = new Map<string, number>();
  for (const v of vids) if (v.category) m.set(v.category, (m.get(v.category) || 0) + 1);
  return BILLARD_CATEGORIES.filter((c) => m.has(c)).map((c) => ({ category: c, count: m.get(c)! }));
}

// -------- détection des directs SANS `search` (quota économe) --------
//  `search.list` coûte 100 unités et a un quota quotidien minuscule. On passe
//  plutôt par : channels → playlist « uploads » → videos.list(liveStreamingDetails).
//  (≈ 3 unités au total, sur le quota large.)
interface LiveVid { id: string; title: string; discipline: DisciplineSlug; thumb?: string; scheduled?: string }
let _liveState: { live: LiveVid[]; upcoming: LiveVid[] } | null = null;

async function fetchLiveState(): Promise<{ live: LiveVid[]; upcoming: LiveVid[] }> {
  if (_liveState) return _liveState;
  const ch = await yt(`channels?part=contentDetails&id=${CHANNEL}`);
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  const live: LiveVid[] = [];
  const upcoming: LiveVid[] = [];
  if (uploads) {
    const recent = await ytPaged(`playlistItems?part=contentDetails&playlistId=${uploads}`, 50);
    const ids = recent.map((r) => r.contentDetails?.videoId).filter(Boolean).slice(0, 50);
    if (ids.length) {
      const vids = await yt(`videos?part=snippet,liveStreamingDetails&id=${ids.join(',')}`);
      for (const v of vids.items || []) {
        const d = v.liveStreamingDetails;
        if (!d) continue; // vidéo normale (pas un direct)
        const disc = (classifyPlaylist(v.snippet.title) ?? 'basket') as DisciplineSlug;
        const lv: LiveVid = {
          id: v.id,
          title: v.snippet.title,
          discipline: disc,
          thumb: (v.snippet.thumbnails?.high || v.snippet.thumbnails?.medium)?.url,
          scheduled: d.scheduledStartTime,
        };
        if (d.actualStartTime && !d.actualEndTime) live.push(lv);
        else if (d.scheduledStartTime && !d.actualStartTime) upcoming.push(lv);
      }
    }
  }
  _liveState = { live, upcoming };
  return _liveState;
}

export async function getLiveFeature(): Promise<LiveFeature | null> {
  if (hasYouTube) {
    let state = { live: [] as LiveVid[], upcoming: [] as LiveVid[] };
    try {
      state = await fetchLiveState();
    } catch (e) {
      console.warn('[YouTube] getLiveFeature (détection direct) :', (e as Error).message);
    }
    // 1) Un direct EN COURS → à la une, badge « En direct ».
    if (state.live[0]) {
      const l = state.live[0];
      return {
        discipline: l.discipline, id: l.id, isLive: true, status: 'live',
        caption: disciplineLabel(l.discipline), title: l.title,
        href: `https://www.youtube.com/watch?v=${l.id}`, thumb: l.thumb,
      };
    }
    // 2) Pas de direct, mais un live PROGRAMMÉ → à la une, libellé « Bientôt » (compte à rebours).
    const soon = [...state.upcoming].sort((a, b) => ((a.scheduled || '') < (b.scheduled || '') ? -1 : 1))[0];
    if (soon) {
      return {
        discipline: soon.discipline, id: soon.id, isLive: false, status: 'upcoming',
        caption: disciplineLabel(soon.discipline), title: soon.title,
        href: `https://www.youtube.com/watch?v=${soon.id}`, thumb: soon.thumb,
      };
    }
    // 3) Sinon → la dernière vidéo publiée (vrai replay), libellé « À revoir ».
    const [latest] = await getReplays({ limit: 1 });
    if (latest) {
      return {
        discipline: latest.discipline, id: latest.id, isLive: false, status: 'replay',
        caption: latest.caption, title: latest.title,
        href: `/replay/${latest.id}`, thumb: latest.thumb,
      };
    }
    return null;
  }
  return MOCK_LIVE;
}

export interface LiveNow { id: string; title: string; discipline: DisciplineSlug; thumb?: string }

// Liste de TOUS les directs en cours (pour afficher plusieurs lives simultanés).
export async function getCurrentLives(): Promise<LiveNow[]> {
  if (hasYouTube) {
    try {
      return (await fetchLiveState()).live.map((l) => ({ id: l.id, title: l.title, discipline: l.discipline, thumb: l.thumb }));
    } catch (e) {
      console.warn('[YouTube] getCurrentLives → repli :', (e as Error).message);
      return [];
    }
  }
  return [];
}

// Diffusions YouTube pour la GRILLE PROGRAMME : directs en cours + directs programmés,
// avec leur date/heure réelle. Se combinent avec le programme saisi via /admin.
export interface Broadcast { id: string; title: string; discipline: DisciplineSlug; date: string; live: boolean }
export async function getBroadcasts(): Promise<Broadcast[]> {
  if (!hasYouTube) return [];
  try {
    const { live, upcoming } = await fetchLiveState();
    const nowIso = new Date().toISOString();
    const out: Broadcast[] = [];
    for (const l of live) out.push({ id: l.id, title: l.title, discipline: l.discipline, date: l.scheduled || nowIso, live: true });
    for (const u of upcoming) out.push({ id: u.id, title: u.title, discipline: u.discipline, date: u.scheduled || nowIso, live: false });
    return out;
  } catch (e) {
    console.warn('[YouTube] getBroadcasts → repli :', (e as Error).message);
    return [];
  }
}

// Statistiques publiques de la chaîne (abonnés, vues cumulées, nb de vidéos).
// Sert au bloc « chiffres-clés » de l'accueil → toujours à jour, aucun chiffre saisi à la main.
export interface ChannelStats { subscribers: number; views: number; videos: number }
let _channelStats: ChannelStats | null | undefined;
export async function getChannelStats(): Promise<ChannelStats | null> {
  if (!hasYouTube) return null;
  if (_channelStats !== undefined) return _channelStats;
  try {
    const data = await yt(`channels?part=statistics&id=${CHANNEL}`);
    const s = data.items?.[0]?.statistics || {};
    _channelStats = {
      subscribers: Number(s.subscriberCount) || 0,
      views: Number(s.viewCount) || 0,
      videos: Number(s.videoCount) || 0,
    };
  } catch (e) {
    console.warn('[YouTube] getChannelStats → repli :', (e as Error).message);
    _channelStats = null;
  }
  return _channelStats;
}

export async function getTicker(): Promise<TickerItem[]> {
  if (hasYouTube) {
    try {
      const { live } = await fetchLiveState();
      return live.map((l) => ({ label: disciplineLabel(l.discipline), main: l.title, status: 'en direct' }));
    } catch (e) {
      console.warn('[YouTube] getTicker → repli sur la démo :', (e as Error).message);
      return [];
    }
  }
  return MOCK_TICKER;
}

export async function getProgramme(): Promise<ProgrammeItem[]> {
  if (hasYouTube) {
    try {
      const { live, upcoming } = await fetchLiveState();
      const fmt = (iso?: string) =>
        iso ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : 'À venir';
      return [
        ...live.map((l): ProgrammeItem => ({ time: 'LIVE', live: true, title: l.title, meta: disciplineLabel(l.discipline), tag: l.discipline, id: l.id, thumb: `https://i.ytimg.com/vi/${l.id}/maxresdefault.jpg` })),
        ...upcoming.map((u): ProgrammeItem => ({ time: fmt(u.scheduled), live: false, title: u.title, meta: disciplineLabel(u.discipline), tag: u.discipline, id: u.id, thumb: `https://i.ytimg.com/vi/${u.id}/maxresdefault.jpg` })),
      ];
    } catch (e) {
      console.warn('[YouTube] getProgramme → repli sur la démo :', (e as Error).message);
      return [];
    }
  }
  return MOCK_PROGRAMME;
}
