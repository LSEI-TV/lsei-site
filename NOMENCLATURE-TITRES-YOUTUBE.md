# Nomenclature des titres de lives YouTube — LSEI

Les titres des lives/vidéos YouTube servent **automatiquement** à deux choses sur le site :
1. **Classer** la diffusion par discipline (grille Programme) et par catégorie (vidéothèque).
2. **Afficher** proprement la ligne dans la grille Programme, façon « guide TV ».

Il suffit donc de **bien nommer le live sur YouTube** — le site fait le reste.

---

## Structure générale

```
<DISCIPLINE + niveau> | <partie(s) du milieu> | <affiche / contexte>
```

- **1re partie** → discipline + niveau/catégorie → devient le *kicker* (le petit intitulé coloré)
- **parties du milieu** → *badges* (phase, journée, date… autant qu'on veut)
- **dernière partie** → l'*affiche* (le match, ou le lieu/contexte) → le titre principal

Le nombre de parties est **libre** (3, 4, 5…). La casse et les émojis n'ont aucune importance.

---

## Par discipline

### 🎱 Billard
```
BLACKBALL <CATÉGORIE> | <PHASE> | <CONTEXTE>
```
- **CATÉGORIE** : `MASTERS` · `FEMMES` · `PARA-BILLARD` · `ESPOIRS` (range aussi le replay dans la vidéothèque)
- **PHASE** : `FINALE` · `1/2 FINALE` · `1/4 FINALE` · `POULES` · `TOUR 1`…
- **CONTEXTE** : `TN7 - CAVAILLON` · `Championnat de France` · `CDF - VILLENEUVE`…

Exemples :
```
BLACKBALL MASTERS | FINALE | Championnat de France
BLACKBALL MASTERS | 1/2 FINALE | TN7 - CAVAILLON
BLACKBALL FEMMES | FINALE | TN7 - CAVAILLON
BLACKBALL PARA-BILLARD | FINALE | TN7 - CAVAILLON
```

### 🏀 Basket
```
BASKETBALL NM1 <SAISON> | JOURNÉE <n> | <DATE> | <ÉQUIPE A> vs <ÉQUIPE B>
```
Exemple :
```
🏀 BASKETBALL NM1 25/26 | JOURNÉE 22 | 03/05/2026 | Pays de Fougères Basket vs Le Havre STB
```

### Autres disciplines
Même principe, la 1re partie donne la discipline :
`PALETS …` · `SUBBUTEO …` · `BEACH-VOLLEY …` · `BOWLING …` · `FOOTBALL …`

---

## Abréviations développées automatiquement à l'affichage

| Tu écris | Le site affiche |
|----------|-----------------|
| `TN1` … `TN12` | Tournoi National 1 … 12 |
| `CDF` | Coupe de France |
| `CDM` | Coupe du Monde |
| `CHPT` | Championnat |

> Exemple : `TN7 - CAVAILLON` → **Tournoi National 7** - Cavaillon

Pour ajouter une abréviation : `src/lib/programmeTitle.ts` (liste `ABBR`).

---

## Priorité des catégories billard (si plusieurs mots-clés)

Ordre : **Para → Femmes → Espoirs → Masters**.
Donc pour une finale **Masters masculine**, ne pas mettre « femmes » dans le titre.

---

## Où c'est géré dans le code
- Classement discipline / catégorie : `src/lib/youtube.ts` (`classifyPlaylist`, `billardCategory`)
- Affichage « guide TV » (découpe des `|`, abréviations) : `src/lib/programmeTitle.ts`
- Grille : `src/pages/programme.astro`
