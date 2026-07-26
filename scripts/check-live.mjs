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

async function detectLive() {
  const ch = await yt(`channels?part=contentDetails&id=${CHANNEL}`);
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return null;
  const recent = await yt(`playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=15`);
  const ids = (recent.items || []).map((i) => i.contentDetails?.videoId).filter(Boolean);
  if (!ids.length) return null;
  const vids = await yt(`videos?part=snippet,liveStreamingDetails&id=${ids.join(',')}`);
  for (const v of vids.items || []) {
    const d = v.liveStreamingDetails;
    // en direct = diffusion commencée mais pas terminée
    if (d && d.actualStartTime && !d.actualEndTime) {
      return { id: v.id, title: v.snippet?.title || 'Direct LSEI' };
    }
  }
  return null;
}

let out;
try {
  const live = await detectLive();
  out = live
    ? { live: true, id: live.id, title: live.title, url: `https://www.youtube.com/watch?v=${live.id}` }
    : { live: false };
} catch (e) {
  console.error('Erreur détection live :', e.message);
  out = { live: false, error: true }; // en cas d'erreur, on n'affiche pas de faux direct
}
out.updated = new Date().toISOString();
writeFileSync('live.json', JSON.stringify(out));
console.log('live.json →', JSON.stringify(out));
