// ============================================================
//  Page replay billard : relie une vidéo à ses DONNÉES officielles (résultats Cuescore).
//  Depuis le titre (« 🎱 26-27 | BLACKBALL MASTERS | Finale – TN1 | JOLY vs LEFRANÇOIS ») :
//    - catégorie (Masters / Femmes / Para fauteuil / Para malvoyants) et saison ;
//    - joueurs cités (reconnus par leur NOM DE FAMILLE, comme « Ses matchs en vidéo ») ;
//    - le MATCH exact : tournoi (TNx, Championnat de France), phase, date, ville, score ;
//    - bilan des joueurs sur la saison et historique de leurs confrontations.
//  Rien n'est inventé : sans correspondance certaine, les blocs ne s'affichent pas.
//  Sert à enrichir la page (texte unique, liens) pour l'indexation Google.
// ============================================================
import { getSeasons } from '../data/billard/seasons';
import { getFemmesSeasons } from '../data/billard/seasonsFemmes';
import { getParaSeasons } from '../data/billard/seasonsPara';
import { getParaMvSeasons } from '../data/billard/seasonsParaMalvoyants';
import { playerSlugs } from './billardStats';
import { titleMatchesPlayer, nameTokens } from './videoMatch';

type AnySeason = { slug: string; label: string; results?: any };
interface Comp { key: string; label: string; seasons: AnySeason[]; fiche: string; seasonBase: string; tnPages: boolean }

const COMPS: Record<string, () => Comp> = {
  masters: () => ({ key: 'masters', label: 'Blackball Masters', seasons: getSeasons() as AnySeason[], fiche: '/billard/joueur/', seasonBase: '/billard/saison/', tnPages: true }),
  femmes: () => ({ key: 'femmes', label: 'Blackball Femmes', seasons: getFemmesSeasons() as AnySeason[], fiche: '/femmes/joueur/', seasonBase: '/femmes/saison/', tnPages: true }),
  para: () => ({ key: 'para', label: 'Para-billard fauteuil', seasons: getParaSeasons() as AnySeason[], fiche: '/para-billard/joueur/', seasonBase: '/para-billard/saison/', tnPages: false }),
  paramv: () => ({ key: 'paramv', label: 'Para-billard malvoyants', seasons: getParaMvSeasons() as AnySeason[], fiche: '/para-billard-malvoyants/joueur/', seasonBase: '/para-billard-malvoyants/saison/', tnPages: false }),
};
const OTHER = /snooker|chinese|\bpool\b|8\s*pool|am[eé]ricain|jeu\s+de\s+la\s+8/i;
// Compétitions sans données sur le site (Mixte, Espoirs, Ligues, Coupes…) : jamais rattachées aux Masters,
// sauf si le titre cite explicitement les Masters (ex. « TROYES MIXTE ET BLACKBALL MASTER »).
const NO_DATA = /\bmixte\b|espoir|junior|\bligue\b|coupe\s+de\s+(france|bretagne)|grand\s+open|\bUPF|\bBLS\b|interclub|\bPSG\b|r[ée]gional|d[ée]partement/i;

/** Catégorie billard déduite du titre (null si autre discipline billard). */
export function compKeyOf(title: string): string | null {
  if (!title || OTHER.test(title)) return null;
  if (/malvoyant/i.test(title)) return 'paramv';
  if (/para.?billard|fauteuil|handi/i.test(title)) return 'para';
  if (/f[ée]min|femme/i.test(title)) return 'femmes';
  if (NO_DATA.test(title) && !/master|\bBBM\b/i.test(title)) return null;
  return 'masters';
}

/** « Prénom NOM » homogène (les données mélangent « Damien Joly » et « Kevin LEFRANCOIS »). */
export const prettyName = (n: string) => {
  const w = (n || '').trim().split(/\s+/);
  return [w[0].charAt(0).toUpperCase() + w[0].slice(1).toLowerCase(), ...w.slice(1).map((x) => x.toUpperCase())].join(' ');
};

/** Saison « 2026-2027 » : préfixe du titre (« 26-27 | … ») sinon date de la vidéo (saison = sept. → août). */
export function seasonOf(title: string, iso?: string): string | null {
  const t = title || '';
  const m4 = t.match(/(?<!\d)(20\d{2})\s*[-/_]\s*(20\d{2})(?!\d)/);
  if (m4 && Number(m4[2]) === Number(m4[1]) + 1) return `${m4[1]}-${m4[2]}`;
  for (const m of t.matchAll(/(?<![\d/])(\d{2})\s*[-/_]\s*(\d{2})(?![\d/])/g)) {
    if (Number(m[2]) === Number(m[1]) + 1) return `20${m[1]}-20${m[2]}`;   // « 24/25 », « 14_15 » (années consécutives seulement)
  }
  if (!iso) return null;
  const d = new Date(iso); if (isNaN(+d)) return null;
  const y = d.getUTCFullYear(), start = d.getUTCMonth() >= 7 ? y : y - 1;
  return `${start}-${start + 1}`;
}

/** Tournoi visé par le titre : { level: 'TN1' } ou { kind: 'france' }. */
export function tournamentHint(title: string): { level?: string; kind?: string } {
  const tn = title.match(/\bTN\s*(?:N°|n°|#|no\.?)?\s*(\d{1,2})\b/i)
    || title.match(/tournoi\s+national\s*(?:N°|n°|#|no\.?)?\s*(\d{1,2})\b/i)
    || title.match(/\bmasters?\s*N°\s*(\d{1,2})\b/i);
  if (tn) return { level: `TN${Number(tn[1])}` };
  if (/championnats?\s+de\s+france|\bchpt\b.*france/i.test(title)) return { kind: 'france' };
  return {};
}
const flat = (s: string) => ' ' + (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
/** Tournoi de la saison désigné par le titre : n° de TN / Championnat de France, sinon la ville citée (si unique). */
function findTournament(title: string, R: any): any | null {
  const h = tournamentHint(title), T = R.tournaments as any[];
  if (h.level || h.kind) return T.find((t) => (h.level && t.level === h.level) || (h.kind && t.kind === h.kind)) || null;
  const ft = flat(title);
  const byCity = T.filter((t) => { const c = flat(t.city).trim(); return c.length >= 4 && ft.includes(' ' + c + ' '); });
  return byCity.length === 1 ? byCity[0] : null;
}

/** Profondeur de la phase depuis la finale : 0 = finale, 1 = demi, 2 = quart… (null si inconnue). */
function phaseDepth(title: string): number | null {
  if (/petite\s+finale|3e\s+place/i.test(title)) return null;
  if (/1\s*\/\s*32|32e/i.test(title)) return 5;
  if (/1\s*\/\s*16|16e|seizi/i.test(title)) return 4;
  if (/1\s*\/\s*8|huiti/i.test(title)) return 3;
  if (/1\s*\/\s*4|quart/i.test(title)) return 2;
  if (/1\s*\/\s*2|demi/i.test(title)) return 1;
  if (/\bfinale?\b/i.test(title)) return 0;
  return null;
}
const PHASE_FR = ['Finale', 'Demi-finale', 'Quart de finale', 'Huitième de finale', 'Seizième de finale', '32e de finale'];

const frDate = (iso: string) => (iso ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`)) : '');
/** Ville lisible : « VILLENEUVE SUR LOT » → « Villeneuve Sur Lot » (les données mélangent les casses). */
const cityFr = (c: string) => (c && c === c.toUpperCase() ? c.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : (c || ''));
const aVille = (c: string) => (/^les\s/i.test(c) ? `aux ${c.slice(4)}` : /^le\s/i.test(c) ? `au ${c.slice(3)}` : `à ${c}`);
const de = (n: string) => (/^[aeiouyéèêëàâîïôöûüh]/i.test(n) ? `d'${n}` : `de ${n}`);
const tLabel = (t: any) => (t?.kind === 'france' ? 'Championnat de France' : /^TN\d+$/i.test(t?.level || '') ? `Tournoi national n°${String(t.level).slice(2)}` : (t?.name || 'Tournoi'));
const tnSlug = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Même règle que pages/<cat>/saison/[season]/tn/[tn].astro : la page tableau n'existe que pour un tableau « propre ».
function isCleanBracket(ms: any[]): boolean {
  const sizes: Record<number, number> = {};
  for (const m of ms) sizes[m.roundNo] = (sizes[m.roundNo] || 0) + 1;
  const counts = Object.keys(sizes).map(Number).sort((a, b) => a - b).map((n) => sizes[n]);
  if (counts.length < 2 || counts[counts.length - 1] !== 1) return false;
  for (let i = 1; i < counts.length - 1; i++) if (counts[i] !== counts[i + 1] * 2) return false;
  const c1 = counts[1];
  if ((c1 & (c1 - 1)) !== 0) return false;
  return counts[0] >= 1 && counts[0] <= c1 * 2;
}

export interface ReplayPlayer { id: number; name: string; href: string; rank?: number; wins?: number; losses?: number; points?: number; invite?: boolean }
export interface ReplayInfo {
  compKey: string; compLabel: string;
  season?: { slug: string; label: string; href: string };
  players: ReplayPlayer[];
  match?: { date: string; dateFr: string; city: string; tournament: string; tHref: string; phase: string; winner: ReplayPlayer; loser: ReplayPlayer; sW: number; sL: number };
  event?: { tournament: string; tHref: string; city: string; dateFr: string; phase: string; winner?: ReplayPlayer; finalist?: ReplayPlayer; score?: string };
  h2h?: { a: ReplayPlayer; b: ReplayPlayer; aw: number; bw: number; list: { dateFr: string; season: string; tournament: string; phase: string; winner: string; score: string; current: boolean }[] };
  summary: string;        // texte unique de la page (aussi description Google)
}

export function replayInfo(title: string, iso?: string): ReplayInfo | null {
  // Compétition sans données (Mixte, Espoirs…) : on garde seulement les liens vers les fiches des joueurs (Masters),
  // sans match, tournoi ni classement (qui seraient ceux d'une autre compétition).
  let key = compKeyOf(title), playersOnly = false;
  if (!key) { if (!title || OTHER.test(title)) return null; key = 'masters'; playersOnly = true; }
  const C = COMPS[key]();
  const { slugOf } = playerSlugs(C.seasons as any);
  const seasonSlug = playersOnly ? null : seasonOf(title, iso);
  const S = C.seasons.find((s) => s.slug === seasonSlug && s.results);

  // --- joueurs cités (à nom de famille égal : saison de la vidéo d'abord, puis la plus récente) ---
  const toks = nameTokens(title);
  const order = S ? [S, ...C.seasons.filter((s) => s !== S)] : C.seasons;
  // Un mot du titre = un joueur. Correspondance exacte prioritaire ; à égalité, saison de la vidéo puis la plus récente.
  const byTok = new Map<number, { id: number; name: string; pos: number; exact: boolean }>();
  const seenIds = new Set<number>();
  for (const s of order) {
    if (!s.results) continue;
    for (const p of s.results.players as { id: number; name: string }[]) {
      if (seenIds.has(p.id) || !titleMatchesPlayer(title, p.name)) continue;
      const sur = nameTokens(p.name).filter((w) => w.length >= 3).pop() || '';
      if (!sur) continue;
      let pos = toks.indexOf(sur), exact = pos >= 0;
      if (!exact) pos = toks.findIndex((w) => Math.min(w.length, sur.length) >= 5 && (w.includes(sur) || sur.includes(w)));
      if (pos < 0) continue;
      const cur = byTok.get(pos);
      if (cur && (cur.exact || !exact)) continue;
      byTok.set(pos, { id: p.id, name: p.name, pos, exact }); seenIds.add(p.id);
    }
  }
  const players: ReplayPlayer[] = [...byTok.values()].sort((a, b) => a.pos - b.pos).slice(0, 4).map((p) => {
    const st = S ? (S.results.players as any[]).find((x) => x.id === p.id) : null;
    return { id: p.id, name: prettyName(p.name), href: `${C.fiche}${slugOf(p.id)}/`, ...(st ? { rank: st.rank, wins: st.wins, losses: st.losses, points: st.points, invite: !!st.invite } : {}) };
  });
  const info: ReplayInfo = { compKey: key, compLabel: C.label, players, summary: '',
    ...(S ? { season: { slug: S.slug, label: S.label, href: `${C.seasonBase}${S.slug}/` } } : {}) };

  // --- le match exact (2 joueurs, saison connue) ---
  if (S && players.length === 2) {
    const [A, B] = players, R = S.results;
    const pair = (m: any) => (m.aId === A.id && m.bId === B.id) || (m.aId === B.id && m.bId === A.id);
    const T = findTournament(title, R);
    let cands = (R.matches as any[]).filter((m) => pair(m) && (!T || m.tid === T.id));
    const depth = phaseDepth(title);
    if (depth != null && cands.length > 1) {
      const byPhase = cands.filter((m) => { const max = Math.max(...(R.matches as any[]).filter((x) => x.tid === m.tid && x.roundNo != null).map((x) => x.roundNo)); return m.roundNo != null && max - m.roundNo === depth; });
      if (byPhase.length) cands = byPhase;
    }
    if (cands.length > 1 && iso) {          // plusieurs rencontres : la plus proche AVANT la mise en ligne
      const before = cands.filter((m) => m.date <= iso.slice(0, 10)).sort((a, b) => (a.date < b.date ? 1 : -1));
      cands = before.length ? [before[0]] : cands;
    }
    if (cands.length === 1) {
      const m = cands[0], t = (R.tournaments as any[]).find((x) => x.id === m.tid);
      const tMs = (R.matches as any[]).filter((x) => x.tid === m.tid && x.matchno != null && x.roundNo != null);
      const max = Math.max(...tMs.map((x) => x.roundNo));
      const d = m.roundNo != null ? max - m.roundNo : -1;
      const aWin = m.sA > m.sB, wId = aWin ? m.aId : m.bId;
      const winner = wId === A.id ? A : B, loser = wId === A.id ? B : A;
      const tHref = C.tnPages && t?.level && tMs.length && isCleanBracket(tMs) ? `${C.seasonBase}${S.slug}/tn/${tnSlug(t.level)}/` : `${C.seasonBase}${S.slug}/`;
      info.match = { date: m.date, dateFr: frDate(m.date), city: cityFr(t?.city || ''), tournament: tLabel(t), tHref, phase: d >= 0 && d < PHASE_FR.length ? PHASE_FR[d] : (m.round || ''),
        winner, loser, sW: Math.max(m.sA, m.sB), sL: Math.min(m.sA, m.sB) };
    }

    // --- confrontations entre les deux joueurs, toutes saisons de la catégorie ---
    const list: NonNullable<ReplayInfo['h2h']>['list'] = [];
    let aw = 0, bw = 0;
    for (const s of C.seasons) {
      if (!s.results) continue;
      const RR = s.results;
      for (const m of (RR.matches as any[]).filter(pair)) {
        const t = (RR.tournaments as any[]).find((x) => x.id === m.tid);
        const tMs = (RR.matches as any[]).filter((x) => x.tid === m.tid && x.roundNo != null);
        const max = tMs.length ? Math.max(...tMs.map((x) => x.roundNo)) : 0, d = m.roundNo != null ? max - m.roundNo : -1;
        const aWin = m.sA > m.sB, wId = aWin ? m.aId : m.bId;
        if (wId === A.id) aw++; else bw++;
        list.push({ dateFr: frDate(m.date), season: s.label, tournament: tLabel(t), phase: d >= 0 && d < PHASE_FR.length ? PHASE_FR[d] : '',
          winner: wId === A.id ? A.name : B.name, score: `${Math.max(m.sA, m.sB)}-${Math.min(m.sA, m.sB)}`,
          current: !!info.match && m.date === info.match.date && s.slug === S.slug && m.sA + m.sB === info.match.sW + info.match.sL, ...{ _d: m.date } as any });
      }
    }
    list.sort((x: any, y: any) => (x._d < y._d ? 1 : -1));
    list.forEach((x: any) => delete x._d);
    if (list.length) info.h2h = { a: A, b: B, aw, bw, list: list.slice(0, 8) };
  }

  // --- « Le tournoi » : tournoi identifié (n° de TN, Championnat de France ou ville) mais pas de match précis ---
  if (S && !info.match) {
    const R = S.results, T = findTournament(title, R);
    if (T) {
      const tMs = (R.matches as any[]).filter((x) => x.tid === T.id && x.matchno != null && x.roundNo != null);
      const max = tMs.length ? Math.max(...tMs.map((x) => x.roundNo)) : null;
      const fin = max != null ? tMs.filter((x) => x.roundNo === max) : [];
      const P = (id: number, nm: string): ReplayPlayer => ({ id, name: prettyName(nm), href: `${C.fiche}${slugOf(id)}/` });
      const f = fin.length === 1 ? fin[0] : null;
      const d = phaseDepth(title);
      info.event = { tournament: tLabel(T), tHref: C.tnPages && T.level && tMs.length && isCleanBracket(tMs) ? `${C.seasonBase}${S.slug}/tn/${tnSlug(T.level)}/` : `${C.seasonBase}${S.slug}/`,
        city: cityFr(T.city), dateFr: frDate(T.date), phase: d != null ? PHASE_FR[d] : '',
        ...(f ? { winner: f.sA > f.sB ? P(f.aId, f.aName) : P(f.bId, f.bName), finalist: f.sA > f.sB ? P(f.bId, f.bName) : P(f.aId, f.aName), score: `${Math.max(f.sA, f.sB)}-${Math.min(f.sA, f.sB)}` } : {}) };
    }
  }

  // --- texte unique (affiché + description Google) ---
  const parts: string[] = [];
  const M = info.match;
  if (M) {
    const fem = M.phase === 'Finale' || M.phase === 'Demi-finale' ? 'disputée' : 'disputé';
    parts.push(`${M.phase ? `${M.phase} du ` : ''}${M.tournament} de ${C.label}${info.season ? ` (saison ${info.season.label.replace(/\s/g, '')})` : ''}, ${M.phase ? fem : 'disputé'} le ${M.dateFr}${M.city ? ` ${aVille(M.city)}` : ''} : ${M.winner.name} s'impose ${M.sW} à ${M.sL} face à ${M.loser.name}.`);
    if (info.h2h && info.h2h.list.length > 1) {
      const { a, b, aw, bw } = info.h2h, n = info.h2h.list.length;
      parts.push(aw === bw ? `Les deux joueurs se sont affrontés ${n} fois sur le circuit, pour un bilan à égalité (${aw}-${bw}).`
        : `Les deux joueurs se sont affrontés ${n} fois sur le circuit : ${aw > bw ? a.name : b.name} mène ${Math.max(aw, bw)} victoires à ${Math.min(aw, bw)}.`);
    }
  } else if (info.event) {
    const E = info.event, lbl = info.season ? ` (saison ${info.season.label.replace(/\s/g, '')})` : '';
    parts.push(`${E.phase ? `${E.phase} du ` : ''}${E.tournament} de ${C.label}${lbl}${E.city ? `, disputé ${aVille(E.city)}` : ''}${E.dateFr ? ` (${E.dateFr})` : ''}.`);
    if (E.winner && E.finalist) parts.push(`Le tournoi a été remporté par ${E.winner.name}, ${C.key === 'femmes' ? 'victorieuse' : 'vainqueur'} ${de(E.finalist.name)} en finale (${E.score}).`);
    if (players.length === 1 && /interview|portrait|r[ée]action/i.test(title)) parts.push(`Interview ${de(players[0].name)}.`);
  } else if (players.length === 1 && /interview|portrait|r[ée]action/i.test(title)) {
    const p = players[0];
    parts.push(`Interview ${de(p.name)}, ${C.key === 'femmes' ? 'joueuse' : 'joueur'} du circuit ${C.label}${info.season ? ` ${info.season.label.replace(/\s/g, '')}` : ''}.`);
  }
  for (const p of players) {
    if (p.rank && info.season && !p.invite) parts.push(`${p.name} occupe la ${p.rank === 1 ? '1re' : `${p.rank}e`} place du classement ${info.season.label.replace(/\s/g, '')} (${p.wins} victoire${(p.wins || 0) > 1 ? 's' : ''}, ${p.losses} défaite${(p.losses || 0) > 1 ? 's' : ''}).`);
  }
  info.summary = parts.join(' ');
  return info;
}
