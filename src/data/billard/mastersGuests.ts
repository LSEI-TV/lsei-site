// Invités (wildcards) du Blackball Master 2026-2027 — CALCULÉS AUTOMATIQUEMENT.
//
// Règle sportive (vérifiée) : les 4 invités d'une étape du Masters sont le TOP 4 du
// tournoi « Mixte National » de l'étape PRÉCÉDENTE.
//   Masters TN(n)  ←  Mixte National TN(n-1)
// Contrôle : le top 4 du Mixte TN1 (Fumel) = Lechat, Bounif, Robert, Abdou = exactement
// les invités du Masters TN2. Donc le top 4 du Mixte TN2 (Albi) donne les invités du TN3, etc.
//
// Source : results-mixte-2026-2027.json, rafraîchi 2×/jour depuis Cuescore (refresh-data.yml) :
// dès qu'une étape Mixte est jouée, les invités de l'étape Masters suivante apparaissent seuls.
// Une étape Mixte pas encore terminée → pas de finale décidée → aucun invité (étape en attente).
//
// Le TN1 n'a pas de feeder dans la saison courante (il viendrait du dernier Mixte de la saison
// précédente) : on le garde donc en liste manuelle.
import rmixte from './results-mixte-2026-2027.json';

interface MixteMatch { tid: string; aName: string; bName: string; sA: number; sB: number; roundNo?: number | null }
interface MixteTournament { id: string; level?: string }

// Étape Masters (slug du calendrier) → numéro de l'étape Mixte National qui l'alimente.
const FEEDER: Record<string, number> = {
  tn2: 1, tn3: 2, tn4: 3, tn5: 4, tn6: 5, tn7: 6, 'tn8-cdf': 7, france: 8,
};

// Invités saisis à la main (feeder hors saison courante / cas particuliers). Priment sur le calcul.
const MANUAL: Record<string, string[]> = {
  tn1: ['Kevin Lefrançois', 'Arthur Crespin', 'Fabien Langlet', 'Frédéric Moreau'],
};

const winnerLoser = (m: MixteMatch): [string, string] =>
  (m.sA ?? 0) > (m.sB ?? 0) ? [m.aName, m.bName] : [m.bName, m.aName];

/** Top 4 d'un tournoi à élimination directe : champion, finaliste, puis les 2 perdants de
 *  demi-finale (le mieux placé = celui qui a marqué le plus en demi). [] si pas de finale décidée. */
function top4ForLevel(level: number): string[] {
  const t = (rmixte.tournaments as MixteTournament[]).find(
    (x) => Number(String(x.level ?? '').replace(/\D/g, '')) === level && /^TN/i.test(x.level ?? ''),
  );
  if (!t) return [];
  const ms = (rmixte.matches as MixteMatch[]).filter(
    (m) => String(m.tid) === String(t.id) && typeof m.roundNo === 'number',
  );
  if (!ms.length) return [];
  const rmax = Math.max(...ms.map((m) => m.roundNo as number));
  const final = ms.filter((m) => m.roundNo === rmax);
  // Finale unique et décidée (scores présents et différents) → le tournoi est terminé.
  if (final.length !== 1 || final[0].sA == null || final[0].sB == null || final[0].sA === final[0].sB) return [];
  const [champion, finalist] = winnerLoser(final[0]);
  const semis = ms.filter((m) => m.roundNo === rmax - 1);
  const semiLosers = semis
    .map((m) => ({ loser: winnerLoser(m)[1], score: Math.min(m.sA ?? 0, m.sB ?? 0) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.loser);
  return [champion, finalist, ...semiLosers].filter(Boolean).slice(0, 4);
}

// Table finale : étape Masters → noms des invités. Les étapes manuelles priment ; sinon calcul.
export const mastersGuests2627: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const [slug, lvl] of Object.entries(FEEDER)) {
    const names = top4ForLevel(lvl);
    if (names.length) out[slug] = names;
  }
  return { ...out, ...MANUAL };
})();
