// Mise en forme « guide TV » des titres de diffusion pour la grille Programme.
//
// Nomenclature des titres YouTube (séparateur « | ») :
//   <DISCIPLINE + niveau> | <partie(s) du milieu> | <affiche / contexte>
// Exemples :
//   BLACKBALL MASTERS | 1/2 FINALE | TN7 - CAVAILLON
//   🏀 BASKETBALL NM1 25/26 | JOURNÉE 22 | 03/05/2026 | Fougères vs Le Havre STB
//
// Découpage souple (3, 4, 5 parties…) :
//   - 1re partie      → « kicker » : le niveau/catégorie (la discipline en est retirée)
//   - parties du milieu → badges (phase, journée, date…)
//   - dernière partie → « main » : l'affiche (le match ou le lieu/contexte)

// Abréviations développées automatiquement à l'affichage. Complétable à volonté.
const ABBR: [RegExp, string][] = [
  [/\bTN\s*([1-9]|1[0-2])\b/gi, 'Tournoi National $1'],
  [/\bCDF\b/gi, 'Coupe de France'],
  [/\bCDM\b/gi, 'Coupe du Monde'],
  [/\bCHPT\b/gi, 'Championnat'],
  [/\bChpt\b/g, 'Championnat'],
];

export function expandAbbr(s: string): string {
  let out = s || '';
  for (const [re, rep] of ABBR) out = out.replace(re, rep);
  return out.trim();
}

// Retire une éventuelle émoji/ponctuation de tête.
const stripEmoji = (s: string) => (s || '').replace(/^[^\p{L}\p{N}(]+/u, '').trim();

// Retire le mot de discipline en tête de la 1re partie (la discipline est déjà
// affichée via le tag couleur) : « BLACKBALL MASTERS » → « MASTERS ».
const LEAD = /^(blackball|basketball|basket|palets?|subbuteo|football|foot|bowling|beach[- ]?volley|beach|volley|billard|snooker)\b[\s:–-]*/i;
const stripLead = (s: string) => stripEmoji(s).replace(LEAD, '').trim();

export interface ParsedTitle { kicker: string; main: string; badges: string[] }

export function parseProgTitle(title: string): ParsedTitle {
  const parts = (title || '').split('|').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return { kicker: '', main: expandAbbr(stripEmoji(title)), badges: [] };
  return {
    kicker: expandAbbr(stripLead(parts[0])),
    main: expandAbbr(parts[parts.length - 1]),
    badges: parts.slice(1, -1).map(expandAbbr),
  };
}
