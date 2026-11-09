// Génère la carte de partage social (1200×630, JPEG) d'un joueur :
// fond navy LSEI + photo fondue à droite + nom / sous-titre / marque à gauche.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 1200, H = 630;
const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function renderPlayerCard(name: string, photo: string | null, subtitle: string = 'Blackball Master · Fiche carrière'): Promise<Buffer> {
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
  <text x="72" y="408" font-family="Arial, sans-serif" font-size="27" font-weight="700" fill="#7E93FF">${esc(subtitle)}</text>
  <text x="72" y="556" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="2" fill="#ffffff">LSEI<tspan fill="#7E93FF">.TV</tspan></text>
</svg>`;

  return await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
}

// Carte de partage d'un CLUB de basket : fond navy teinté de la couleur du club,
// logo sur une pastille blanche à droite, nom + ville + kicker à gauche, marque LSEI.
export async function renderClubCard(name: string, subtitle: string, city: string, logo: string | null, color: string = '#1E7BE0'): Promise<Buffer> {
  const upper = (name || '').toUpperCase();
  const size = upper.length > 20 ? 58 : upper.length > 14 ? 72 : 88;

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
  <text x="72" y="300" font-family="Arial, sans-serif" font-size="25" font-weight="800" letter-spacing="2" fill="#ffffff" opacity="0.85">${esc((subtitle || '').toUpperCase())}</text>
  <text x="72" y="372" font-family="Arial, sans-serif" font-size="${size}" font-weight="800" letter-spacing="-1" fill="#ffffff">${esc(upper)}</text>
  <text x="72" y="420" font-family="Arial, sans-serif" font-size="27" font-weight="700" fill="#ffffff" opacity="0.8">${esc(city)}</text>
  <text x="72" y="560" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="2" fill="#ffffff">LSEI<tspan opacity="0.7">.TV</tspan></text>
</svg>`;

  return await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
}
