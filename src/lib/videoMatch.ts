// ============================================================
//  Reconnaissance TOLÉRANTE nom de joueur ↔ titre de vidéo.
//  Gère : accents, casse, séparateurs, ORDRE des mots (NOM Prénom ou
//  Prénom NOM), initiales (« C. Lambert » ≡ « Christophe Lambert ») et
//  noms collés/espacés (« LE FRANÇOIS » ≡ « LEFRANÇOIS »).
//  Centralisé ici pour que le tableau, les fiches et l'audit partagent
//  EXACTEMENT la même logique.
// ============================================================

const PARTICLES = new Set(['de', 'du', 'des', 'le', 'la', 'les', 'van', 'von', 'der', 'den', 'el', 'al', 'di', 'da', 'the', 'of']);

/** Normalise : sans accents, minuscules. */
export const nk = (s: string): string => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Découpe en mots significatifs (≥2 lettres, hors particules). */
export function nameTokens(s: string): string[] {
  return nk(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !PARTICLES.has(w));
}

/** Tokens « forts » (≥3 lettres) = prénoms/noms, pas les initiales. */
const strong = (toks: string[]): string[] => toks.filter((w) => w.length >= 3);

/** Deux tokens désignent-ils le même mot ? (égalité, ou l'un contenu dans
 *  l'autre pour les noms longs → gère collé/espacé « lefrancois » ⊃ « francois »). */
const tokEq = (a: string, b: string): boolean =>
  a === b || (Math.min(a.length, b.length) >= 5 && (a.includes(b) || b.includes(a)));

/**
 * Deux désignations de joueur se recoupent-elles ?
 * Vrai si elles partagent un NOM DE FAMILLE (dernier token fort de l'un ou
 * l'autre) OU au moins deux tokens forts (prénom + nom). Évite les faux
 * positifs sur un simple prénom commun (« Christophe Lambert » ≠ « Christophe Martin »).
 */
export function namesMatch(x: string, y: string): boolean {
  const tx = strong(nameTokens(x));
  const ty = strong(nameTokens(y));
  if (!tx.length || !ty.length) return false;
  const shared = tx.filter((a) => ty.some((b) => tokEq(a, b)));
  if (!shared.length) return false;
  const sxLast = tx[tx.length - 1];
  const syLast = ty[ty.length - 1];
  return shared.some((s) => tokEq(s, sxLast) || tokEq(s, syLast)) || shared.length >= 2;
}

/**
 * Un titre de vidéo concerne-t-il ce joueur ? (reconnaissance par son NOM
 * DE FAMILLE, en mot entier — tolère collé/espacé). Utilisé pour « Ses vidéos ».
 */
export function titleMatchesPlayer(title: string, playerName: string): boolean {
  const pt = strong(nameTokens(playerName));
  if (!pt.length) return false;
  const surname = pt[pt.length - 1];
  return nameTokens(title).some((w) => tokEq(w, surname));
}
