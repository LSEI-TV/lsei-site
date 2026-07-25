// Génère l'image de partage réseaux sociaux (Open Graph) : public/og-image.jpg (1200x630).
// La police Oswald est intégrée en base64 pour un rendu identique au site.
//   node scripts/make-og-image.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const fontB64 = readFileSync('public/fonts/oswald-latin.woff2').toString('base64');
const font = `data:font/woff2;base64,${fontB64}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <style>
      @font-face { font-family:'Oswald'; font-weight:700; src:url('${font}') format('woff2'); }
      @font-face { font-family:'Oswald'; font-weight:500; src:url('${font}') format('woff2'); }
      @font-face { font-family:'Oswald'; font-weight:300; src:url('${font}') format('woff2'); }
      text { font-family:'Oswald','Arial',sans-serif; }
    </style>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0C0E13"/>
      <stop offset="1" stop-color="#1A1E28"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3AAA35"/>
      <stop offset="0.34" stop-color="#009FE3"/>
      <stop offset="0.67" stop-color="#E6007E"/>
      <stop offset="1" stop-color="#F39200"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Motif : grandes barres de marque en filigrane, à droite -->
  <g opacity="0.10" transform="translate(880,120)">
    <rect x="0"   y="70"  width="46" height="330" fill="#3AAA35"/>
    <rect x="66"  y="0"   width="46" height="450" fill="#009FE3"/>
    <rect x="132" y="30"  width="46" height="390" fill="#E6007E"/>
    <rect x="198" y="110" width="46" height="250" fill="#F39200"/>
  </g>

  <!-- Badge ON AIR -->
  <g transform="translate(90,84)">
    <rect x="0" y="0" width="150" height="42" rx="21" fill="#FF5B4D"/>
    <circle cx="26" cy="21" r="7" fill="#0C0E13"/>
    <text x="44" y="30" font-weight="700" font-size="22" fill="#0C0E13" letter-spacing="2">ON AIR</text>
  </g>

  <!-- Marque : 4 barres + wordmark -->
  <g transform="translate(90,190)">
    <rect x="0"  y="24" width="26" height="112" fill="#3AAA35"/>
    <rect x="38" y="0"  width="26" height="150" fill="#009FE3"/>
    <rect x="76" y="10" width="26" height="130" fill="#E6007E"/>
    <rect x="114" y="42" width="26" height="82"  fill="#F39200"/>
  </g>
  <text x="260" y="255" font-weight="700" font-size="92" fill="#F1F3F7" letter-spacing="1">LE SPORT</text>
  <text x="260" y="345" font-weight="700" font-size="92" fill="#F1F3F7" letter-spacing="1">EN IMAGE</text>

  <!-- Filet dégradé -->
  <rect x="92" y="392" width="640" height="6" rx="3" fill="url(#rule)"/>

  <!-- Tagline -->
  <text x="92" y="452" font-weight="500" font-size="40" fill="#F1F3F7">La web TV associative du sport</text>

  <!-- Disciplines -->
  <text x="92" y="512" font-weight="300" font-size="22" fill="#A7AEBE" letter-spacing="0.8">BILLARD · BASKET · FOOTBALL · PALETS · BEACH-VOLLEY · BOWLING · SUBBUTEO</text>

  <!-- URL -->
  <text x="92" y="580" font-weight="700" font-size="34" fill="#7E93FF">lsei.tv</text>
</svg>`;

await sharp(Buffer.from(svg))
  .jpeg({ quality: 88 })
  .toFile('public/og-image.jpg');

console.log('public/og-image.jpg généré (1200x630).');
