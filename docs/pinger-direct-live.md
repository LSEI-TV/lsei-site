# Pinger externe — rafraîchir `live.json` en continu (détection direct fiable)

## Pourquoi
Le workflow **`live-status.yml`** interroge YouTube et régénère `live.json` (→ la vidéo s'affiche sur `/direct/` et le badge « EN DIRECT »). Il est planifié toutes les 5 min, mais **GitHub throttle les `schedule`** (exécutions espacées de plusieurs heures). Résultat : au lancement d'un direct, `live.json` est souvent périmé.

**Solution** : un service externe (fiable, lui) déclenche le workflow via l'API GitHub **toutes les 2-3 min**. Au moment où tu cliques « Passer en direct » sur YouTube, le site réagit en ≤ 3 min, automatiquement.

> Le correctif client de `/direct/` (déployé le 17/11/2026) affiche déjà le direct dès l'heure programmée même si `live.json` est en retard. Le pinger, lui, capte le **lancement RÉEL** (early/late) et met aussi à jour le badge `/basket/`. Les deux se complètent.

---

## Étape A — Créer un token GitHub (fine-grained, minimal)
1. https://github.com/settings/personal-access-tokens/new (Settings → Developer settings → **Fine-grained tokens** → Generate new token).
2. **Token name** : `pinger-live-lsei`.
3. **Resource owner** : `LSEI-TV`.
4. **Expiration** : 1 an (noter la date de renouvellement).
5. **Repository access** : *Only select repositories* → **`lsei-site`**.
6. **Permissions → Repository permissions → Actions** : **Read and write**. (Metadata: Read s'ajoute tout seul.)
7. **Generate token** → **copier** la valeur (commence par `github_pat_…`). On ne la revoit plus.

## Étape B — Créer le ping sur cron-job.org (gratuit, sans code)
1. Compte gratuit sur https://cron-job.org → **Create cronjob**.
2. **Title** : `LSEI live.json`.
3. **URL** :
   ```
   https://api.github.com/repos/LSEI-TV/lsei-site/actions/workflows/live-status.yml/dispatches
   ```
4. **Schedule** : toutes les **3 minutes** (onglet schedule : minutes = `*/3`, ou coche « every 3 minutes »). Option : limiter aux jours/heures de diffusion pour économiser le quota.
5. Onglet **Advanced** :
   - **Request method** : `POST`
   - **Headers** (une par ligne) :
     ```
     Accept: application/vnd.github+json
     Authorization: Bearer github_pat_TON_TOKEN_ICI
     X-GitHub-Api-Version: 2022-11-28
     Content-Type: application/json
     User-Agent: lsei-pinger
     ```
   - **Request body** :
     ```
     {"ref":"main"}
     ```
6. **Save**. Une réponse **HTTP 204** = succès (GitHub ne renvoie pas de corps). Vérifie dans GitHub → Actions qu'une nouvelle exécution « Statut direct (live.json) » apparaît ~chaque 3 min.

### Test manuel (facultatif, en local)
```bash
curl -i -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer github_pat_TON_TOKEN_ICI" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "User-Agent: lsei-pinger" \
  https://api.github.com/repos/LSEI-TV/lsei-site/actions/workflows/live-status.yml/dispatches \
  -d '{"ref":"main"}'
```
Attendu : `HTTP/2 204`.

---

## Alternative — Cloudflare Worker (tu as déjà Cloudflare)
Le token reste **dans TON compte** (pas chez un tiers). Worker avec **Cron Trigger** `*/3 * * * *` :
```js
export default {
  async scheduled(event, env, ctx) {
    await fetch('https://api.github.com/repos/LSEI-TV/lsei-site/actions/workflows/live-status.yml/dispatches', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'lsei-pinger',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    });
  },
};
```
`GITHUB_TOKEN` = secret du Worker (`wrangler secret put GITHUB_TOKEN`). Cron Trigger dans `wrangler.toml` : `[triggers]\ncrons = ["*/3 * * * *"]`.

---

## Notes
- **Quota YouTube** : chaque exécution ≈ 3 unités. Toutes les 3 min 24/7 ≈ 1 440 u/jour (quota 10 000/j). Si besoin, ajouter le secret **`YOUTUBE_API_KEY_LIVE`** (clé dédiée, quota isolé des builds) — `check-live.mjs` la préfère automatiquement.
- **Garder** le `schedule: '*/5'` du workflow comme **filet de secours** (dépôt public = minutes Actions illimitées).
- Le token a le droit **Actions** uniquement, sur **ce seul repo** → surface minimale. Le révoquer = il cesse de fonctionner.
