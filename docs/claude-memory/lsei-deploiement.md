---
name: lsei-deploiement
description: Archi déploiement LSEI — OVH héberge, GitHub Actions build+FTP (+ rebuild nocturne vidéos), Cloudflare = Worker OAuth de l'admin
metadata: 
  node_type: memory
  type: project
  originSessionId: da21c2bc-82e6-4514-9030-dcc992a759ea
  modified: 2026-07-27T09:33:47.577Z
---

Site LSEI (`D:\LSEI - NEW SITE`, Astro **statique**, `site: https://lsei.tv`) versionné sur **GitHub `LSEI-TV/lsei-site`** (privé, `main`). **3 briques bien distinctes** (mises en place sur PC2, juillet 2026) :

1. **Hébergement = OVH** (fichiers statiques). `lsei.tv` résout vers une IP OVH (164.132.235.17, `Server: Apache`) — c'est NORMAL. Cloudflare n'est PAS devant le site (pas de CDN/cache en frontal → pas de souci de cache/staleness).
2. **CI/CD = GitHub Actions** :
   - `.github/workflows/deploy.yml` : `push` main + **cron `0 4 * * *` (rebuild nocturne = refresh vidéos YouTube)** + manuel. Node 22, `npm run build`, **deploy `dist/` sur OVH par FTP** (secrets `FTP_*`, `YOUTUBE_API_KEY`; channel `UCYUOdKr28cOjLzHWv6pTpjQ`), ping IndexNow. → **refresh auto vidéos = DÉJÀ opérationnel.**
   - `.github/workflows/live-status.yml` : cron `*/30 * * * *` → `scripts/check-live.mjs` écrit `live.json` (statut direct) envoyé seul sur OVH.
3. **Cloudflare = 1 Worker OAuth** `sveltia-cms-auth.marc-poolos.workers.dev` (compte `marc-poolos`). Sert UNIQUEMENT à connecter l'**admin en ligne** Decap CMS (`lsei.tv/admin`, `public/admin/config.yml`, backend `github` repo LSEI-TV/lsei-site). Publier un article via l'admin → commit sur GitHub → rebuild → OVH.

⚠️ NE PAS confondre : ce n'est ni Cloudflare Pages ni un CDN Cloudflare — juste le relais d'auth de l'admin. Voir [[lsei-new-site]].
