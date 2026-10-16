// ============================================================
//  « Affiche » d'un match à partir du TITRE de la vidéo (automatique) :
//   - basket : les 2 clubs reconnus (nom, ville ou sigle) → logos, + score / journée / rang
//     si le match est retrouvé dans le calendrier NM1 de la saison (même affiche, ±4 jours) ;
//   - billard : les 2 joueurs reconnus (lib/replayMatch) → photos détourées, + score officiel.
//  Sert au programme (« Déjà joués ») et à l'en-tête des pages de match (/replay/<id>/).
//  Rien n'est inventé : sans correspondance certaine, pas d'affiche (la page garde son titre).
// ============================================================
import { nmClubs, nmClubBy, poolCalendar, nm1Standings, clubHasSite, nm1Calendar } from '../data/basket';
import { assetExists, assetUrl } from './publicAssets';
import { photoOf } from './billardStats';
import { replayInfo, type ReplayInfo } from './replayMatch';
import playerCutouts from '../data/billard/player-cutouts.json';

export interface Side { name: string; img: string | null; cut?: boolean; short?: string; href?: string; rank?: number; win?: boolean }
export interface Affiche {
  sport: 'basket' | 'billard';
  sides: [Side, Side];
  score?: [number, number];   // dans l'ordre des côtés
  round?: number;             // journée (basket)
  date?: string;              // date réelle du match (AAAA-MM-JJ) quand elle est connue
  info?: ReplayInfo | null;   // billard : données officielles complètes
}

const flat = (s: string) => ' ' + (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
// Sigles employés dans les titres YouTube (en plus du nom et de la ville du club).
const ALIASES: Record<string, string[]> = { fougeres: ['pfb', 'pays de fougeres'], tarbes: ['tglb', 'union tarbes'], sables: ['les sables'] };

/** Les 2 clubs NM1 cités dans un titre, dans l'ordre où ils apparaissent. */
export function teamsFromTitle(title: string): [string, string] | undefined {
  const t = flat(title);
  const found = nmClubs
    .map((c) => {
      const keys = [c.name, c.city, ...(ALIASES[c.slug] ?? [])].map((k) => flat(k).trim()).filter((k) => k.length >= 3);
      const at = Math.min(...keys.map((k) => { const i = t.indexOf(' ' + k + ' '); return i < 0 ? Infinity : i; }));
      return { slug: c.slug, at };
    })
    .filter((x) => x.at !== Infinity).sort((a, b) => a.at - b.at);
  return found.length >= 2 ? [found[0].slug, found[1].slug] : undefined;
}

const logoOf = (slug: string) => { const c = nmClubBy(slug); return c && assetExists(c.logo) ? assetUrl(c.logo!) : null; };
const dayDiff = (a: string, b: string) => Math.abs(Date.parse(a.slice(0, 10) + 'T12:00:00Z') - Date.parse(b.slice(0, 10) + 'T12:00:00Z')) / 86400000;

export function basketAffiche(title: string, iso?: string): Affiche | null {
  const tm = teamsFromTitle(title);
  if (!tm) return null;
  // Le match du calendrier de la saison : même affiche, date la plus proche (±4 jours).
  const game = iso ? poolCalendar()
    .filter((m) => (m.homeSlug === tm[0] && m.awaySlug === tm[1]) || (m.homeSlug === tm[1] && m.awaySlug === tm[0]))
    .map((m) => ({ m, d: dayDiff(m.date, iso) })).filter((x) => x.d <= 4).sort((a, b) => a.d - b.d)[0]?.m : undefined;
  const order: [string, string] = game ? [game.homeSlug, game.awaySlug] : tm;
  const standings = game ? nm1Standings() : [];
  const played = game && game.homeScore != null && game.awayScore != null;
  const side = (sl: string, i: number): Side => {
    const c = nmClubBy(sl)!;
    const r = standings.findIndex((x) => x.slug === sl);
    return { name: c.name, short: c.short, img: logoOf(sl), href: clubHasSite(sl) ? `/clubs/${sl}/` : undefined,
      ...(r >= 0 ? { rank: r + 1 } : {}),
      ...(played ? { win: i === 0 ? game!.homeScore! > game!.awayScore! : game!.awayScore! > game!.homeScore! } : {}) };
  };
  return { sport: 'basket', sides: [side(order[0], 0), side(order[1], 1)],
    ...(played ? { score: [game!.homeScore!, game!.awayScore!] as [number, number] } : {}),
    ...((game?.round ?? (game && nm1Calendar.find((m) => m.date === game.date && m.homeSlug === game.homeSlug)?.round)) ? { round: game!.round ?? nm1Calendar.find((m) => m.date === game!.date && m.homeSlug === game!.homeSlug)!.round } : {}), ...(game ? { date: game.date } : {}) };
}

const cutoutOf = (id: number) => { const k = (playerCutouts as Record<string, string>)[String(id)]; return k ? `/billard/cutouts/${k}.png` : null; };

export function billardAffiche(title: string, iso?: string): Affiche | null {
  const info = replayInfo(title, iso);
  if (!info || info.players.length !== 2) return null;   // un vrai face-à-face uniquement (pas les interviews)
  if (!/\bvs?\.?\s|\bcontre\b/i.test(title)) return null;   // vrai face-à-face : « JOLY vs LEFRANÇOIS »
  const [a, b] = info.players;
  const side = (p: typeof a): Side => {
    const cut = cutoutOf(p.id);
    return { name: p.name, href: p.href, img: cut ?? photoOf({ id: p.id, name: p.name } as any, info.season?.slug), cut: !!cut,
      ...(p.rank && !p.invite ? { rank: p.rank } : {}),
      ...(info.match ? { win: info.match.winner.id === p.id } : {}) };
  };
  const score = info.match ? (info.match.winner.id === a.id ? [info.match.sW, info.match.sL] : [info.match.sL, info.match.sW]) as [number, number] : undefined;
  return { sport: 'billard', sides: [side(a), side(b)], ...(score ? { score } : {}), ...(info.match?.date ? { date: info.match.date.slice(0, 10) } : {}), info };
}

/** Affiche selon la discipline de la vidéo (null pour les autres sports ou sans correspondance). */
export function matchAffiche(discipline: string, title: string, iso?: string): Affiche | null {
  if (discipline === 'basket') return basketAffiche(title, iso);
  if (discipline === 'billard') return billardAffiche(title, iso);
  return null;
}
