---
name: billard-import-historique
description: "Pipeline d'import des saisons historiques du Blackball Master (Excel FFB → JSON) et ses limites de données"
metadata: 
  node_type: memory
  type: project
  originSessionId: da21c2bc-82e6-4514-9030-dcc992a759ea
  modified: 2026-07-24T12:11:34.257Z
---

Le Masters ([[basket-live-architecture]] est un autre projet) couvre désormais **2015/2016 → 2026/2027** dans `src/data/billard/seasons.ts` (2020/2021 sautée = annulée COVID ; 2026/2027 = à venir, calendrier seul).

**Pipeline** : `D:\LSEI - NEW SITE\data-import\convert.py` (Python + openpyxl) transforme les Excel FFB en `results-YYYY-YYYY.json`.
- Source classements : un fichier **par saison** `YYYY-YYYY.xlsx` (le user les a refaits propres le 2026-07-23). Chaque feuille = légende (préfixe « Ev N : » **ou** « TN N : » selon le fichier) donnant tous les tournois + villes, puis tableau. **⚠ colonnes variables** : `Rang | [Licence] | Nom Prénom | Club | Ville | Total points | GA cumulé | TN1 | TN2 | … | CdF` — la colonne **Licence est absente** de `2015-2016.xlsx`. `convert.py` détecte les colonnes **par nom d'en-tête** (pas d'index fixe). Les colonnes TN1..TN9/CdF = **points de chaque joueur à chaque étape** (le parcours).
- Source matchs : `participantsView.xlsx` (colonne `annee_sportive_id` → saison : 3=16/17, 4=17/18, 5=18/19, 6=19/20, 8=21/22, 9=22/23). Libellés d'événements variés (`TN7-FFB`, `N°5 TN FFB`, `CDF`, `CHAMPIONNAT DE FRANCE…`) → normalisés en `TN1..TN9` / `Championnat de France` par `level_kind`.
- **Calendrier complet + vainqueurs** : tournois = fusion légende (villes) + matchs (dates). **Vainqueur de chaque étape** stocké dans `tournament.winner` = vainqueur de la finale (matchs) **sinon meilleur score/étape** (colonnes de points). → même les saisons sans matchs (2015/2016) et les étapes sans matchs (2016/2017 TN1-6) ont un vainqueur. `calFrom` et `palmaresOf` lisent `t.winner` (fallback finale pour les saisons Cuescore récentes qui n'ont pas ce champ).
- **Parcours joueur unifié** : chaque joueur a `events: [{tid,level,points}]`. La fiche carrière (`billard/joueur/[id].astro`) affiche le parcours **étape par étape sur la saison entière** : détail match par match là où on l'a **+** badge points/place/🏆 partout (donc une saison partielle comme 2016/2017 montre les 9 étapes, matchs sur TN7-8 et points sur le reste). Les victoires d'étape en points **ne comptent PAS** comme « titres » (titres = champion de saison rang 1 + champion de France uniquement).
- **Réconciliation d'ids** : par clé-nom (tokens triés) → id Cuescore si connu ; sinon chiffres de la licence ; **sinon (pas de licence, ex. 2015-2016) id synthétique stable dérivé du nom** (`NAME2ID`). Un joueur garde le même id d'une saison à l'autre. (Lambert 2015→2026, 185V-42D, 5 titres, 10 saisons.)

**Limites/particularités par saison** (vérifiées une par une) : les matchs FFB = **phases finales seulement** (pas les poules) → « matchs joués » partiel. `participantsView.xlsx` ne contient **rien avant avril 2017** (années sportives 3,4,5,6,8,9 uniquement ; annee→saison dans le code).
- **2015/2016** = 0 match (classement + points/étape seulement ; Championnat de France sans données → pas de champion de France).
- **2016/2017** = matchs seulement TN7+TN8 (le reste en points).
- **2017/2018** = complet (294 matchs, TN1-9 + CdF).
- **2018/2019** = complet SAUF **TN8 sans matchs** (vainqueur TN8 déduit des points).
- **2019/2020** = 4 étapes only (écourtée COVID fév. 2020), toutes en matchs.
- **2021/2022** = CAS SPÉCIAL. Le fichier `2021-2022.xlsx` est le **classement 2020/2021 reporté** (COVID), inutilisable pour les points (les élites qui ont joué sont à 0 pt). → saison **entièrement reconstruite depuis les matchs** dans `build_season` (points FFB par placement en tableau : 440/364/292/224/160/100). Le « TN7 » d'Agen = en fait le **Championnat de France** (remap TN7→france) → champion de France = Lambert. N°3 Hazebrouck sans matchs → sans vainqueur. Champion reconstruit = Lambert (2148 pts).
- **2022/2023** = complet (246 matchs, TN1-7 + CdF Montaigu) SAUF la **finale de TN5 non enregistrée** (30 matchs) → vainqueur TN5 (Klinka) déduit des points ; le joueur voit 🏆 + ses matchs jusqu'en demie. Champion saison + France = Beaufils.

**Vérification saison par saison : TERMINÉE** (2015/2016 → 2022/2023, les 7 saisons validées une par une avec le user en juillet 2026).

Pour re-générer : `cd data-import && python convert.py` puis `npm.cmd run build`.
