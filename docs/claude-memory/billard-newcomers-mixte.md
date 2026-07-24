---
name: billard-newcomers-mixte
description: Section « Les nouveaux accédants » du Masters + provenance Mixte National (pattern feeder N→N+1)
metadata: 
  node_type: memory
  type: project
  originSessionId: da21c2bc-82e6-4514-9030-dcc992a759ea
  modified: 2026-07-21T07:57:40.663Z
---

Sur chaque hub Masters ([saison/[season]/index.astro](src/pages/billard/saison/[season]/index.astro)), la section **« Les nouveaux · saison X »** met en avant les joueurs qui DÉBUTENT au Blackball Master cette saison-là.

- **Accédant** = joueur qui ARRIVE au Masters cette saison = présent dans l'effectif mais ABSENT de la saison précédente immédiate (pas « jamais vu avant »). Ceux déjà passés par le Masters autrefois (dans `earlierIds` = saisons jouées antérieures + galeries photo `archives joueurs/` résolues via `playersByPhotoKey`) sont badgés « ↩ De retour au Masters » ; les autres sont des débutants (badge top-5). Ce groupe correspond aux N premiers promus du Mixte National de l'an passé. ⚠️ NE PAS revenir à « jamais vu avant » : ça masquait les joueurs de retour (ex. 2025/2026 ne montrait que Piel au lieu des 4 vrais accédants Amrani Hanchi/Ostrowska/Pellissier/Piel = top-4 Mixte 24/25).
- Saison à venir (ex. 2026/2027) : **RÈGLE D'ACCESSION = les 8 premiers du Mixte National (feeder) montent au Masters**. La section est pilotée par le CLASSEMENT (constante `PROMOTED = 8` dans la branche `!hasData`), pas par les photos ; photo via `photoOf` si dispo, sinon initiale. Un joueur déjà passé par le Masters (ex. Pierre Damien Coz) est badgé « ↩ De retour au Masters » + lien fiche. Le user signale les changements ponctuels d'accession (ajuster `PROMOTED` ou filtrer).
- Saison jouée : carte = bilan Masters réel (classement/points/V-D/tournois) + ligne provenance `.newc-mixte` si le Mixte feeder est dispo.

**Pattern feeder (clé) : le classement Mixte National de l'année N alimente la provenance des nouveaux du Masters N+1.** Ex. Mixte 2025/2026 → nouveaux Masters 2026/2027 ; Mixte 2024/2025 → nouveaux Masters 2025/2026 (Benjamin Piel, 4ᵉ Mixte). Confirmé par les données : les débutants Masters d'une saison sont absents du Mixte de la MÊME saison, présents dans celui de l'année d'avant.

**Pour ajouter un nouveau Mixte** (le user fournit les liens Cuescore saison par saison) :
1. `npm run gen:season -- --ranking=<id> --out=src/data/billard/results-mixte-AAAA-AAAA.json --competition="Blackball Mixte National" --season="AAAA/AAAA"` (lancer en **PowerShell**, pas via npm.cmd Bash qui casse sur les espaces du chemin node).
2. Dans index.astro : ajouter l'import + une entrée dans `MIXTE_BY_SEASON` (mappé par slug de saison). Le reste est automatique (calcul du feeder `N-1` par parsing du slug).

Déjà en place : `results-mixte-2025-2026.json`, `results-mixte-2024-2025.json`, `results-mixte-2023-2024.json` (couvre nouveaux Masters 2026/2027, 2025/2026, 2024/2025). Manque encore : **Mixte 2022/2023** (→ nourrira les 10 débutants Masters 2023/2024). Voir [[lsei-new-site]].

**Saison 2026/2027 préparée sur les 3 compétitions (2026-07-21).** Masters, **Femmes ET Para** ont maintenant une saison `2026-2027` `upcoming` : on ARRIVE dessus (redirections `/femmes` et `/para-billard` → `*_LANDING_SEASON = 2026-2027` ; Masters via `LANDING_SEASON`), et les onglets Classement/Joueurs/Comparateur renvoient en 1 clic vers la dernière saison jouée (2025/2026) via la prop `dataSeason` de `HubNav` (pas de page « à venir » vide). Les hubs Femmes/Para ont reçu la gestion `hasData` (état « Saison à venir » + carte d'attente) qui manquait. ⚠️ **Décision user explicite : Femmes et Para RÉUTILISENT le calendrier Masters `cal2627`** (exporté de `seasons.ts`) — donc le « Mondial de Londres » et les intitulés CDF/France y apparaissent même s'ils sont propres au Masters. NE PAS « corriger » : c'est voulu (calendrier provisoire commun) jusqu'à ce que le user fournisse les vrais calendriers Femmes/Para.
