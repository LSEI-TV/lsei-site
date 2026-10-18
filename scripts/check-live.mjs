// Détecte si la chaîne YouTube LSEI est actuellement en direct, et écrit le
// résultat dans live.json. Appelé par le workflow live-status.yml (toutes les 5 min).
// Méthode économe en quota : channel → playlist « uploads » → videos.list.
//
// FIABILITÉ : la clé peut être partagée avec les builds (quota 10 000 u/j), qui
// l'épuisent parfois en soirée → la détection échoue (403). Deux garde-fous :
//   1) Clé DÉDIÉE optionnelle (YOUTUBE_API_KEY_LIVE) : quota isolé des builds.
//   2) En cas d'échec transitoire, on CONSERVE le dernier direct connu (≤ 3 h)
//      au lieu d'écrire un live.json vide — un simple 403 ne fait plus disparaître
//      le direct de l'accueil.
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'billard');

// --- Mise en forme « guide TV » depuis le titre YouTube (nomenclature « | »).
//     Ex. « 🎱 26-27 | BLACKBALL FEMMES | Finale – TN1 | BRUNET vs CARNEIRO »
//     → context = « 26-27 · Blackball Femmes · Finale – Tournoi National 1 », match = « BRUNET vs CARNEIRO »
const ABBR = [[/\bTN\s*([1-9]|1[0-2])\b/gi, 'Tournoi National $1'], [/\bCDF\b/gi, 'Coupe de France'], [/\bCDM\b/gi, 'Coupe du Monde'], [/\bCHPT\b/gi, 'Championnat']];
const expandAbbr = (s) => { let o = s || ''; for (const [re, rep] of ABBR) o = o.replace(re, rep); return o.trim(); };
const stripEmoji = (s) => (s || '').replace(/^[^\p{L}\p{N}(]+/u, '').trim();
const LEAD = /^(blackball|basketball|basket|palets?|subbuteo|football|foot|bowling|beach[- ]?volley|beach|volley|billard|snooker)\b[\s:–-]*/i;
const stripLead = (s) => stripEmoji(s).replace(LEAD, '').trim();
function parseTitle(title) {
  const parts = (title || '').split('|').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return { context: '', match: expandAbbr(stripEmoji(title)) };
  const kicker = expandAbbr(stripLead(parts[0]));
  const badges = parts.slice(1, -1).map(expandAbbr);
  return { context: [kicker, ...badges].filter(Boolean).join(' · '), match: expandAbbr(parts[parts.length - 1]) };
}

// Lieu AUTO pour le billard : déduit du titre (compétition + n° de TN + saison) via les
// données de résultats (chaque tournoi y porte sa ville). Les autres sports mettent le
// lieu dans le titre (il apparaît alors dans « context »).
function billardPlace(title) {
  const t = (title || '').toLowerCase();
  if (!/billard|blackball|black-ball|snooker|masters|femme|para-billard/.test(t)) return '';
  const champ = /championnat|france/.test(t);
  const mTn = t.match(/\btn\s*(\d{1,2})\b/);
  const level = champ ? 'Championnat de France' : (mTn ? 'TN' + mTn[1] : null);
  if (!level) return '';
  const femmes = /femme/.test(t);
  const my = t.match(/\b(?:20)?(\d{2})\s*[-\/]\s*(?:20)?(\d{2})\b/);
  const season = my ? `20${my[1]}-20${my[2]}` : '2026-2027';
  const file = `results${femmes ? '-femmes' : ''}-${season}.json`;
  try {
    const R = JSON.parse(readFileSync(join(DATA, file), 'utf8'));
    const tt = (R.tournaments || []).find((x) => x.level === level);
    return tt?.city || '';
  } catch { return ''; }
}

const enrich = (e) => { const { context, match } = parseTitle(e.title); return { ...e, context, match, place: billardPlace(e.title) }; };

// Clé DÉDIÉE à la détection live si elle existe (quota propre, non partagé avec les
// builds), sinon la clé commune. Ajouter le secret YOUTUBE_API_KEY_LIVE suffit à isoler.
const KEY = process.env.YOUTUBE_API_KEY_LIVE || process.env.YOUTUBE_API_KEY;
const CHANNEL = process.env.YOUTUBE_CHANNEL_ID;
const API = 'https://www.googleapis.com/youtube/v3';
// URL du live.json actuellement en ligne (pour conserver le dernier état en cas d'échec).
const LIVE_URL = process.env.LIVE_JSON_URL || 'https://lsei.tv/live.json';
const PRESERVE_MS = 3 * 3600 * 1000; // on garde un direct affiché jusqu'à 3 h après la dernière détection réussie

// Dernier live.json publié (sert de repli si la détection échoue ce coup-ci).
async function fetchPrevious() {
  try {
    const r = await fetch(LIVE_URL, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const j = await r.json();
    return j && typeof j === 'object' ? j : null;
  } catch { return null; }
}

async function yt(path) {
  const r = await fetch(`${API}/${path}&key=${KEY}`);
  if (!r.ok) throw new Error(`YouTube ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// Discipline déduite du titre (mêmes mots-clés que le site).
function classify(title) {
  const t = (title || '').toLowerCase();
  const rules = [
    ['beach', ['beach', 'volley']], ['basket', ['basket']], ['palets', ['palet']],
    ['subbuteo', ['subbuteo']], ['football', ['football', 'foot']], ['bowling', ['bowling']],
    ['billard', ['billard', 'blackball', 'black-ball', 'snooker', 'pool', 'carambole', 'masters', 'ultimate', 'para-billard', 'handi-billard']],
  ];
  for (const [slug, ks] of rules) if (ks.some((k) => t.includes(k))) return slug;
  return 'billard';
}

// TOUS les directs en cours (pour la page /direct : onglets LIVE 1/2/3).
async function detectLives() {
  const ch = await yt(`channels?part=contentDetails&id=${CHANNEL}`);
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return [];
  const recent = await yt(`playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=25`);
  const ids = (recent.items || []).map((i) => i.contentDetails?.videoId).filter(Boolean);
  if (!ids.length) return [];
  const vids = await yt(`videos?part=snippet,liveStreamingDetails&id=${ids.join(',')}`);
  const lives = [];
  const upcoming = [];
  for (const v of vids.items || []) {
    const d = v.liveStreamingDetails;
    if (!d) continue;
    const title = v.snippet?.title || 'Direct LSEI';
    if (d.actualStartTime && !d.actualEndTime) {
      // EN DIRECT = diffusion commencée mais pas terminée
      lives.push({ id: v.id, title, discipline: classify(title), start: d.actualStartTime });
    } else if (d.scheduledStartTime && !d.actualStartTime) {
      // PROGRAMMÉ = planifié, pas encore diffusé (pour la grille /programme et /direct)
      upcoming.push({ id: v.id, title, discipline: classify(title), scheduled: d.scheduledStartTime });
    }
  }
  // Direct le PLUS RÉCEMMENT démarré en premier → un nouveau live prend la main
  // sur /direct (avant, l'ancien live restait affiché en principal).
  lives.sort((a, b) => (a.start < b.start ? 1 : -1));
  // Programmés : le plus proche dans le temps en premier.
  upcoming.sort((a, b) => (a.scheduled < b.scheduled ? -1 : 1));
  return {
    lives: lives.map((l) => enrich({ id: l.id, title: l.title, discipline: l.discipline })),
    upcoming: upcoming.map((u) => enrich({ id: u.id, title: u.title, discipline: u.discipline, scheduled: u.scheduled })),
  };
}

let out;
try {
  const { lives, upcoming } = await detectLives();
  const first = lives[0];
  out = {
    live: lives.length > 0,
    lives,                                    // directs EN COURS (page /direct)
    upcoming,                                 // directs PROGRAMMÉS (grille /programme, temps réel)
    id: first?.id, title: first?.title,       // 1er direct (compat bandeau « ON AIR »)
    url: first ? `https://www.youtube.com/watch?v=${first.id}` : undefined,
    confirmedAt: new Date().toISOString(),    // horodatage de la dernière détection RÉUSSIE
  };
} catch (e) {
  console.error('Erreur détection live :', e.message);
  // Échec transitoire (quota YouTube, réseau…). Plutôt que d'effacer un direct en cours,
  // on reconduit le dernier état connu s'il est récent (≤ 3 h). error:true reste posé
  // pour que les BUILDS redétectent eux-mêmes (ils ne se fient pas à un état dégradé) ;
  // le temps réel de l'accueil, lui, continue d'afficher le direct sans coupure.
  const prev = await fetchPrevious();
  const fresh = prev?.confirmedAt && (Date.now() - Date.parse(prev.confirmedAt) < PRESERVE_MS);
  const keptLives = Array.isArray(prev?.lives) ? prev.lives : [];
  const keptUp = Array.isArray(prev?.upcoming) ? prev.upcoming : [];
  if (prev && fresh && (keptLives.length || keptUp.length)) {
    const first = keptLives[0];
    out = {
      live: keptLives.length > 0, lives: keptLives, upcoming: keptUp,
      id: first?.id, title: first?.title,
      url: first ? `https://www.youtube.com/watch?v=${first.id}` : undefined,
      confirmedAt: prev.confirmedAt, stale: true, error: true,
    };
    console.error(`→ état conservé (dernière détection réussie : ${prev.confirmedAt}).`);
  } else {
    out = { live: false, lives: [], upcoming: [], error: true }; // rien de fiable à conserver
  }
}
out.updated = new Date().toISOString();
writeFileSync('live.json', JSON.stringify(out));
console.log('live.json →', JSON.stringify(out));
