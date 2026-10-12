// ============================================================
//  Récupère TOUTES les vidéos billard de la chaîne YouTube (pas seulement le cache
//  du site) et les enregistre dans channel-billard.json. Nécessite l'autorisation
//  OAuth (youtube-oauth.json). Lecture seule.    node scripts/fetch-channel-billard.mjs
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const c = JSON.parse(readFileSync(join(__dirname, '..', 'youtube-oauth.json'), 'utf8'));
// Vidéos déjà connues comme billard par le cache du site (certaines ont un titre
// générique sans mot-clé → on les inclut via leur id).
const cacheRaw = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'data', 'cache', 'replays.json'), 'utf8'));
const cacheArr = Array.isArray(cacheRaw) ? cacheRaw : cacheRaw.items || [];
const cacheBill = new Map(cacheArr.filter((v) => v.discipline === 'billard').map((v) => [v.id, v]));

const tok = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, refresh_token: c.refresh_token, grant_type: 'refresh_token' }) }).then((r) => r.json());
if (!tok.access_token) { console.error('✗ token:', tok); process.exit(1); }
const AT = tok.access_token;

const ch = await fetch('https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true', { headers: { authorization: 'Bearer ' + AT } }).then((r) => r.json());
const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
if (!uploads) { console.error('✗ playlist uploads introuvable'); process.exit(1); }

const map = new Map();
let page = '';
do {
  const u = 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=' + uploads + (page ? '&pageToken=' + page : '');
  const r = await fetch(u, { headers: { authorization: 'Bearer ' + AT } }).then((r) => r.json());
  for (const it of r.items || []) map.set(it.contentDetails.videoId, { id: it.contentDetails.videoId, title: it.snippet.title || '', date: (it.contentDetails.videoPublishedAt || it.snippet.publishedAt || '').slice(0, 10) });
  page = r.nextPageToken || '';
} while (page);

const all = [...map.values()];
const isPalet = (t) => /\bpalet\b/i.test(t);
const billRe = /🎱|blackball|black\s*ball|billard|8\s*pool|9\s*ball|8\s*ball|jeu\s*de\s*la\s*[89]|snooker|espoir|veteran|mixte\s*national|para.?billard|fauteuil|malvoyant/i;
// Billard = (titre avec mot-clé) OU (connue du cache) — hors palet.
const bill = all.filter((v) => !isPalet(v.title) && (billRe.test(v.title) || cacheBill.has(v.id)));
// Vidéos billard du cache absentes de la playlist uploads (live/non listées…) → on les ajoute.
const seen = new Set(bill.map((v) => v.id));
let added = 0;
for (const [id, v] of cacheBill) if (!seen.has(id)) { bill.push({ id, title: v.title || '', date: (v.date || '').slice(0, 10) }); added++; }
bill.sort((a, b) => (a.date < b.date ? 1 : -1));

writeFileSync(join(__dirname, '..', 'channel-billard.json'), JSON.stringify(bill, null, 0), 'utf8');
console.log(`Chaîne : ${all.length} vidéos uniques · BILLARD : ${bill.length} (dont ${added} du cache hors playlist) → channel-billard.json`);
