<!-- ⚠️ Claude : RÉÉCRIS entièrement ce fichier à CHAQUE mise à jour déployée (commit+push), depuis le PC1 ou le PC2, et inclus-le dans le même push. Il est écrasé à chaque fois : il doit toujours refléter le dernier état. Voir CLAUDE.md. -->

# État du projet LSEI — dernier point

| | |
|---|---|
| **Dernière mise à jour** | 2026-11-20 (heure de Paris) |
| **Machine** | PC2 |
| **Dernier push** | Billard Masters : tableau NOVA du TN2 d'Albi intégré à la page de la saison 2026/2027 |
| **État déploiement** | poussé sur `main` → GitHub Actions « Build & Deploy OVH » |
| **Build local** | OK (5 579 pages, exit 0) ; affichage vérifié ordinateur + téléphone 360 px |

## 🟢 20/11/2026 (soir) — Tableau NOVA du TN2 Masters · Albi sur lsei.tv
Marc teste NOVA (nova.lsei.tv) en parallèle de Cuescore sur le **TN2 Masters à Albi (21-22/11/2026, salle du Cosec)**.
- **Où** : page de la saison Masters `/billard/saison/2026-2027/`, bloc juste sous l'en-tête : « TN2 · Albi · tableau en direct » (point rouge), puis « tableau final » après le dernier jour (calculé au build ; le site se reconstruit 2×/jour).
- **Comment** : composant existant `src/components/NovaLive.astro` (le même que le Tournoi des Champions) = vue publique NOVA en mode intégré (`live.html?t=<slug>&embed=1&theme=lsei`), hauteur auto, mise à jour toutes les 10 s, lien « Ouvrir en plein écran ». NOVA n'accepte d'être affiché que dans lsei.tv (CSP `frame-ancestors`).
- **Réglage** : nouveau fichier `src/data/billard/nova.ts` (`NOVA_MASTERS`) = une ligne par étape suivie dans NOVA (saison, TN, ville, slug NOVA, dates) ; la page montre la **dernière** étape de la saison. Étape suivante = ajouter une ligne.
- Les **résultats officiels restent Cuescore** (import auto) ; NOVA est un essai.
- Branché dans `src/pages/billard/saison/[season]/index.astro` (import `NovaLive` + `novaStageOf`).

## 🟢 20/11/2026 — Search Console : « champ location manquant » sur `/programme/` (corrigé)
JSON-LD de `src/pages/programme.astro` : `eventAttendanceMode` et `location` toujours cohérents (en ligne seul → `Online` + `VirtualLocation` ; lieu seul → `Offline` + `Place` ; les deux → `Mixed` + `[Place, VirtualLocation]`). Même robustesse sur `/replay/[id]`.
➡️ **À faire côté Marc** (si pas encore fait) : Search Console → **« VALIDER LA CORRECTION »**.

## 🔴 Système DIRECT — refondu et fiabilisé le 17/11/2026 (toujours en place)
1. **Pinger Cloudflare `lsei-live-pinger`** : Cron Trigger **toutes les 2 min** → déclenche `live-status.yml` via l'API GitHub. `live.json` à jour en ≤ 2 min. Guide : `docs/pinger-direct-live.md`.
2. **`/direct` auto-cicatrisant** : un match programmé dont l'heure est passée s'affiche EN DIRECT même si `live.json` est en retard.
3. **Accueil — lecture SUR PLACE** : lecteur YouTube **inline** (single + multi-live).
4. **Embeds `youtube.com`** (plus `nocookie`).
5. **🟥 Bandeau « EN DIRECT » par sport — `src/components/LiveNow.astro`** : `<LiveNow sport="<slug>" />`.
6. **Accueil + ticker** relisent `live.json` (plus figés au build).

### ⭐ CONVENTION pour TOUT nouveau sport déployé
Sur chaque nouvelle page de sport, ajouter `<LiveNow sport="<slug>" />` sous `<Base>` (slugs : basket · billard · palets · bowling · football · beach · subbuteo).
Déjà posé : `/basket`, `/billard/hub`, `/billard/blackball`, `/palets/tournoi-des-champions`, route générique `/disciplines/[slug]`.

## 🔄 Automatisations
- **Blackball** : 9 compétitions auto-refresh 2×/jour depuis Cuescore.
- **NOVA** (`NovaLive`) : Tournoi des Champions (palets) + étapes Masters listées dans `src/data/billard/nova.ts`.

## 📌 À faire ensuite / points ouverts
- **NOVA × Masters** : après Albi, décider si on garde NOVA pour les prochains TN (ajouter une ligne dans `nova.ts`) ; à l'étude côté NOVA : plan de salle multi-catégories (40 billards : Masters, Femmes, Espoirs, Vétérans le même week-end).
- **TdC 2027** : accord organisateur obtenu (18/11) → **16 qualifiés publiés**. ⚠️ **Gala jeunes NON publié** (mineurs — accord parental photos en attente) ; **commentateurs NON publiés**. Lot complet préservé sur la branche **locale PC2** `wip/edition-2027-attente-orga` ; à fusionner quand l'accord parental arrive (conflits probables sur `tournoi-champions.ts` / `tournoi-des-champions.astro`).
- **Bowling Promotion Tour** : `/disciplines/bowling/` en place. Reste : vraies photos des favoris, logos partenaires.
- **Optionnel direct** : 2e secret `YOUTUBE_API_KEY_LIVE` ; encadré « Prochain match » basket à basculer en EN DIRECT.
- **Hygiène** : régénérer le token `pinger-live-lsei-cf` (apparu dans des captures) + MAJ secret du Worker.

## ⚠️ Rappels (détail dans CLAUDE.md)
`git add` explicite (jamais `-A`) ; routine pré-commit (reset caches, `rm -f live.json`, fetch, divergence) ; **ne JAMAIS committer `public/live.json`** ; ne pas committer : PDF/photos bowling, **gala jeunes TdC 2027** (`tournoi-des-champions/2027/gala`, mineurs) + `/commentateurs`, fichiers PC2 (`cdm-blackball-2026-*`, article bilan) ; FileZilla sans mot de passe.
