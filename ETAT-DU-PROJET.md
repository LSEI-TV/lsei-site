<!-- ⚠️ Claude : RÉÉCRIS entièrement ce fichier à CHAQUE mise à jour déployée (commit+push), depuis le PC1 ou le PC2, et inclus-le dans le même push. Il est écrasé à chaque fois : il doit toujours refléter le dernier état. Voir CLAUDE.md. -->

# État du projet LSEI — dernier point

| | |
|---|---|
| **Dernière mise à jour** | 2026-11-23 (heure de Paris) |
| **Machine** | PC1 |
| **Dernier push** | Billard : invités Masters CALCULÉS automatiquement (top 4 du Mixte National de l'étape précédente) |
| **État déploiement** | poussé sur `main` → GitHub Actions « Build & Deploy OVH » |
| **Build local** | OK (5 687 pages, exit 0) |

## 🟢 23/11/2026 (2) — Invités Masters automatisés (feeder Mixte National)
Les 4 invités (wildcards) de chaque étape du Blackball Master étaient saisis **à la main** (`mastersGuests2627`). Règle sportive identifiée et vérifiée : **invités Masters TN(n) = TOP 4 du Mixte National TN(n-1)**. Contrôle : top 4 du Mixte TN1 Fumel (Lechat, Bounif, Robert, Abdou) = exactement les invités du Masters TN2. ✔
- **Nouveau module** `src/data/billard/mastersGuests.ts` : calcule les invités par étape depuis `results-mixte-2026-2027.json` (podium = champion + finaliste + 2 perdants de demie). `seasons.ts` ré-exporte `mastersGuests2627`. `tn1` reste manuel (feeder = dernière étape de la saison précédente).
- **100% automatique** : `results-mixte-2026-2027.json` est rafraîchi 2×/jour depuis Cuescore (l'import découvre tous les TN Mixte via la regex `/- Mixte National -/`). Dès qu'une étape Mixte est jouée, les invités de l'étape Masters suivante apparaissent seuls (étape Mixte non finie → aucune finale décidée → pas d'invité). Plus rien à saisir.
- Résultat actuel : TN3 (St-Nicolas) invités = **Crespin, Angelier, Loncle, Boughanzai** (top 4 du Mixte TN2 Albi). TN4→France se rempliront au fil des étapes Mixte.
- Les cartes invités pointent vers la fiche **Mixte** du joueur (`/mixte/joueur/<slug>`), pas de fiche Masters auto-créée.

## 🟢 23/11/2026 — Correctif « Prochain rendez-vous » (billard)
Le cadre « Prochain rendez-vous » (composant réutilisable `src/components/AffichesTournois.astro`, présent sur les pages saison billard + les 4 hubs) restait **« En cours » 1 jour de trop** : au lendemain de la fin d'un tournoi, il affichait encore l'étape passée (ex. TN2 Albi « En cours » le 23/11 alors que le tournoi finissait le 22/11).
- **Cause** : le script client gardait un rendez-vous « focus » pendant `début + 3 jours` (grâce fixe ancrée sur la date de **début**), au lieu de sa vraie date de fin.
- **Fix** : calcul d'une **date de fin** côté serveur (`endIso`, jour de fin lu dans la chaîne « 20-22 nov. 2026 » + année/mois de `start`) → un rendez-vous reste affiché **tant qu'aujourd'hui ≤ son dernier jour**, puis bascule au suivant. Le calcul « J-X / En cours » en dessous est inchangé.
- Rappel métier : les **invités Masters** (`mastersGuests2627`, 4 wildcards/étape) sont saisis **à la main depuis Cuescore** une fois annoncés — TN3 (Saint-Nicolas-de-Port) pas encore renseigné = normal, pas un bug.


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
