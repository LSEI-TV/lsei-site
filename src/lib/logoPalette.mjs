// Couleurs d'un club tirées AUTOMATIQUEMENT de son logo (calcul au build, côté serveur).
// → changer de club / de logo (nouvelle saison) suffit : les couleurs suivent toutes seules.
// Renvoie { color, color2 } :
//   color  = teinte principale du logo, ajustée pour rester lisible (accent, textes, filets)
//   color2 = 2e teinte du logo (dégradés, bandeaux), ou une version sombre de la 1re
// null si le logo est absent ou illisible (la couleur saisie à la main sert alors de repli).
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

export async function logoPalette(publicPath, root = 'public') {
  try {
    const file = join(root, publicPath.replace(/^\//, ''));
    if (!existsSync(file)) return null;
    const { data, info } = await sharp(file).ensureAlpha().resize(120, 120, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
    // Regroupement des pixels par teinte proche (cases de 24 niveaux), hors fond transparent.
    const bins = new Map();
    let total = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i + 3] < 200) continue;
      total++;
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      if (l > 0.9 || l < 0.05) continue;     // blanc / noir pur
      if (s < 0.18) continue;                // gris
      const key = (data[i] >> 4) + ',' + (data[i + 1] >> 4) + ',' + (data[i + 2] >> 4);
      const b = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      b.n++; b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2];
      bins.set(key, b);
    }
    if (!total) return null;
    // Couleurs candidates, pondérées par surface × saturation (une couleur vive « compte » plus).
    const cands = [...bins.values()].filter((b) => b.n / total > 0.004).map((b) => {
      const r = b.r / b.n, g = b.g / b.n, bl = b.b / b.n, [h, s, l] = rgbToHsl(r, g, bl);
      return { r, g, b: bl, h, s, l, w: b.n * (0.4 + s) };
    });
    // Fusion des teintes voisines (même couleur du logo, nuances différentes).
    const groups = [];
    for (const c of cands.sort((a, b) => b.w - a.w)) {
      const g = groups.find((x) => hueDist(x.h, c.h) < 18 && Math.abs(x.l - c.l) < 0.28);
      if (g) { g.w += c.w; } else groups.push({ ...c });
    }
    if (!groups.length) return null;
    groups.sort((a, b) => b.w - a.w);
    const p = groups[0];
    // 2e couleur : nettement différente de la 1re (teinte ou clarté), assez présente.
    const q = groups.slice(1).find((g) => (hueDist(g.h, p.h) > 30 || Math.abs(g.l - p.l) > 0.3) && g.w > p.w * 0.08);
    // Deux nuances de la MÊME couleur (ex. navy + bleu roi) : la plus vive sert d'accent,
    // la plus sombre part dans les dégradés.
    if (q && hueDist(q.h, p.h) < 25 && q.l >= 0.3 && q.l <= 0.65 && q.s > p.s * 0.8 && p.l < 0.3) {
      const vivid = q;
      return finish(vivid, [p.r, p.g, p.b]);
    }
    return finish(p, q ? [q.r, q.g, q.b] : null);
  } catch {
    return null;
  }
}

function finish(p, secRgb) {
  {
    // Accent lisible sur fond sombre ET sur fond clair : clarté ramenée entre 38 % et 58 %.
    const accL = Math.min(0.58, Math.max(0.38, p.l));
    // couleur d'origine très sombre (navy, vert-noir…) : on éclaircit sans la rendre fluo
    const accS = Math.min(Math.max(p.s, 0.45), 0.45 + p.l);
    const acc = hslToRgb(p.h, accS, accL);
    const sec = secRgb ?? hslToRgb(p.h, Math.min(1, p.s), Math.max(0.12, p.l - 0.25));
    return { color: hex(...acc), color2: hex(...sec) };
  }
}
