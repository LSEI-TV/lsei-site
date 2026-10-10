// ============================================================
//  Enrichit les résultats Blackball Master ARCHIVÉS avec la position de chaque match
//  (matchno + roundNo), nécessaires aux pages « tableau » d'un tournoi.
//  Les saisons passées ont été importées AVANT l'ajout de ces champs : ce script
//  re-récupère chaque tournoi sur Cuescore (via son id déjà stocké) et ajoute
//  matchno/roundNo aux matchs existants (appariement par paire d'id, repli par nom).
//  N'altère RIEN d'autre (points, classements, stats conservés).
//
//    node scripts/enrich-brackets.mjs         → enrichit
//    node scripts/enrich-brackets.mjs --dry   → simule
// ============================================================
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'src', 'data', 'billard');
const DRY = process.argv.includes('--dry');
const mk = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const files = readdirSync(DATA).filter((f) => /^results-(femmes-)?\d{4}-\d{4}\.json$/.test(f)).sort();

for (const file of files) {
  const path = join(DATA, file);
  const raw = readFileSync(path, 'utf8');
  const R = JSON.parse(raw);
  const matches = R.matches || [];
  if (!matches.length) { console.log(`${file} : aucun match, ignoré.`); continue; }
  if (matches.every((m) => m.matchno != null)) { console.log(`${file} : déjà enrichi, ignoré.`); continue; }

  const indentMatch = raw.match(/\n(\s+)"/);
  const indent = indentMatch ? indentMatch[1].length : 1;

  const byTid = new Map();
  for (const m of matches) { if (!byTid.has(m.tid)) byTid.set(m.tid, []); byTid.get(m.tid).push(m); }

  let total = 0, done = 0, tOk = 0;
  for (const t of R.tournaments) {
    const stored = byTid.get(String(t.id)) || byTid.get(t.id) || [];
    if (!stored.length) continue;
    total += stored.length;
    let api;
    try { api = await fetch(`https://api.cuescore.com/tournament/?id=${t.id}`).then((r) => r.json()); }
    catch (e) { console.log(`  ! ${file} tournoi ${t.id} (${t.level}) : fetch échoué`); continue; }
    await sleep(150);
    const byId = new Map(), byName = new Map();
    for (const am of api.matches || []) {
      if (am.matchstatusCode !== 2 || am.matchno == null || am.round == null) continue;
      const pa = am.playerA, pb = am.playerB; if (!pa || !pb) continue;
      const v = { matchno: am.matchno, roundNo: am.round };
      if (pa.playerId != null && pb.playerId != null) byId.set([pa.playerId, pb.playerId].sort((x, y) => x - y).join('_'), v);
      byName.set([mk(pa.name), mk(pb.name)].sort().join('|'), v);
    }
    let tDone = 0;
    for (const sm of stored) {
      const v = byId.get([sm.aId, sm.bId].sort((x, y) => x - y).join('_')) || byName.get([mk(sm.aName), mk(sm.bName)].sort().join('|'));
      if (v) { sm.matchno = v.matchno; sm.roundNo = v.roundNo; done++; tDone++; }
    }
    if (tDone === stored.length) tOk++;
    if (tDone < stored.length) console.log(`  ~ ${file} ${t.level} (${t.city}) : ${tDone}/${stored.length} appariés`);
  }

  console.log(`${file} : ${done}/${total} matchs enrichis · ${tOk}/${R.tournaments.length} tournois complets${DRY ? ' [dry]' : ''}`);
  if (!DRY && done > 0) writeFileSync(path, JSON.stringify(R, null, indent) + (raw.endsWith('\n') ? '\n' : ''), 'utf8');
}
console.log('Terminé.');
