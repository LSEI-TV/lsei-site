// Génère la carte de partage social (1200×630, JPEG) d'un joueur :
// fond navy LSEI + photo fondue à droite + nom / sous-titre / marque à gauche.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 1200, H = 630;
const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Taille de police qui garantit que `text` tient dans `maxWidth` (estimation largeur de glyphe
// = factor × taille ; factor plus élevé si lettres espacées). Évite tout débordement/coupe.
const fitSize = (text: string, maxWidth: number, maxSize: number, factor = 0.62) =>
  Math.max(18, Math.min(maxSize, Math.floor(maxWidth / Math.max(1, (text || '').length * factor))));

export async function renderPlayerCard(name: string, photo: string | null, subtitle: string = 'Blackball Master · Fiche carrière'): Promise<Buffer> {
  const upper = (name || '').toUpperCase();
  // Taille auto pour que les noms longs tiennent (le nom peut recouvrir la photo atténuée).
  const size = fitSize(upper, 760, 82);

  let photoTag = '';
  if (photo) {
    try {
      const buf = readFileSync(join('public', photo.replace(/^\//, '')));
      const png = await sharp(buf).resize(720, 720, { fit: 'cover' }).png().toBuffer();
      photoTag = `<image x="560" y="-45" width="720" height="720" xlink:href="data:image/png;base64,${png.toString('base64')}"/>`;
    } catch { /* pas de photo -> carte texte seule */ }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#0A0E1A"/>
  ${photoTag}
  <rect width="${W}" height="${H}" fill="url(#scrim)"/>
  <defs><linearGradient id="scrim" x1="0" x2="1">
    <stop offset="0.40" stop-color="#0A0E1A"/>
    <stop offset="0.74" stop-color="#0A0E1A" stop-opacity="0"/>
  </linearGradient></defs>
  <rect x="72" y="250" width="56" height="6" rx="3" fill="#1E7BE0"/>
  <text x="72" y="358" font-family="Arial, sans-serif" font-size="${size}" font-weight="800" letter-spacing="-1" fill="#ffffff">${esc(upper)}</text>
  <text x="72" y="408" font-family="Arial, sans-serif" font-size="27" font-weight="700" fill="#7E93FF">${esc(subtitle)}</text>
  <text x="72" y="556" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="2" fill="#ffffff">LSEI<tspan fill="#7E93FF">.TV</tspan></text>
</svg>`;

  return await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
}

// Carte de partage d'un CLUB de basket : fond navy teinté de la couleur du club,
// logo sur une pastille blanche à droite, nom + ville + kicker à gauche, marque LSEI.
export async function renderClubCard(name: string, subtitle: string, city: string, logo: string | null, color: string = '#1E7BE0'): Promise<Buffer> {
  const upper = (name || '').toUpperCase();
  const subUpper = (subtitle || '').toUpperCase();
  // Tailles auto : tout tient dans la colonne de gauche (avant la pastille du logo à x=675).
  const size = fitSize(upper, 560, 88);
  const subSize = fitSize(subUpper, 560, 25, 0.78);
  const citySize = fitSize(city, 560, 27);

  let logoTag = '';
  if (logo) {
    try {
      const buf = readFileSync(join('public', logo.replace(/^\//, '')));
      const png = await sharp(buf).resize(360, 360, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
      logoTag = `<image x="740" y="135" width="360" height="360" xlink:href="data:image/png;base64,${png.toString('base64')}"/>`;
    } catch { /* pas de logo -> carte texte seule */ }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${esc(color)}"/>
    <stop offset="0.55" stop-color="#0A0E1A"/>
    <stop offset="1" stop-color="#0A0E1A"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="#0A0E1A"/>
  <rect width="${W}" height="${H}" fill="url(#bg)" opacity="0.9"/>
  <rect width="${W}" height="8" fill="${esc(color)}"/>
  <circle cx="855" cy="315" r="300" fill="#ffffff" opacity="0.06"/>
  <rect x="675" y="135" width="360" height="360" rx="40" fill="#ffffff"/>
  ${logoTag}
  <rect x="72" y="238" width="56" height="6" rx="3" fill="#ffffff"/>
  <text x="72" y="300" font-family="Arial, sans-serif" font-size="${subSize}" font-weight="800" letter-spacing="1" fill="#ffffff" opacity="0.85">${esc(subUpper)}</text>
  <text x="72" y="372" font-family="Arial, sans-serif" font-size="${size}" font-weight="800" letter-spacing="-1" fill="#ffffff">${esc(upper)}</text>
  <text x="72" y="420" font-family="Arial, sans-serif" font-size="${citySize}" font-weight="700" fill="#ffffff" opacity="0.8">${esc(city)}</text>
  <text x="72" y="560" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="2" fill="#ffffff">LSEI<tspan opacity="0.7">.TV</tspan></text>
</svg>`;

  return await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
}
