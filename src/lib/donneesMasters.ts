// Fichiers de résultats Blackball MASTERS publiés en JSON sous /billard/donnees/
// (pages src/pages/billard/donnees/). Lus par le site de Christophe Lambert.
const fichiers = import.meta.glob('../data/billard/results-*.json', { eager: true, import: 'default' });

// Masters uniquement : results-2026-2027 (pas results-femmes-…, results-mixte-…)
export const saisonsMasters: string[] = Object.keys(fichiers)
  .map((chemin) => chemin.split('/').pop()!.replace(/\.json$/, ''))
  .filter((nom) => /^results-\d{4}-\d{4}$/.test(nom))
  .sort();

export const donneesSaison = (nom: string) => fichiers[`../data/billard/${nom}.json`];
