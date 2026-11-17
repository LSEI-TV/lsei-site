<!-- ⚠️ Claude : RÉÉCRIS entièrement ce fichier à CHAQUE mise à jour déployée (commit+push), depuis le PC1 ou le PC2, et inclus-le dans le même push. Il est écrasé à chaque fois : il doit toujours refléter le dernier état. Voir CLAUDE.md. -->

# État du projet LSEI — dernier point

| | |
|---|---|
| **Dernière mise à jour** | 2026-11-17 ~21h30 (heure de Paris) |
| **Machine** | PC1 |
| **Dernier push** | hotfix direct (voir ci-dessous), sur `main` |
| **État déploiement** | poussé sur `main` → GitHub Actions « Build & Deploy OVH » |
| **Build local** | OK (5584 pages) |

## 🔧 Session du 17/11/2026 — fiabilisation du DIRECT (pendant une diffusion)
Problème constaté en direct : la vidéo ne s'affichait pas sur `/direct/` ni le badge sur `/basket/`. **Cause racine** : le workflow `live-status.yml` (régénère `live.json`) est planifié toutes les 5 min mais **GitHub throttle le `schedule`** (exécutions espacées de plusieurs heures) → `live.json` périmé. Correctifs :
1. **`/direct/` auto-cicatrisant** : un match encore dans `live.json.upcoming` dont l'heure de début est passée s'affiche **EN DIRECT même si `live.json` est en retard** (plus seulement quand il est injoignable). Plus besoin de « Run workflow » à la main.
2. **Embeds YouTube `nocookie` → `youtube.com`** (direct, accueil, modale, player replays) : réduit fortement la barrière « confirmez que vous n'êtes pas un robot » qui bloquait les spectateurs **sans compte YouTube**.
3. **Accueil — lecture du direct SUR PLACE** (comme `/direct/`) : clic sur la vignette ou « Regarder le direct » → la vignette devient le **lecteur inline** (au lieu d'ouvrir YouTube). Fonctionne aussi en **multi-live** (chaque carte « N directs en cours » devient son propre lecteur). Repli href YouTube si JS KO. Testé en local (single + multi) avant déploiement.

## 📄 Doc créé
- `docs/pinger-direct-live.md` : guide pour un **pinger externe** (cron-job.org ou Worker Cloudflare) qui déclenche `live-status.yml` toutes les 2-3 min → capte le **lancement réel** du direct sur YouTube, indépendamment du throttling GitHub. Nécessite un token GitHub (fine-grained, Actions:write, ce repo) que le user crée. **À mettre en place par Marc.**

## 🔄 Automatisation en place
- **Blackball** : 9 compétitions auto-refresh 2×/jour depuis Cuescore (Masters, Femmes, Mixte, Espoir, Junior, Vétéran, Prestige, Para×2 en auto-promotion).
- **Tournoi des Champions (palets)** : résultats via NOVA (`NovaLive`, mode intégré).
- **Direct** : `live.json` via `live-status.yml` (throttlé par GitHub → pinger externe recommandé, voir ci-dessus) + `/direct/` et accueil désormais auto-cicatrisants.

## 📌 À faire ensuite / points ouverts
- **Pinger externe** (doc prêt) : Marc crée le token + le job cron-job.org (ou Worker Cloudflare, je peux l'écrire).
- **Badge « EN DIRECT » sur `/basket/`** : encore à faire (l'encadré « Prochain match » est statique, ne lit pas `live.json`). À ajouter (petit script client).
- **Bowling Promotion Tour** : page `/disciplines/bowling/` à transformer en « site dans le site » (édition BPT 2026) — propositions de design à faire valider. Press kit dans `public/bowling promotion tour/` (PDF 20 Mo, non committé). Logo FFPPB converti : `public/partenaires/ffppb.webp` (non committé).
- Fichiers **non committés à NE PAS pousser** sans accord : PDF bowling, `ffppb.webp`, photos TdC 2025/2026/2027 (`public/tournoi-des-champions/…`), fichiers PC2 (`cdm-blackball-2026-*`, article bilan).

## ⚠️ Rappels (détail dans CLAUDE.md)
`git add` explicite (jamais `-A`) ; routine pré-commit (reset caches, `rm -f live.json`, fetch, divergence) ; ne jamais committer `public/live.json` (écraserait le `live.json` runtime en prod) ; FileZilla sans mot de passe.
