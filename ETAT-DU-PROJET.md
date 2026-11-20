<!-- ⚠️ Claude : RÉÉCRIS entièrement ce fichier à CHAQUE mise à jour déployée (commit+push), depuis le PC1 ou le PC2, et inclus-le dans le même push. Il est écrasé à chaque fois : il doit toujours refléter le dernier état. Voir CLAUDE.md. -->

# État du projet LSEI — dernier point

| | |
|---|---|
| **Dernière mise à jour** | 2026-11-20 (heure de Paris) |
| **Machine** | PC2 |
| **Dernier push** | SEO : correction du champ `location` manquant (Search Console) |
| **État déploiement** | poussé sur `main` → GitHub Actions « Build & Deploy OVH » |
| **Build local** | OK (exit 0, `/programme/` régénéré et vérifié) |

## 🟢 Correction du 20/11/2026 — Search Console : « champ location manquant » sur `/programme/`
Google Search Console signalait **7 éléments invalides** (type *Événement*) sur `https://lsei.tv/programme/`, tous nommés « Albi » — première détection 18/11/2026.

**Cause** : dans le JSON-LD (`src/pages/programme.astro`), les diffusions **annoncées sans lieu physique** (`confirmed: true`, pas de `place`) étaient marquées `MixedEventAttendanceMode` (événement à la fois sur place **et** en ligne) mais avec une `VirtualLocation` seule. Google exige un **lieu physique** pour les modes `Mixed` / `Offline` → il considérait le `location` comme manquant.

**Fix** : `eventAttendanceMode` et `location` sont désormais toujours cohérents :
- diffusé **en ligne seul** (pas de lieu) → `OnlineEventAttendanceMode` + `VirtualLocation`
- **lieu physique connu**, non diffusé → `OfflineEventAttendanceMode` + `Place`
- **les deux** → `MixedEventAttendanceMode` + `[Place, VirtualLocation]`

Vérifié sur le build : **22 SportsEvents, 0 sans location**. Même robustesse appliquée au `BroadcastEvent` des pages `/replay/[id]` (ajout d'une `VirtualLocation`).
➡️ **À faire côté Marc** : dans Search Console, cliquer **« VALIDER LA CORRECTION »** une fois le déploiement OVH terminé (Google re-explore ensuite).

## 🔴 Système DIRECT — refondu et fiabilisé le 17/11/2026 (toujours en place)
Cause de fond passée : le cron GitHub `live-status.yml` était throttlé → `live.json` périmé. Ce qui est en place :
1. **Pinger Cloudflare `lsei-live-pinger`** : Cron Trigger **toutes les 2 min** → déclenche `live-status.yml` via l'API GitHub. ✅ `live.json` à jour en ≤ 2 min au lancement ET à la fin du direct. Guide : `docs/pinger-direct-live.md`.
2. **`/direct` auto-cicatrisant** : un match programmé dont l'heure est passée s'affiche EN DIRECT même si `live.json` est en retard.
3. **Accueil — lecture SUR PLACE** : clic vignette/bouton → lecteur YouTube **inline** (single + multi-live).
4. **Embeds `youtube.com`** (plus `nocookie`) : réduit la barrière « confirmez que vous n'êtes pas un robot ».
5. **🟥 Bandeau « EN DIRECT » par sport — `src/components/LiveNow.astro`** : `<LiveNow sport="<slug>" />`.
6. **Accueil + ticker qui s'éteignent** : hero et `Ticker.astro` relisent `live.json` (plus figés au build).

### ⭐ CONVENTION pour TOUT nouveau sport déployé
Sur chaque nouvelle page de sport, ajouter `<LiveNow sport="<slug>" />` sous `<Base>` (slugs : basket · billard · palets · bowling · football · beach · subbuteo).
Déjà posé : `/basket`, `/billard/hub`, `/billard/blackball`, `/palets/tournoi-des-champions`, route générique `/disciplines/[slug]`.

## 🔄 Automatisations
- **Blackball** : 9 compétitions auto-refresh 2×/jour depuis Cuescore.
- **Tournoi des Champions (palets)** : résultats via NOVA (`NovaLive`).

## 📌 À faire ensuite / points ouverts
- **TdC 2027** : accord organisateur obtenu (18/11) → **16 qualifiés publiés** (champ `roster` de l'édition à venir + 6 nouveaux joueurs au registre + photos). ⚠️ **Gala jeunes NON publié** (mineurs — accord parental photos en attente) ; **commentateurs NON publiés**. Le lot complet (sections commentateurs/gala + rendu de page) reste préservé sur la branche **locale PC2** `wip/edition-2027-attente-orga` ; à fusionner quand l'accord parental arrive (prévoir quelques conflits sur `tournoi-champions.ts` / `tournoi-des-champions.astro` à cause du roster déjà intégré).
- **Bowling Promotion Tour** : `/disciplines/bowling/` en place (Direction A « Broadcast TV »). Reste à enrichir : vraies photos des favoris, logos partenaires.
- **Optionnel direct** : 2e secret `YOUTUBE_API_KEY_LIVE` (quota isolé) ; encadré « Prochain match » basket à basculer en EN DIRECT.
- **Hygiène** : régénérer le token `pinger-live-lsei-cf` (apparu dans des captures) + MAJ secret du Worker.

## ⚠️ Rappels (détail dans CLAUDE.md)
`git add` explicite (jamais `-A`) ; routine pré-commit (reset caches, `rm -f live.json`, fetch, divergence) ; **ne JAMAIS committer `public/live.json`** ; ne pas committer : PDF/photos bowling, **gala jeunes TdC 2027** (`tournoi-des-champions/2027/gala`, mineurs) + `/commentateurs`, fichiers PC2 (`cdm-blackball-2026-*`, article bilan) ; FileZilla sans mot de passe.
