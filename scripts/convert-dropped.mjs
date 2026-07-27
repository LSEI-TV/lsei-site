// Convertit en WebP les fichiers/dossiers PASSÉS EN ARGUMENT (glisser-déposer).
// Utilisé par D:\CONVERTIR-EN-WEBP.bat : on fait glisser une ou plusieurs images
// (ou un dossier) sur l'icône du .bat, et chaque PNG/JPG devient un .webp à côté.
// L'original est CONSERVÉ (rien n'est supprimé). Un .webp existant est réécrit.
import sharp from 'sharp';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const QUALITY = 82;
const isSrc = (f) => /\.(png|jpe?g)$/i.test(f);

// Développe les arguments (fichiers + dossiers récursifs) en liste de fichiers image.
function expand(p) {
  const out = [];
  try {
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const e of readdirSync(p, { withFileTypes: true })) {
        if (e.isDirectory()) out.push(...expand(join(p, e.name)));
        else if (isSrc(e.name)) out.push(join(p, e.name));
      }
    } else if (isSrc(p)) {
      out.push(p);
    }
  } catch { /* chemin illisible */ }
  return out;
}

const args = process.argv.slice(2);
if (!args.length) { console.log('Aucun fichier reçu. Fais glisser une image sur le .bat.'); process.exit(0); }

const files = [...new Set(args.flatMap(expand))];
const mb = (n) => (n / 1024 / 1024).toFixed(2);

if (!files.length) { console.log('Aucune image PNG/JPG trouvée dans ce qui a été déposé.'); process.exit(0); }
console.log(`${files.length} image(s) à convertir (qualité WebP ${QUALITY})\n`);

let srcBytes = 0, outBytes = 0, done = 0, failed = 0;
for (const src of files) {
  const dest = src.replace(/\.(png|jpe?g)$/i, '.webp');
  try {
    const inSize = statSync(src).size;
    await sharp(src).webp({ quality: QUALITY, effort: 5 }).toFile(dest);
    const outSize = statSync(dest).size;
    srcBytes += inSize; outBytes += outSize; done++;
    console.log(`  OK  ${src}`);
    console.log(`      ${mb(inSize)} Mo -> ${mb(outSize)} Mo`);
  } catch (e) {
    failed++;
    console.warn(`  ECHEC  ${src}  -  ${e.message}`);
  }
}

console.log(`\nTermine : ${done} converties, ${failed} echec(s)`);
if (done) console.log(`Total : ${mb(srcBytes)} Mo -> ${mb(outBytes)} Mo  (${srcBytes ? Math.round((1 - outBytes / srcBytes) * 100) : 0} % plus leger)`);
console.log('\nL\'original PNG/JPG a ete conserve. Deplace le .webp dans le bon dossier de saison si besoin.');
