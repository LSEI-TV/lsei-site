// Convertit en WebM (VP9 + Opus) les fichiers/dossiers PASSÉS EN ARGUMENT (glisser-déposer).
// Utilisé par D:\CONVERTIR-EN-WEBM.bat : on fait glisser une ou plusieurs vidéos
// (ou un dossier) sur l'icône du .bat, et chaque MP4/MOV/... devient un .webm à côté.
// L'original est CONSERVÉ (rien n'est supprimé). Un .webm existant est réécrit.
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CRF = 32;        // 0 = parfait, 63 = tout pourri. 30-34 = bon compromis web.
const MAX_WIDTH = 0;   // 0 = garder la taille d'origine. Mets 1920 pour brider les 4K.
const AUDIO_KBPS = 128;

const isSrc = (f) => /\.(mp4|mov|m4v|avi|mkv|wmv|flv|mpe?g|ts|mts|m2ts)$/i.test(f);

// Cherche ffmpeg : d'abord dans le PATH, sinon dans les emplacements connus de ce PC.
function findFfmpeg() {
  const where = spawnSync('where', ['ffmpeg'], { encoding: 'utf8' });
  if (where.status === 0) {
    const first = where.stdout.split(/\r?\n/).find((l) => l.trim());
    if (first) return first.trim();
  }
  const candidats = [
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'D:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    join(process.env.LOCALAPPDATA || '', 'JDownloader 2', 'tools', 'Windows', 'ffmpeg', 'x64', 'ffmpeg.exe'),
  ];
  return candidats.find((p) => p && existsSync(p)) || null;
}

// Développe les arguments (fichiers + dossiers récursifs) en liste de fichiers vidéo.
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
if (!args.length) { console.log('Aucun fichier recu. Fais glisser une video sur le .bat.'); process.exit(0); }

const ffmpeg = findFfmpeg();
if (!ffmpeg) {
  console.error('ffmpeg est introuvable sur ce PC.');
  console.error('Installe-le une bonne fois pour toutes en ouvrant un terminal et en tapant :');
  console.error('   winget install Gyan.FFmpeg');
  console.error('Puis ferme/rouvre la fenetre et relance ce convertisseur.');
  process.exit(1);
}

const files = [...new Set(args.flatMap(expand))];
const mb = (n) => (n / 1024 / 1024).toFixed(2);

if (!files.length) { console.log('Aucune video trouvee dans ce qui a ete depose (.mp4 .mov .avi .mkv ...).'); process.exit(0); }
const taille = MAX_WIDTH > 0 ? `largeur max ${MAX_WIDTH}` : 'taille d\'origine conservee';
console.log(`ffmpeg : ${ffmpeg}`);
console.log(`${files.length} video(s) a convertir (VP9 crf ${CRF}, audio Opus ${AUDIO_KBPS}k, ${taille})`);
console.log('L\'encodage video est lent : compte plusieurs minutes par video.\n');

let srcBytes = 0, outBytes = 0, done = 0, failed = 0;
for (const [i, src] of files.entries()) {
  const dest = src.replace(/\.[^.]+$/i, '.webm');
  console.log(`[${i + 1}/${files.length}] ${src}`);
  try {
    const inSize = statSync(src).size;
    const r = spawnSync(ffmpeg, [
      '-hide_banner', '-loglevel', 'error', '-stats', '-y',
      '-i', src,
      // Pas de -vf si MAX_WIDTH vaut 0 : la vidéo garde sa taille exacte.
      ...(MAX_WIDTH > 0 ? ['-vf', `scale='min(${MAX_WIDTH},iw)':-2`] : []),
      '-c:v', 'libvpx-vp9', '-crf', String(CRF), '-b:v', '0',
      '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'libopus', '-b:a', `${AUDIO_KBPS}k`,
      dest,
    ], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`ffmpeg a renvoye le code ${r.status}`);
    const outSize = statSync(dest).size;
    srcBytes += inSize; outBytes += outSize; done++;
    console.log(`  OK  ${mb(inSize)} Mo -> ${mb(outSize)} Mo\n`);
  } catch (e) {
    failed++;
    console.warn(`  ECHEC  ${e.message}\n`);
  }
}

console.log(`Termine : ${done} converties, ${failed} echec(s)`);
if (done) console.log(`Total : ${mb(srcBytes)} Mo -> ${mb(outBytes)} Mo  (${srcBytes ? Math.round((1 - outBytes / srcBytes) * 100) : 0} % plus leger)`);
console.log('\nL\'original a ete conserve. Deplace le .webm dans le bon dossier si besoin.');
