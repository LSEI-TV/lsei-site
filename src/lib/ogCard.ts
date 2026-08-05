// Génère la carte de partage social (1200×630, JPEG) d'un joueur :
// fond navy LSEI + photo fondue à droite + nom / sous-titre / marque à gauche.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 1200, H = 630;
const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function renderPlayerCard(name: string, photo: string | null): Promise<Buffer> {
  const upper = (name || '').toUpperCase();
  // Taille auto pour que les noms longs tiennent sur une ligne.
  const size = upper.length > 22 ? 54 : upper.length > 16 ? 66 : 82;

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
  <text x="72" y="408" font-family="Arial, sans-serif" font-size="27" font-weight="700" fill="#7E93FF">Blackball Master · Fiche carrière</text>
  <text x="72" y="556" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="2" fill="#ffffff">LSEI<tspan fill="#7E93FF">.TV</tspan></text>
</svg>`;

  return await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
}
