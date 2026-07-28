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
  for (const v of vids.items || []) {
    const d = v.liveStreamingDetails;
    // en direct = diffusion commencée mais pas terminée
    if (d && d.actualStartTime && !d.actualEndTime) {
      const title = v.snippet?.title || 'Direct LSEI';
      lives.push({ id: v.id, title, discipline: classify(title), start: d.actualStartTime });
    }
  }
  // le plus tôt commencé en premier (ordre stable des onglets)
  lives.sort((a, b) => (a.start < b.start ? -1 : 1));
  return lives.map(({ id, title, discipline }) => ({ id, title, discipline }));
}

let out;
try {
  const lives = await detectLives();
  const first = lives[0];
  out = {
    live: lives.length > 0,
    lives,                                    // liste complète (page /direct)
    id: first?.id, title: first?.title,       // 1er direct (compat bandeau « ON AIR »)
    url: first ? `https://www.youtube.com/watch?v=${first.id}` : undefined,
  };
} catch (e) {
  console.error('Erreur détection live :', e.message);
  out = { live: false, lives: [], error: true }; // en cas d'erreur, pas de faux direct
}
out.updated = new Date().toISOString();
writeFileSync('live.json', JSON.stringify(out));
console.log('live.json →', JSON.stringify(out));
