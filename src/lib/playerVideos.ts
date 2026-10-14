// ============================================================
//  « Ses matchs en vidéo » — construit la liste COMPLÈTE des vidéos d'un joueur
//  pour sa fiche, en fusionnant :
//    1) le cache catégorisé du site (replays.json, via getReplays) ;
//    2) la chaîne YouTube COMPLÈTE (channel-billard.json) — récupère les vidéos
//       qui ne sont dans aucune playlist classée (anciens matchs non rangés).
//  Reliage par le NOM DE FAMILLE (titleMatchesPlayer) + filtrage par catégorie.
// ============================================================
import channelBillard from '../data/billard/channel-billard.json';
import { parseProgTitle } from './programmeTitle';
import { titleMatchesPlayer, nk } from './videoMatch';

export type PlayerVideoCard = { id: string; main: string; sub: string; cat: string };
export type VideoMode = 'masters' | 'femmes' | 'para';

// Autres disciplines billard à EXCLURE des fiches blackball (snooker, pool/américain, chinese 8…).
const OTHER = /snooker|chinese|\bpool\b|8\s*pool|americain|américain|blackball\s*star|gareth\s*potts/i;
const FEMME = /femme/i;
const PARA = /para.?billard|fauteuil|malvoyant/i;
const BLACKBALL = /blackball|\bbbm\b|master/i;   // marqueur « blackball master » dans un titre

// Mots « structurels » ignorés pour la signature (ne distinguent pas un match d'un autre).
const STRUCT = new Set([
  'ffb', 'replay', 'soiree', 'billard', 'blackball', 'black', 'ball', 'master', 'masters', 'bbm', 'bb',
  'live', 'eme', 'ieme', 'rt', 'finale', 'final', 'demi', 'vs', 'interview', 'inter', 'vainqueur',
  'mixte', 'tour', 'tn', 'shot', 'express', 'avec', 'sur', 'reportage', 'mp4', 'de', 'du', 'des',
  'le', 'la', 'les', 'et', 'en', 'au', 'aux', 'championnat', 'france', 'chpt', 'pool',
]);
// Signature d'un match : noms + lieu + saison + n° de tour (ordre indifférent) → les
// ré-uploads du même match ont la même signature.
function matchSig(title: string): string {
  const toks = nk(title).split(/[^a-z0-9]+/)
    .filter((w) => w && !STRUCT.has(w) && (w.length >= 2 || /\d/.test(w)));
  return [...new Set(toks)].sort().join(' ');
}

export function playerVideos(name: string, replays: any[], mode: VideoMode): PlayerVideoCard[] {
  const seen = new Set<string>();
  const seenSig = new Set<string>();
  const out: PlayerVideoCard[] = [];
  const add = (id: string, title: string, category: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    const sig = matchSig(title);
    if (sig && seenSig.has(sig)) return;   // ré-upload quasi-identique → ignoré
    seenSig.add(sig);
    const pt = parseProgTitle(title);
    out.push({ id, main: pt.main || title, sub: [pt.kicker, ...pt.badges].filter(Boolean).join(' · '), cat: category || '' });
  };

  // 1) Cache catégorisé (fiable) : on garde le comportement existant par catégorie.
  for (const v of replays) {
    const t = v.title || '';
    if (!titleMatchesPlayer(t, name)) continue;
    if (mode === 'masters' && (FEMME.test(t) || PARA.test(t))) continue;
    if (mode === 'femmes' && !(v.category === 'Femmes' || FEMME.test(t))) continue;
    if (mode === 'para' && !(v.category === 'Para-billard' || PARA.test(t))) continue;
    add(v.id, t, v.category || '');
  }

  // 2) Chaîne complète : vidéos absentes du cache, filtrées par titre pour rester dans la bonne catégorie.
  for (const v of channelBillard as { id: string; title: string }[]) {
    const t = v.title || '';
    if (seen.has(v.id) || !titleMatchesPlayer(t, name) || OTHER.test(t)) continue;
    if (mode === 'masters') { if (FEMME.test(t) || PARA.test(t) || !BLACKBALL.test(t)) continue; }
    else if (mode === 'femmes') { if (!FEMME.test(t)) continue; }
    else if (mode === 'para') { if (!PARA.test(t)) continue; }
    add(v.id, t, '');
  }

  return out;
}
