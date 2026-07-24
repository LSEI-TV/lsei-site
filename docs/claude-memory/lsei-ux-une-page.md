---
name: lsei-ux-une-page
description: "Principe UX LSEI — minimiser les changements de page, tout sur une page (les webtvspectateurs se perdent sinon)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: da21c2bc-82e6-4514-9030-dcc992a759ea
  modified: 2026-07-21T09:36:31.058Z
---

Le user veut **minimiser les changements de page** sur lsei.tv : son public (les [[lsei-vocabulaire|webtvspectateurs]]) « se perd » quand on navigue trop souvent. Préférer la **divulgation sur place** (accordéon / inline / onglet qui pointe vers du contenu réel) plutôt qu'une nouvelle page.

**Why:** demande explicite répétée — « c'est plus simple d'avoir les informations sur une page ».

**How to apply (billard, fiches carrière) :**
- Le **parcours saison par saison** est un **accordéon** sur la fiche carrière (`billard|femmes|para-billard/joueur/[id].astro`) qui contient TOUT le détail d'une saison (6 tuiles + forme/série/moyennes/plus large victoire + parcours étape par étape). Données déjà en mémoire via `bySeason[i].R`/`.p` → aucune requête ni page séparée.
- La page par-saison `saison/[season]/joueur/[id].astro` a été **SUPPRIMÉE** (2026-07-21) sur les 3 disciplines. **NE PAS la recréer** ni y faire pointer de liens. Le libellé de saison des « Derniers résultats » est du texte simple (plus de lien).
- Idem sur les hubs des saisons à venir : les onglets Classement/Joueurs/Comparateur d'une saison sans données renvoient vers la dernière saison jouée (prop `dataSeason` de HubNav), pas vers une page « à venir » vide. Voir [[billard-newcomers-mixte]].

Accordéon = handler global délégué dans `Base.astro` sur `[data-accordion]` (toggle du panneau suivant + swap glyphe ▾/▴). Cadres cliquables = `[data-card-href]` (même script global).
