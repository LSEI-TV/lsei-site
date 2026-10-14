// Extrait la/les couleur(s) du POLO depuis une photo détourée (fond transparent).
// Échantillonne la zone du torse, ignore transparence / peau / blanc / noir, puis :
//   - repère la TEINTE dominante (accent), même peu saturée (ex. violet feutré) ;
//   - repère le neutre (gris/foncé) dominant ;
//   - renvoie un dégradé 2 tons (accent en haut, neutre foncé en bas) → « le mélange »,
//     ou un dégradé mono si le polo n'a qu'une seule couleur, ou gris si polo neutre.
//   node scripts/jersey-color.mjs <image> [label]
import sharp from 'sharp';

const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6; }
  return [h * 360, s, l];
};
const hslToHex = (h, s, l) => {
  h /= 360; const f = (n) => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255); };
  return '#' + [f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, '0')).join('');
};
// Peau (y compris peau foncée / à l'ombre, fréquente quand le joueur a les bras croisés
// sur le torse) : teinte chaude r>g>b, large plage de clarté/saturation.
const isSkin = (r, g, b) => { const [h, s, l] = rgbToHsl(r, g, b); return h >= 7 && h <= 50 && s >= 0.17 && s <= 0.80 && l >= 0.22 && l <= 0.86 && r > g && g > b; };
const avgHsl = (o) => rgbToHsl(Math.round(o.r / o.n), Math.round(o.g / o.n), Math.round(o.b / o.n));

export async function jerseyColor(path) {
  const { data, info } = await sharp(path).resize(140, null, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const chroma = new Map();                 // paquet de teinte (~18°) → {n,r,g,b}
  const neut = { n: 0, r: 0, g: 0, b: 0 };   // pixels neutres (gris / foncé)
  let total = 0;
  for (let y = Math.floor(height * 0.52); y < Math.floor(height * 0.98); y++) {
    for (let x = Math.floor(width * 0.18); x < Math.floor(width * 0.82); x++) {
      const i = (y * width + x) * channels;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 200) continue;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), ch = mx - mn;
      if (mn > 210 && ch < 26) continue;      // blanc
      if (mx < 34) continue;                   // noir profond
      if (isSkin(r, g, b)) continue;           // peau
      total++;
      if (ch >= 20) {                          // pixel coloré : a une teinte nette (même peu saturée)
        const [h] = rgbToHsl(r, g, b);
        const key = Math.round(h / 18);        // paquets de teinte ~18° → regroupe un violet clair et foncé
        let e = chroma.get(key); if (!e) { e = { n: 0, r: 0, g: 0, b: 0 }; chroma.set(key, e); }
        e.n++; e.r += r; e.g += g; e.b += b;
      } else {                                 // gris / neutre foncé
        neut.n++; neut.r += r; neut.g += g; neut.b += b;
      }
    }
  }
  if (!total) return null;

  const accBucket = [...chroma.values()].sort((a, b) => b.n - a.n)[0];
  const accFrac = accBucket ? accBucket.n / total : 0;
  const neutFrac = neut.n / total;

  // Accent net (au moins 10 % du torse) → couleur identitaire visible.
  if (accBucket && accFrac >= 0.10) {
    const [ah, as] = avgHsl(accBucket);
    const aS = Math.min(0.70, Math.max(0.34, as));     // remonte un accent feutré pour qu'il se voie
    const band = hslToHex(ah, aS, 0.30);               // haut = accent
    let band2;
    if (neut.n && neutFrac >= 0.18) {                  // polo bicolore (accent + gris) → on montre le mélange
      const [nh, ns] = avgHsl(neut);
      band2 = hslToHex(nh, Math.min(0.26, ns), 0.14);  // bas = neutre foncé
    } else {                                           // polo monochrome → dégradé du même accent
      band2 = hslToHex(ah, aS, 0.16);
    }
    return { dominant: band, band, band2 };
  }

  // Pas d'accent net → polo neutre (gris/foncé) : garder le gris, NE PAS forcer une couleur.
  if (neut.n) {
    const [nh, ns] = avgHsl(neut);
    const nS = Math.min(0.16, ns);
    return { dominant: hslToHex(nh, nS, 0.24), band: hslToHex(nh, nS, 0.28), band2: hslToHex(nh, nS, 0.15) };
  }
  return null;
}

if (process.argv[2]) {
  const r = await jerseyColor(process.argv[2]);
  console.log((process.argv[3] || process.argv[2]) + ' →', r);
}
