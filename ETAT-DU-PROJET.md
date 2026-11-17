<!-- ⚠️ Claude : RÉÉCRIS entièrement ce fichier à CHAQUE mise à jour déployée (commit+push), depuis le PC1 ou le PC2, et inclus-le dans le même push. Il est écrasé à chaque fois : il doit toujours refléter le dernier état. Voir CLAUDE.md. -->

# État du projet LSEI — dernier point

| | |
|---|---|
| **Dernière mise à jour** | 2026-11-17 ~23h30 (heure de Paris) |
| **Machine** | PC1 |
| **Dernier push** | suivi (ETAT + mémoire + doc pinger) |
| **État déploiement** | poussé sur `main` → GitHub Actions « Build & Deploy OVH » |
| **Build local** | OK (5584 pages) |

## 🔴 Système DIRECT — refondu et fiabilisé le 17/11/2026 (pendant un direct basket)
Contexte : la vidéo ne s'affichait pas sur `/direct`, le badge restait « collé » après le match, et un spectateur sans compte YouTube était bloqué. Cause de fond : le cron GitHub `live-status.yml` est **throttlé** (tourne toutes les plusieurs heures, pas toutes les 5 min) → `live.json` périmé.

**Ce qui est en place maintenant :**
1. **Pinger Cloudflare `lsei-live-pinger`** (compte Marc) : Cron Trigger **toutes les 2 min** → déclenche `live-status.yml` via l'API GitHub (token `pinger-live-lsei-cf`, Actions:write, en secret `GITHUB_TOKEN`). ✅ **Vérifié** : `live.json` se met à jour en ≤ 2 min au **lancement ET à la fin** du direct. Plus jamais besoin de « Run workflow » à la main. Guide : `docs/pinger-direct-live.md`.
2. **`/direct` auto-cicatrisant** (`effective()` REPLI 3) : un match programmé dont l'heure est passée s'affiche EN DIRECT même si `live.json` est en retard.
3. **Accueil — lecture SUR PLACE** : clic sur la vignette / bouton → lecteur YouTube **inline** (single + multi-live), au lieu d'ouvrir YouTube.
4. **Embeds `youtube-nocookie.com` → `youtube.com`** (direct, accueil, modale, player) : réduit la barrière YouTube « confirmez que vous n'êtes pas un robot ».
5. **🟥 Bandeau « EN DIRECT » par sport — `src/components/LiveNow.astro`** : `<LiveNow sport="<slug>" />` affiche un bandeau rouge (match + « Regarder » → /direct/) quand CE sport est en direct, masqué sinon. Détail dans [[lsei-direct-detection]].

### ⭐ CONVENTION pour TOUT nouveau sport déployé
Sur chaque nouvelle page de sport (hub, discipline…), ajouter :
```astro
import LiveNow from '<chemin>/components/LiveNow.astro';
...
<Base ...>
  <LiveNow sport="<slug>" />   <!-- basket · billard · palets · bowling · football · beach · subbuteo -->
```
Déjà posé : `/basket`, `/billard/hub`, `/billard/blackball`, `/palets/tournoi-des-champions`, route générique `/disciplines/[slug]`.

## 🔄 Autres automatisations
- **Blackball** : 9 compétitions auto-refresh 2×/jour depuis Cuescore.
- **Tournoi des Champions (palets)** : résultats via NOVA (`NovaLive`).

## 📌 À faire ensuite / points ouverts
- **Bowling Promotion Tour** : transformer `/disciplines/bowling/` en « site dans le site » (édition **BPT 2026**) — **propositions de design à faire valider** (c'était la demande en cours avant le direct). Press kit `public/bowling promotion tour/` (PDF 20 Mo, non committé) ; logo `public/partenaires/ffppb.webp` (non committé).
- **Optionnel direct** : créer un 2e secret `YOUTUBE_API_KEY_LIVE` (quota YouTube isolé) ; faire aussi basculer l'encadré « Prochain match » basket en EN DIRECT (en plus du bandeau).
- **Hygiène** : le token `pinger-live-lsei-cf` est apparu dans des captures → le régénérer + mettre à jour le secret du Worker (optionnel, périmètre minuscule).

## ⚠️ Rappels (détail dans CLAUDE.md)
`git add` explicite (jamais `-A`) ; routine pré-commit (reset caches, `rm -f live.json`, fetch, divergence) ; **ne JAMAIS committer `public/live.json`** (écraserait le live.json runtime en prod) ; ne pas committer : PDF/`ffppb.webp` bowling, photos TdC, fichiers PC2 (`cdm-blackball-2026-*`, article bilan) ; FileZilla sans mot de passe.
