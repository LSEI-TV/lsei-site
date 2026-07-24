---
name: basket-live-todo
description: Travail restant sur le logiciel BASKET après la passe de correctifs + WebSocket du 2026-07-04
metadata: 
  node_type: memory
  type: project
  originSessionId: dbb7a9b2-57d6-4da8-9a54-f9967f005b9c
---

Après la session du 2026-07-04 (voir [[basket-live-architecture]]), reste à faire sur le logiciel BASKET :

- **P2.7 — garde de conflit multi-éditeurs** : `/save-data` écrase sans vérifier `expectedMtime`/timestamp ; deux éditeurs en parallèle → dernier écrit gagne silencieusement. `basketDataTs` est écrit mais jamais comparé.
- **`tryImg is not defined`** (cosmétique) : les overlays ont des `<img src="">` avec `onerror="tryImg(this)"` ; sur src vide, `onerror` se déclenche avant la définition de `tryImg` → ReferenceError console à chaque chargement. Sans impact visuel. Fix : `onerror="if(window.tryImg)tryImg(this)"` sur ~25 overlays. Filtré dans `tests/01-pages-load.spec.js`.
- **Endpoint de restauration de backup** : les backups horodatés sont créés dans `backups-auto/` mais aucun endpoint ne les liste/restaure ; restauration manuelle uniquement. Ajouter `/backups` + `/restore-backup` + bouton éditeur serait utile.
- **P3 mineurs éditeur non corrigés** : édition du champ « Prénom Nom » vide toujours `prenom` (choix assumé mais effets de bord) ; `getTeamFolder` gère mal accents/underscores en fallback ; scores par quart-temps jamais sommés vers `total`.
- **Latent serveur** : pas de gestion des requêtes HTTP **Range** ni MIME `.mp3/.mp4` (sans impact tant qu'aucun overlay ne sert ces médias).

Fait le 2026-07-04 : affiche-3 corrompue, écriture atomique+backup, anti-traversée, reset statsEquipe, fallback photo leaders, gardes `md.domicile||{}` sur les overlays, WebSocket temps réel (client `basket-live.js`), saveCompo coach2 visiteur, showAlert 'ko', séparateur partenaires, flushMatch (nom/sigle blanchissables), banner serveur. **README réaligné** sur le code réel. **Suite Playwright réécrite** (68 tests verts : 01 load, 02 binding, 03 live-update WS, 04 éditeur, 05 server-api, 06 team-folders ; 07 debug supprimé) + chromium installé.
