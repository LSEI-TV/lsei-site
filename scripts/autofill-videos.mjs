// ============================================================
//  Génère AUTOMATIQUEMENT les nouveaux titres pour les vidéos dont le match est
//  IDENTIFIABLE SANS AMBIGUÏTÉ — aujourd'hui : les FINALES (1 seul match par
//  tournoi, donc les 2 finalistes sont connus). Écrit autofill-videos.csv (même
//  format que rename-videos.csv) → à relire puis passer à rename-videos.mjs.
//  Ne touche À RIEN sur YouTube.
//    node scripts/autofill-videos.mjs
// ============================================================
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'src', 'data', 'billard');
const CACHE = join(__dirname, '..', 'src', 'data', 'cache', 'replays.json');

const PART = new Set(['de', 'du', 'des', 'le', 'la', 'les', 'van', 'von', 'der', 'den', 'el', 'al', 'di', 'da', 'the', 'of']);
const nk = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const toks = (s) => nk(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !PART.has(w));
const strong = (t) => t.filter((w) => w.length >= 3);
const tokEq = (a, b) => a === b || (Math.min(a.length, b.length) >= 5 && (a.includes(b) || b.includes(a)));
const titleHas = (title, name) => { const pt = strong(toks(name)); if (!pt.length) return false; const s = pt[pt.length - 1]; return toks(title).some((w) => tokEq(w, s)); };
// NOM DE FAMILLE affiché = tout sauf le prénom (gère « Le François »), en MAJUSCULES.
const surname = (name) => { const p = (name || '').trim().split(/\s+/); return (p.length > 1 ? p.slice(1).join(' ') : p[0] || '').toUpperCase(); };

// --- Tournois (avec finale) + joueurs, toutes saisons Masters/Femmes. ---
const players = new Set();
const tours = []; // {season, comp, level, city, date, aName, bName, kind}
for (const f of readdirSync(DATA).filter((f) => /^results-(femmes-)?\d{4}-\d{4}\.json$/.test(f))) {
  const R = JSON.parse(readFileSync(join(DATA, f), 'utf8'));
  const comp = /femmes/.test(f) ? 'Femmes' : 'Masters';
  const season = (f.match(/(\d{4})-(\d{4})/) || []);
  const seasonCompact = season.length ? `${season[1].slice(2)}-${season[2].slice(2)}` : '';
  for (const p of R.players || []) if (p.name) players.add(p.name);
  for (const t of R.tournaments || []) {
    const ms = (R.matches || []).filter((m) => m.tid === t.id && m.roundNo != null);
    if (!ms.length) continue;
    const maxR = Math.max(...ms.map((m) => m.roundNo));
    const finals = ms.filter((m) => m.roundNo === maxR);
    if (finals.length !== 1) continue; // vraie finale = 1 match
    const fm = finals[0];
    tours.push({ seasonCompact, comp, level: t.level, city: t.city, date: t.date, kind: t.kind, aName: fm.aName, bName: fm.bName });
  }
}
const PLAYERS = [...players];

const raw = JSON.parse(readFileSync(CACHE, 'utf8'));
const vids = (Array.isArray(raw) ? raw : raw.items || []).filter((v) => v.discipline === 'billard' && !/basket|militaire|fougeres/i.test(v.title || ''));
const recognized = (v) => PLAYERS.some((n) => titleHas(v.title || '', n));

const isFinale = (t) => /finale/i.test(t) && !/1\s*\/\s*(2|4|8|16|32)/.test(t);
const dday = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);

const rows = []; let ambiguous = 0;
for (const v of vids) {
  const ti = v.title || '';
  if (recognized(v) || /interview/i.test(ti)) continue;
  if (!isFinale(ti) || !v.date) continue;
  // SÉCURITÉ : n'accepter QUE le circuit Masters/Femmes clairement étiqueté, et
  // EXCLURE les compétitions parallèles filmées les mêmes jours (Vétérans, Espoirs,
  // Jeu de la 9/8, Para, Mixte…) qui provoqueraient de faux noms.
  if (/veteran|espoir|jeu\s*de\s*la|9\s*ball|8\s*ball|\bpara\b|fauteuil|malvoyant|mixte|senior|cadet|junior|minime/i.test(ti)) continue;
  const comp = /blackball\s+femmes/i.test(ti) ? 'Femmes' : /blackball\s+masters/i.test(ti) ? 'Masters' : null;
  if (!comp) continue; // titre pas explicitement « BLACKBALL MASTERS/FEMMES » → on laisse
  const tnm = ti.match(/\bTN\s*(\d+)\b/i);
  const cdf = /championnat|france/i.test(ti);
  // tournois candidats : même compétition + (TN n° exact | CdF) + date proche
  let cand = tours.filter((t) => t.comp === comp &&
    (tnm ? new RegExp(`\\bTN\\s*${tnm[1]}\\b`, 'i').test(t.level) : cdf ? (t.kind === 'france' || /championnat|france/i.test(t.level)) : true) &&
    t.date && dday(v.date, t.date) <= 6);
  if (tnm == null && !cdf) cand = cand.filter((t) => dday(v.date, t.date) <= 3); // sans n° : on exige une date très proche
  if (cand.length !== 1) { ambiguous++; continue; } // 0 ou >1 → on ne devine pas
  const t = cand[0];
  const compLabel = comp === 'Femmes' ? 'BLACKBALL FEMMES' : 'BLACKBALL MASTERS';
  const neo = `🎱 ${t.seasonCompact} | ${compLabel} | Finale – ${t.level} | ${surname(t.aName)} vs ${surname(t.bName)}`;
  if (neo === ti) continue;
  rows.push({ id: v.id, date: v.date, cur: ti, neo });
}

rows.sort((a, b) => (a.date < b.date ? 1 : -1));
const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
let csv = '﻿' + ['video_id', 'date', 'titre_actuel', 'contexte_probable', 'nouveau_titre'].map(q).join(';') + '\n';
for (const r of rows) csv += [r.id, new Date(r.date).toLocaleDateString('fr-FR'), r.cur, 'Finale (auto)', r.neo].map(q).join(';') + '\n';
writeFileSync(join(__dirname, '..', 'autofill-videos.csv'), csv, 'utf8');

console.log(`Finales auto-générées : ${rows.length} (ambiguës/non résolues laissées de côté : ${ambiguous})`);
console.log('→ autofill-videos.csv\n');
console.log('Aperçu :');
for (const r of rows.slice(0, 12)) console.log(`  ${r.cur}\n    → ${r.neo}`);
