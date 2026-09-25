// ============================================================
//  IMPORT PONCTUEL des équipes NM1 Poule B (hors Fougères, déjà fait).
//  Copie depuis D:\BASKET\Equipes\<dossier>\ vers public/basket/<slug>/ :
//    - PHOTOS/*.(png|jpg)  → <même nom>.webp  (joueurs « N-Prenom_Nom-poste » + « staff-… »)
//    - logo.png            → logo.webp
//  Conversion WebP via sharp (allège ~18 Mo → ~3 Mo). Lancer une seule fois :
//    node scripts/import-basket-teams.mjs
//  (Ce n'est PAS un script CI : ce sont des assets statiques copiés une fois.)
// ============================================================
import sharp from 'sharp';
import { readdirSync, mkdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const SRC_BASE = 'D:/BASKET/Equipes';
const DST_BASE = resolve('public/basket');

// slug LSEI → dossier source (Fougères exclu : photos déjà posées à la main).
const TEAMS = {
  angers: 'Angers',
  bordeaux: 'JSA BORDEAUX',
  challans: 'CHALLANS',
  chartres: 'Chartres',
  laval: 'LAVAL',
  lorient: 'Lorient',
  'pole-france': 'POLE FRANCE',
  rennes: 'RENNES',
  sables: 'Les-sables_d_olonne',
  tarbes: 'Tarbes_Lourdes',
  toulouse: 'Toulouse',
  tours: 'Tours',
  vitre: 'VITRE',
};

const isRaster = (f) => /\.(png|jpe?g)$/i.test(f);
const findDir = (dir, re) => { try { return readdirSync(dir).find((e) => re.test(e) && statSync(join(dir, e)).isDirectory()); } catch { return undefined; } };
const findFile = (dir, res) => { let ls = []; try { ls = readdirSync(dir); } catch { return undefined; } for (const re of res) { const f = ls.find((x) => re.test(x)); if (f) return f; } return undefined; };

let totalImgs = 0, totalTeams = 0;
for (const [slug, folder] of Object.entries(TEAMS)) {
  const srcTeam = join(SRC_BASE, folder);
  const dst = join(DST_BASE, slug);
  const photosDir = findDir(srcTeam, /^photos$/i);
  if (!photosDir) { console.warn(`⚠ ${slug} : dossier PHOTOS introuvable dans ${srcTeam} — ignoré.`); continue; }
  mkdirSync(dst, { recursive: true });

  // Photos joueurs + staff → webp (on garde le nom de base pour le résolveur).
  const src = join(srcTeam, photosDir);
  let n = 0;
  for (const f of readdirSync(src)) {
    if (!isRaster(f)) continue;
    const base = f.replace(/\.[^.]+$/, '');
    await sharp(join(src, f)).webp({ quality: 82 }).toFile(join(dst, `${base}.webp`));
    n++;
  }

  // Logo (raster) → logo.webp. Repli : premier fichier « logo*.png/jpg ».
  const logoFile = findFile(srcTeam, [/^logo\.(png|jpe?g)$/i, /^logo.*\.(png|jpe?g)$/i]);
  if (logoFile) {
    await sharp(join(srcTeam, logoFile)).resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 }).toFile(join(dst, 'logo.webp'));
  } else {
    console.warn(`⚠ ${slug} : pas de logo raster trouvé.`);
  }

  console.log(`✓ ${slug} : ${n} photos + ${logoFile ? 'logo' : 'sans logo'} → ${dst}`);
  totalImgs += n; totalTeams++;
}
console.log(`\n=== ${totalTeams} équipes, ${totalImgs} photos converties en WebP. ===`);
