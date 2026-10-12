// ============================================================
//  AUDIT des titres de vidéos YouTube billard : lesquelles sont bien reliées aux
//  joueurs du circuit, lesquelles ne le sont pas (titre sans nom reconnu) → liste
//  FINIE et PRIORISÉE pour ne retoucher que ce qui compte.
//  Écrit un rapport Markdown (audit-videos.md). Ne modifie RIEN.
//    node scripts/audit-videos.mjs
// ============================================================
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'src', 'data', 'billard');
const CACHE = join(__dirname, '..', 'src', 'data', 'cache', 'replays.json');

// --- Reconnaissance tolérante (même logique que src/lib/videoMatch.ts). ---
const PARTICLES = new Set(['de', 'du', 'des', 'le', 'la', 'les', 'van', 'von', 'der', 'den', 'el', 'al', 'di', 'da', 'the', 'of']);
const nk = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nameTokens = (s) => nk(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !PARTICLES.has(w));
const strong = (t) => t.filter((w) => w.length >= 3);
const tokEq = (a, b) => a === b || (Math.min(a.length, b.length) >= 5 && (a.includes(b) || b.includes(a)));
const titleMatchesPlayer = (title, playerName) => {
  const pt = strong(nameTokens(playerName));
  if (!pt.length) return false;
  const surname = pt[pt.length - 1];
  return nameTokens(title).some((w) => tokEq(w, surname));
};

// --- Joueurs (noms complets) + tournois (dates) de toutes les saisons billard. ---
const playerNames = new Set();
const tournaments = []; // {date, level, city, comp}
for (const f of readdirSync(DATA).filter((f) => /^results-(femmes-)?\d{4}-\d{4}\.json$/.test(f))) {
  const R = JSON.parse(readFileSync(join(DATA, f), 'utf8'));
  const comp = /femmes/.test(f) ? 'Femmes' : 'Masters';
  for (const p of R.players || []) { if (p.name) playerNames.add(p.name); }
  for (const t of R.tournaments || []) tournaments.push({ date: t.date, level: t.level, city: t.city, comp });
}
const PLAYERS = [...playerNames];

const raw = JSON.parse(readFileSync(CACHE, 'utf8'));
const vids = (Array.isArray(raw) ? raw : raw.items || []).filter((v) => v.discipline === 'billard' && !/basket|militaire|fougeres/i.test(v.title || ''));

const dday = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);
const suggest = (v) => {
  if (!v.date) return '';
  const near = tournaments.filter((t) => t.date && dday(v.date, t.date) <= 3 && (v.category ? (v.category === t.comp) : true));
  if (!near.length) return '';
  const t = near.sort((a, b) => dday(v.date, a.date) - dday(v.date, b.date))[0];
  return `${t.comp} · ${t.level}${t.city ? ' · ' + t.city : ''}`;
};
const recognized = (v) => PLAYERS.some((n) => titleMatchesPlayer(v.title || '', n));

let ok = 0; const bad = [];
for (const v of vids) {
  if (/interview/i.test(v.title || '')) { ok++; continue; } // interviews : souvent déjà le nom, peu critiques
  if (recognized(v)) ok++;
  else bad.push(v);
}
bad.sort((a, b) => (a.date < b.date ? 1 : -1)); // plus récentes d'abord

let md = `# Audit vidéos billard — titres & reconnaissance joueurs\n\n`;
md += `_Généré le ${new Date().toLocaleString('fr-FR')}_\n\n`;
md += `- Vidéos billard analysées : **${vids.length}**\n`;
md += `- **Déjà reconnues** (un joueur du circuit dans le titre) : **${ok}**\n`;
md += `- **Non reconnues** (à retoucher si utile) : **${bad.length}**\n\n`;
md += `> Astuce : inutile de tout renommer. Le site relie déjà une vidéo à un joueur dès que son **nom** est dans le titre. Ci-dessous, uniquement celles où aucun nom du circuit n'est détecté — triées de la plus récente à la plus ancienne. La colonne « Contexte probable » est déduit de la **date de publication**.\n\n`;
md += `| Date | Titre actuel | Contexte probable (par date) | Lien |\n|---|---|---|---|\n`;
for (const v of bad) {
  const d = v.date ? new Date(v.date).toLocaleDateString('fr-FR') : '—';
  const title = (v.title || '').replace(/\|/g, '/');
  md += `| ${d} | ${title} | ${suggest(v) || '—'} | https://youtu.be/${v.id} |\n`;
}

writeFileSync(join(__dirname, '..', 'audit-videos.md'), md, 'utf8');

// --- CSV « à remplir » pour le renommage en masse (scripts/rename-videos.mjs). ---
//     Colonnes : video_id ; date ; titre_actuel ; contexte_probable ; nouveau_titre (à compléter).
//     Semicolon + BOM = ouverture directe dans Excel FR. Ne remplir que « nouveau_titre ».
const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
let csv = '﻿' + ['video_id', 'date', 'titre_actuel', 'contexte_probable', 'nouveau_titre'].map(q).join(';') + '\n';
for (const v of bad) {
  const d = v.date ? new Date(v.date).toLocaleDateString('fr-FR') : '';
  csv += [v.id, d, v.title || '', suggest(v) || '', ''].map(q).join(';') + '\n';
}
writeFileSync(join(__dirname, '..', 'rename-videos.csv'), csv, 'utf8');

console.log(`Audit : ${vids.length} vidéos · ${ok} reconnues · ${bad.length} à retoucher`);
console.log(`→ audit-videos.md (rapport lisible) + rename-videos.csv (${bad.length} lignes à compléter puis renommer en masse)`);
