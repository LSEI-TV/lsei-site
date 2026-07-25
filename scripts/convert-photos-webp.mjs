// Convertit toutes les photos de joueurs (PNG/JPG) en WebP, puis supprime l'original.
// Le code du site retrouve les photos par nom (sans extension) et accepte déjà .webp,
// donc aucune modification de page n'est nécessaire.
//
//   node scripts/convert-photos-webp.mjs           → convertit
//   node scripts/convert-photos-webp.mjs --dry     → simule (n'écrit rien)
import sharp from 'sharp';
import { readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DRY = process.argv.includes('--dry');
const QUALITY = 82;
const ROOT = 'public/joueurs';
const isSrc = (f) => /\.(png|jpe?g)$/i.test(f);

function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collect(p));
    else if (isSrc(entry.name)) out.push(p);
  }
  return out;
}

const files = collect(ROOT);
let srcBytes = 0, outBytes = 0, done = 0, skipped = 0, failed = 0;

console.log(`${files.length} images à convertir (qualité WebP ${QUALITY})${DRY ? ' — SIMULATION' : ''}\n`);

for (const src of files) {
  const dest = src.replace(/\.(png|jpe?g)$/i, '.webp');
  try {
    const inSize = statSync(src).size;
    if (existsSync(dest)) { skipped++; continue; } // ne réécrit pas si un .webp existe déjà
    if (!DRY) {
      await sharp(src).webp({ quality: QUALITY, effort: 5 }).toFile(dest);
      const outSize = statSync(dest).size;
      srcBytes += inSize; outBytes += outSize;
      unlinkSync(src); // supprime l'original PNG/JPG
    } else {
      srcBytes += inSize;
    }
    done++;
    if (done % 25 === 0) console.log(`  ${done}/${files.length}...`);
  } catch (e) {
    failed++;
    console.warn('  ÉCHEC:', src, '—', e.message);
  }
}

const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(`\nTerminé : ${done} converties, ${skipped} ignorées, ${failed} échecs`);
if (!DRY) {
  console.log(`Avant : ${mb(srcBytes)} Mo  →  Après : ${mb(outBytes)} Mo`);
  console.log(`Gain : ${mb(srcBytes - outBytes)} Mo (${srcBytes ? Math.round((1 - outBytes / srcBytes) * 100) : 0} % plus léger)`);
}
