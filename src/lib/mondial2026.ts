// Championnat du Monde WPA Blackball 2026 (Londres) : parcours des Bleus pour leurs fiches joueurs.
// Données : src/data/billard/mondial-2026.json, généré par D:\FFB\montage-edf-blackball-2026\cdm-cuescore\export_lsei.py
import data from '../data/billard/mondial-2026.json';

export interface MondialMatch { tour?: string; phase?: string; adv: string; pays?: string; score: string; res: string; date: string; lui?: { g: number; f: number; cg: number } | null }
export interface MondialBloc { cat: string; col: string; lib: string; etat: string; v: number; d: number; matchs?: MondialMatch[]; partenaire?: string }
export interface MondialEquipe extends MondialBloc { g: number; f: number; cg: number; pct: number; rencontres: MondialMatch[] }
export interface MondialJoueur {
  nom: string;
  medailles: { m: 'or' | 'argent' | 'bronze'; epreuve: string; lib: string }[];
  gp: { epreuve: string; lib: string; etat: string; partenaire: string }[];
  equipe?: MondialEquipe; simple?: MondialBloc; double?: MondialBloc;
}

const J = (data as any).joueurs as Record<string, MondialJoueur>;
export const mondialMaj: string = (data as any).maj;
export const mondialFini: boolean = (data as any).fini;

const slugify = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Parcours d'un joueur (par slug de fiche, sinon par nom). */
export function mondialDe(slug: string, nom?: string): MondialJoueur | null {
  return J[slug] || (nom ? J[slugify(nom)] : null) || null;
}

/** Titres de champion du monde, pour le palmarès de la fiche. */
export function titresMondiaux(slug: string, nom?: string): { titre: string; label: string }[] {
  const j = mondialDe(slug, nom);
  return j ? j.medailles.filter((m) => m.m === 'or').map((m) => ({ titre: m.lib, label: `${m.epreuve} · Mondial de Londres 2026` })) : [];
}
