<!-- ⚠️ Claude : RÉÉCRIS entièrement ce fichier à CHAQUE mise à jour déployée (commit+push), depuis le PC1 ou le PC2, et inclus-le dans le même push. Il est écrasé à chaque fois : il doit toujours refléter le dernier état. Voir CLAUDE.md. -->

# État du projet LSEI — dernier point

| | |
|---|---|
| **Dernière mise à jour** | 2026-11-09 ~20h45 (heure de Paris) |
| **Machine** | PC1 |
| **Dernier commit déployé** | `b5be2a6` sur `main` + ce push (bootstrap mémoire dans CLAUDE.md) |
| **État déploiement** | poussé sur `main` → GitHub Actions « Build & Deploy OVH » en cours/terminé |
| **Build local** | OK (5576 pages) |

## 🔧 Ce qui vient d'être fait (cette session)
1. **Catégorie Vétéran** (`/veteran`, bleu `#3457D5`) créée : 4 saisons 2023-2024 → 2026-2027, audit Cuescore **0 écart** (251+275+370+31 matchs), 534 fiches. *(commit `065c1fe`)*
2. **Catégorie Prestige Vétéran** (`/prestige`, or `#C79A2E`) créée : catégorie **neuve, 1 seule saison 2026-2027** (16 joueurs, 15 matchs, audit OK), leader François Debois. *(commit `065c1fe`)*
3. **Auto-refresh étendu aux 2 Para** (fauteuil + malvoyants) avec montage « auto-promotion » : la saison 2026-2027 Para apparaîtra d'elle-même dès le 1er résultat para validé sur Cuescore (aujourd'hui 0 résultat → reste sur 2025-2026). *(commit `fd2f568`)*
4. **Documents de suivi** : `PASSATION-PC1-PC2.md` (passation de fond), `CLAUDE.md` (règles + consigne), et ce fichier d'état vivant.
5. **Bootstrap mémoire** ajouté à `CLAUDE.md` : au 1er démarrage sur une machine sans la mémoire LSEI (ex. PC2), Claude lit la passation + cet état et recrée ses fiches mémoire internes → chaque PC finit avec la même mémoire « riche ».

→ Le hub Blackball compte désormais **9 compétitions** ; le hub Billard affiche « 9 compétitions ».

## ✅ Vérifications prod (faites le 09/11/2026)
- `/veteran/saison/2026-2027/` : classement OK (leader Viton). `/veteran/joueur/pierrick-viton/` : badge + liens croisés Masters·Mixte OK.
- `/prestige/saison/2026-2027/` : leader **DEBOIS 286 pts** OK.
- `/billard/hub/` : « 9 compétitions » OK. `/para-billard/` : reste en **2025-2026** (rien cassé).

## 🔄 État de l'automatisation
- **Auto-refresh 2×/jour** (~10h30 et ~17h FR) couvre **les 9 compétitions** Blackball (scores, classements, rangs, fiches, podiums se mettent à jour seuls dès validation sur Cuescore).
- Non auto : saisons passées (figées), photos de nouveaux joueurs (manuel : déposer → `propagate-photos` → `npm run assets` → build), invités/permanents Masters, vidéos YouTube.

## 📌 À faire ensuite / points ouverts
- Si un **CHF Para malvoyants 2026-2027** est organisé : renseigner son `rankingId` dans `scripts/import-blackball.mjs` (laissé à `null`).
- Toutes les catégories Blackball prévues sont créées — **file d'attente vide**.
- Backlog LSEI en attente du feu vert du user : audit 404 / images bandeau / README ; tests Playwright basket.

## ⚠️ Rappels (détail dans CLAUDE.md)
Ne jamais committer les fichiers PC2 (`cdm-blackball-2026-*.jpg`, article `…bilan-des-bleus.md`) ; `git add` explicite ; routine pré-commit (reset caches, `rm -f live.json`, fetch, divergence) ; FileZilla sans mot de passe.
