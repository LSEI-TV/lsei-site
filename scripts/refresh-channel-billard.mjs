// ============================================================
//  Rafraîchit src/data/billard/channel-billard.json via la CLÉ API YouTube
//  (compatible CI, pas d'OAuth). Énumère la playlist « uploads » de la chaîne et
//  garde les vidéos billard. Lecture seule, NON bloquant : en cas d'échec ou de
//  liste suspecte, le snapshot existant est conservé.
//    YOUTUBE_API_KEY=... node scripts/refresh-channel-billard.mjs
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL = process.env.YOUTUBE_CHANNEL_ID || 'UCYUOdKr28cOjLzHWv6pTpjQ';
const OUT = join(ROOT, 'src', 'data', 'billard', 'channel-billard.json');

if (!KEY) { console.log('channel-billard : pas de clé API → snapshot conservé'); process.exit(0); }

const api = (p) => fetch(`https://www.googleapis.com/youtube/v3/${p}&key=${KEY}`).then((r) => r.json());

try {
  const ch = await api(`channels?part=contentDetails&id=${CHANNEL}`);
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) { console.log('channel-billard : playlist uploads introuvable → snapshot conservé'); process.exit(0); }

  const map = new Map();
  let page = '';
  do {
    const r = await api(`playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${uploads}${page ? '&pageToken=' + page : ''}`);
    for (const it of r.items || []) {
      const id = it.contentDetails?.videoId;
      if (id) map.set(id, { id, title: it.snippet?.title || '', date: (it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt || '').slice(0, 10) });
    }
    page = r.nextPageToken || '';
  } while (page);

  // Vidéos déjà connues comme billard par le cache (certaines ont un titre générique).
  const cacheBill = new Set();
  try {
    const c = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'cache', 'replays.json'), 'utf8'));
    for (const v of (Array.isArray(c) ? c : c.items || [])) if (v.discipline === 'billard') cacheBill.add(v.id);
  } catch { /* cache absent : on garde juste le filtre par mot-clé */ }

  const isPalet = (t) => /\bpalet\b/i.test(t);
  const billRe = /🎱|blackball|black\s*ball|billard|8\s*pool|9\s*ball|8\s*ball|jeu\s*de\s*la\s*[89]|snooker|espoir|veteran|mixte\s*national|para.?billard|fauteuil|malvoyant/i;
  const bill = [...map.values()].filter((v) => !isPalet(v.title) && (billRe.test(v.title) || cacheBill.has(v.id)));

  // Garde-fou : une liste anormalement courte = réponse API partielle → on ne l'écrase pas.
  if (bill.length < 50) { console.log(`channel-billard : seulement ${bill.length} vidéos (réponse suspecte) → snapshot conservé`); process.exit(0); }

  bill.sort((a, b) => (a.date < b.date ? 1 : -1));
  writeFileSync(OUT, JSON.stringify(bill, null, 0), 'utf8');
  console.log(`channel-billard : ${bill.length} vidéos billard (sur ${map.size} de la chaîne) → à jour`);
} catch (e) {
  console.log('channel-billard : échec (' + e.message + ') → snapshot conservé');
  process.exit(0);
}
