// Convertit en PNG les fichiers/dossiers PASSÉS EN ARGUMENT (glisser-déposer).
// Utilisé par D:\CONVERTIR-EN-PNG.bat : on fait glisser une ou plusieurs images
// (WEBP / JPG) — ou un dossier — sur l'icône, et chaque image devient un .png à côté.
// L'original est CONSERVÉ (rien n'est supprimé). Un .png existant est réécrit.
import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const isSrc = (f) => /\.(webp|jpe?g)$/i.test(f); // sources converties vers PNG

// Développe les arguments (fichiers + dossiers récursifs) en liste d'images.
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
if (!args.length) { console.log('Aucun fichier reçu. Fais glisser une image WEBP sur le .bat.'); process.exit(0); }

const files = [...new Set(args.flatMap(expand))];
const mb = (n) => (n / 1024 / 1024).toFixed(2);

if (!files.length) { console.log('Aucune image WEBP/JPG trouvée dans ce qui a été déposé.'); process.exit(0); }
console.log(`${files.length} image(s) à convertir en PNG\n`);

let srcBytes = 0, outBytes = 0, done = 0, failed = 0;
for (const src of files) {
  const dest = src.replace(/\.(webp|jpe?g)$/i, '.png');
  try {
    const inSize = statSync(src).size;
    await sharp(src).png().toFile(dest);
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
if (done) console.log(`Total : ${mb(srcBytes)} Mo -> ${mb(outBytes)} Mo`);
console.log('\nNote : le PNG est plus LOURD que le WEBP (format non compresse). L\'original a ete conserve.');
