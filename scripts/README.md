# Ajouter une saison Blackball (Masters ou Féminin)

Le site est piloté par les données : une fois le fichier de résultats d'une saison
ajouté, **tout se recalcule** (classement, vignettes, fiches carrière, comparateur,
faits marquants, palmarès, page de choix `/billard/hub`, sélecteur de saison…).

Ajouter une saison = **2 étapes**.

## 1. Générer le fichier de résultats

Récupère le **lien de classement Cuescore** de la saison. L'`id` est le nombre à la
fin de l'URL, ex. `https://cuescore.com/ranking/FFB+-+Blackball+-+TN+-+Féminin/65726152`
→ id = `65726152`.

```bash
# Féminin
npm run gen:season -- --ranking=<ID> \
  --out=src/data/billard/results-femmes-2026-2027.json \
  --competition="Blackball Féminin" --season="2026/2027"

# Masters
npm run gen:season -- --ranking=<ID> \
  --out=src/data/billard/results-2026-2027.json \
  --competition="Blackball Master" --season="2026/2027"
```

Le script filtre les *Walk Over* et les matchs non joués, déduit le niveau
(TN1…, Championnat de France) et la ville depuis le nom des tournois, puis calcule
les stats de chaque joueur.

## 2. Enregistrer la saison dans le registre

### Masters — `src/data/billard/seasons.ts`
```ts
import r2627 from './results-2026-2027.json';
// …dans le tableau `seasons` (la plus récente EN PREMIER) :
{ slug: '2026-2027', label: '2026 / 2027', short: '26/27', status: 'current',
  competition: 'Blackball Master', calendar: calFrom(r2627 as ResultsData), results: r2627 as ResultsData },
```
- Passer l'ancienne saison courante à `status: 'past'`.
- Mettre à jour `export const DEFAULT_SEASON = '2026-2027';`
- (La saison 2026-2027 existe déjà en `upcoming` avec le calendrier affiche : remplacer
  cette entrée par la version ci-dessus une fois les résultats disponibles.)

### Féminin — `src/data/billard/seasonsFemmes.ts`
```ts
import rf2627 from './results-femmes-2026-2027.json';
// …en tête de `femmesSeasons` :
{ slug: '2026-2027', label: '2026 / 2027', short: '26/27', status: 'current',
  competition: COMPETITION_FEMMES, calendar: calFrom(rf2627 as ResultsData), results: rf2627 as ResultsData },
```
- Passer l'ancienne courante à `status: 'past'`.
- Mettre à jour `export const FEMMES_DEFAULT_SEASON = '2026-2027';`

## 3. Vérifier

```bash
npm run build   # doit se terminer sans erreur
npm run dev     # contrôler /billard/hub, les hubs, un classement, une fiche
```

Les fiches carrière fusionnent automatiquement les saisons d'un même joueur
(cumuls, adversaires, parcours saison par saison).
