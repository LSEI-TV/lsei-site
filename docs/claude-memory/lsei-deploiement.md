---
name: lsei-deploiement
description: Plan de mise en ligne du site LSEI (OVH) + rebuild automatique pour rafraîchir les vidéos YouTube
metadata: 
  node_type: memory
  type: project
  originSessionId: da21c2bc-82e6-4514-9030-dcc992a759ea
---

Le site LSEI (`D:\LSEI - NEW SITE`, Astro **statique**) sera hébergé sur **OVH** (OVH SAS déjà renseigné dans les mentions légales).

**Point clé** : les vidéos sont lues depuis l'API YouTube **au build** (`npm run build`), pas en temps réel. Toute modif YouTube (retirer/ajouter une vidéo, renommer une playlist) n'apparaît qu'au **prochain build + déploiement**.

**À prévoir le jour J — rebuild programmé** pour que le site se rafraîchisse seul (ex. chaque nuit) :
- Hébergement **mutualisé OVH seul** = ne peut PAS builder (cron PHP, pas Node). Il sert seulement les fichiers `dist/`.
- **Solution recommandée** : code sur GitHub + **GitHub Actions** avec un workflow `schedule` (cron) qui exécute `npm run build` et déploie `dist/` sur OVH (FTP/SSH). Gratuit, robuste, marche avec le mutualisé.
- Alternative : **VPS OVH** avec cron `npm run build` sur le serveur.

Autres éléments de déploiement en attente : vraie clé `YOUTUBE_API_KEY` + `YOUTUBE_CHANNEL_ID` en variables d'env de prod ; placeholders légaux restants ; vrai logo.

Voir [[lsei-new-site]], [[billard-femmes]].
