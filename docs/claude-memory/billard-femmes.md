---
name: billard-femmes
description: Billard multi-compétitions (Masters / Femmes / Para-billard) — architecture parallèle du site LSEI
metadata:
  node_type: memory
  type: project
  originSessionId: da21c2bc-82e6-4514-9030-dcc992a759ea
---

Le site LSEI a **trois compétitions billard parallèles**, chacune avec hub, classement, joueurs (vignettes), fiches carrière, comparateur, faits marquants, palmarès :
- **Masters** : pages `/billard/…`, `seasons.ts` (results-*.json), « Blackball Masters ».
- **Femmes** : pages `/femmes/…`, `seasonsFemmes.ts` (results-femmes-*.json), « Blackball Femmes ». Saisons 2025/26, 2024/25, 2023/24 (rankings Cuescore 65726152, 45838048, 29932567).
- **Para-billard** : pages `/para-billard/…`, `seasonsPara.ts` (results-para-*.json), « Blackball Para-billard ». Saison 2025/26 (ranking 65726164 « Handi Billard », petit circuit ~5 joueurs, pas de CdF).

**Accès** : le menu principal n'a PAS d'entrée « Billard » (retirée) — on passe par le cadre Billard (page Direct / Disciplines) → `/billard/hub` (billard/hub.astro), page de CHOIX avec 3 cartes (accents Masters violet #7C4DD6, Femmes jaune #F2B90A, Para turquoise #14A38B ; champion à la une en or, podium à médailles) + bandeau Vidéothèque globale. Toutes les pages billard utilisent `active="disciplines"`.

**Vidéos** (YouTube, lues au build) : classées par catégorie ET saison depuis le titre de playlist (`billardCategory` + `seasonFromTitle` dans `lib/youtube.ts`). L'onglet Vidéothèque de chaque hub pointe vers `/disciplines/billard/categorie/{masters|femmes|para-billard}` (filtre catégorie + saison combiné).

**Composants partagés paramétrés** : `HubNav` (root/brand/sub/joueursLabel/videosHref), `SeasonPicker` (root/seasons), `PlayerSearch` (seasons/hrefBase). `billardStats.ts` : `allPlayers(seasons)`, `playersInText(text, seasons)` ; index photo couvre les 3 compétitions.

**Ajouter une saison** : `npm run gen:season -- --ranking=<id> --out=src/data/billard/results-*.json --competition="..." --season="AAAA/AAAA"` (script `scripts/generate-season.mjs`, guide `scripts/README.md`). Le parseur gère plusieurs formats de noms de tournois (FFB - … / BB_TN1_VILLE_… / CHF). Puis enregistrer dans le fichier seasons*.ts + bump DEFAULT_SEASON. Le Championnat de France arrive automatiquement avec le classement.

Voir [[lsei-new-site]], [[lsei-deploiement]].
