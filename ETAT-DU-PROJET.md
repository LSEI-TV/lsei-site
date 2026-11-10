<!-- ⚠️ Claude : RÉÉCRIS entièrement ce fichier à CHAQUE mise à jour déployée (commit+push), depuis le PC1 ou le PC2, et inclus-le dans le même push. Il est écrasé à chaque fois : il doit toujours refléter le dernier état. Voir CLAUDE.md. -->

# État du projet LSEI — dernier point

| | |
|---|---|
| **Dernière mise à jour** | 2026-11-10 ~14h (heure de Paris) |
| **Machine** | PC1 (`LSEIMONTAGE2025`) |
| **Dernier commit déployé** | ce push : Tournoi des Champions branché sur NOVA (sur `be6511c`) |
| **État déploiement** | poussé sur `main` → GitHub Actions « Build & Deploy OVH » |
| **Build local** | OK (5573 pages) |

## 🔧 Ce qui vient d'être fait (cette session)
1. **Page `/palets/tournoi-des-champions/` branchée sur NOVA** (nova.lsei.tv, l'outil de gestion des tournois de LSEI), à la demande de Marc :
   - nouveau composant **`src/components/NovaLive.astro`** : `<NovaLive slug="…" accent="#couleur" />` affiche la vue publique NOVA en **mode intégré** (cadre `live.html?…&embed=1&theme=lsei&accent=…`), aux couleurs de lsei.tv et de l'édition ; le cadre prend tout seul la hauteur du contenu (message `postMessage` de NOVA), jamais d'ascenseur interne ; mise à jour toute seule toutes les 10 s (scores en direct le jour J). NOVA n'accepte d'être affiché que dans lsei.tv (CSP `frame-ancestors` côté NOVA).
   - données : champs **`nova`** (slug NOVA) et **`novaPool`** (`false` = NOVA n'a que le tableau final) dans `src/data/palets/tournoi-champions.ts`.
   - **Édition 2026** : bloc « Toutes les parties · NOVA » (24 parties de poule reconstituées d'après la vidéo du live + classement + tableau). L'ancien tableau, l'ancien classement de poule et la photo de l'édition ne s'affichent plus (doublon / choix de Marc).
   - **Édition 2025** : bloc « Tableau final · NOVA » (vrais quarts, demies, finale) ; la page **garde** son classement de poule officiel (le détail des parties de poule 2025 n'est pas connu). Photo de l'édition masquée.
   - **Édition 2027** : inchangée (affiche + compte à rebours). **Aucun joueur 2027 publié** : Marc n'a pas encore l'accord de l'organisateur. Les photos des nouveaux joueurs 2027 restent **non suivies** dans `public/tournoi-des-champions/joueurs/` (anthony-palluet, gwendal-maine, helena-fromont, kevin-lenoble, maxence-morio, sebastien-brochard) : **ne pas les committer** avant l'accord.

## ✅ Vérifications
- Build local OK ; aucune trace des joueurs 2027 dans la page construite.
- Côté NOVA (v56 en ligne) : archives TdC 2026 et 2025 créées et vérifiées.

## 🔄 État de l'automatisation
- **Auto-refresh 2×/jour** (~10h30 et ~17h FR) couvre **les 9 compétitions** Blackball.
- Tournoi des Champions : les résultats viennent maintenant de NOVA (rien à reconstruire côté site quand un score change).

## 📌 À faire ensuite / points ouverts
- **TdC 2027** (2 janvier 2027, Châteaubourg) : créer le tournoi dans NOVA, puis ajouter `nova: '<slug>'` à l'édition 2027 → résultats en direct dans la page. Publier les joueurs 2027 seulement avec l'accord de l'organisateur. Prévu aussi : **tournoi de gala des jeunes** (mineurs → photos seulement avec accord parental).
- TdC 2025 : compléter la phase de poule dans NOVA si l'organisateur retrouve les feuilles de partie.
- Si un **CHF Para malvoyants 2026-2027** est organisé : renseigner son `rankingId` dans `scripts/import-blackball.mjs`.
- Backlog LSEI en attente du feu vert du user : audit 404 / images bandeau / README ; tests Playwright basket.

## ⚠️ Rappels (détail dans CLAUDE.md)
Ne jamais committer les fichiers PC2 (`cdm-blackball-2026-*.jpg`, article `…bilan-des-bleus.md`) ni les photos des joueurs TdC 2027 ; `git add` explicite ; routine pré-commit (reset caches, `rm -f live.json`, fetch, divergence) ; FileZilla sans mot de passe.
