---
name: billard-hub-structure
description: Structure à 2 niveaux du hub Billard (Hub Billard → Blackball / Snooker / Américain)
metadata: 
  node_type: memory
  type: project
  originSessionId: da21c2bc-82e6-4514-9030-dcc992a759ea
  modified: 2026-07-24T13:26:44.445Z
---

Le hub Billard de [[lsei-new-site]] est à **2 niveaux** (refonte juillet 2026, à la demande du user : « Billard » ≠ « Blackball ») :

1. **`/billard/hub`** = **« Le hub Billard »** (`src/pages/billard/hub.astro`). Point d'entrée depuis le cadre discipline (`site.ts` : `hub: '/billard/hub'`). Affiche **3 cartes de type de jeu** (`.gcard`) :
   - **Blackball** → `/billard/blackball` (compétitions structurées).
   - **Snooker** → `/disciplines/billard/categorie/snooker` (vidéos seules, ~5).
   - **Billard américain** → `/disciplines/billard/categorie/billard-americain` (vidéos seules, ~24).
2. **`/billard/blackball`** = **« Le hub Blackball »** (`src/pages/billard/blackball.astro`, ex-contenu de hub.astro). Choix de la **compétition** : Masters (`/billard/saison/…`), Femmes (`/femmes`), Para (`/para-billard`). A un lien retour « ← Hub Billard ».

**Pourquoi** : seul le Blackball a des classements/joueurs/fiches ; Snooker & Américain n'ont que des vidéos (pas de compétition FFB) → leurs cartes mènent à la vidéothèque, pas à un faux hub vide (cf. règle [[lsei-ux-une-page]]). Le jour où ces disciplines sont structurées, transformer leur carte en vrai hub.
