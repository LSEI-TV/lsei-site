// ============================================================
//  APRÈS LE BUILD (npm « postbuild ») : ajoute le « / » final aux liens internes.
//  Le serveur OVH redirige /direct → /direct/ (301). Sans « / », chaque lien interne
//  coûtait une redirection (≈ 86 000 sur le site) → Google perd du temps d'exploration.
//  On ne touche qu'aux liens vers une PAGE réellement générée (dossier avec index.html) :
//  les fichiers (images, PDF, flux…) et les liens externes restent inchangés.
//    node scripts/fix-trailing-slash.mjs   (lancé automatiquement après « npm run build »)
// ============================================================
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(fileURLToPath(new URL('..', import.meta.url)), 'dist');
if (!existsSync(DIST)) { console.log('fix-trailing-slash : pas de dossier dist, rien à faire.'); process.exit(0); }

// 1) Toutes les pages : dossiers qui contiennent un index.html → « billard/joueur/damien-joly ».
const pages = new Set();
const htmlFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!name.endsWith('.html')) continue;
    htmlFiles.push(p);
    if (name === 'index.html') pages.add(relative(DIST, dir).split(sep).join('/'));
  }
})(DIST);

// 2) href="/chemin" (ou https://lsei.tv/chemin) vers une page → href="/chemin/" (ancre et paramètres conservés).
const RE = /href="(https:\/\/lsei\.tv)?(\/[^"#?]*?)([?#][^"]*)?"/g;
let links = 0, files = 0;
for (const f of htmlFiles) {
  const html = readFileSync(f, 'utf8');
  let n = 0;
  const out = html.replace(RE, (all, host = '', path, rest = '') => {
    if (path === '/' || path.endsWith('/')) return all;
    if (!pages.has(decodeURIComponent(path).replace(/^\//, ''))) return all;
    n++;
    return `href="${host}${path}/${rest}"`;
  });
  if (n) { writeFileSync(f, out, 'utf8'); links += n; files++; }
}
console.log(`fix-trailing-slash : ${links} liens internes corrigés dans ${files} pages (${pages.size} pages connues).`);
