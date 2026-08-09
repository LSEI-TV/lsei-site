// Détecte si la chaîne YouTube LSEI est actuellement en direct, et écrit le
// résultat dans live.json. Appelé par le workflow live-status.yml (toutes les 30 min).
// Méthode économe en quota : channel → playlist « uploads » → videos.list.
import { writeFileSync } from 'node:fs';

const KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL = process.env.YOUTUBE_CHANNEL_ID;
const API = 'https://www.googleapis.com/youtube/v3';

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
    lives: lives.map(({ id, title, discipline }) => ({ id, title, discipline })),
    upcoming: upcoming.map(({ id, title, discipline, scheduled }) => ({ id, title, discipline, scheduled })),
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
  };
} catch (e) {
  console.error('Erreur détection live :', e.message);
  out = { live: false, lives: [], upcoming: [], error: true }; // en cas d'erreur, pas de faux direct
}
out.updated = new Date().toISOString();
writeFileSync('live.json', JSON.stringify(out));
console.log('live.json →', JSON.stringify(out));
