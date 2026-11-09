# LSEI — consignes projet (lues automatiquement par Claude Code, PC1 et PC2)

Site **Astro 5 statique** de la web TV associative **LSEI (Le Sport en Image)**. Déploiement : `git push origin main` → GitHub Actions « Build & Deploy vers OVH » (build + FTP OVH) ; Cloudflare en CDN/DNS devant. Build : `npm.cmd run build`. Photos joueurs : `npm run assets` (séparé). Dev : `npm.cmd run dev -- --port 4321`.

## 📄 Document d'état vivant — À MAINTENIR À CHAQUE MISE À JOUR
**À chaque fois que tu fais une mise à jour déployée (commit + push) depuis le PC1 OU le PC2, tu dois RÉÉCRIRE entièrement [`ETAT-DU-PROJET.md`](ETAT-DU-PROJET.md)** (date, machine, dernier commit, ce qui a changé, état courant, à faire ensuite) **et l'inclure dans le même push.** Ce fichier est écrasé à chaque mise à jour : il reflète toujours le dernier état, pour qu'un `git pull` sur l'autre PC reparte sans perte d'information. Voir aussi [`PASSATION-PC1-PC2.md`](PASSATION-PC1-PC2.md) (référence de fond, plus stable).

## 🧠 Bootstrap mémoire (au 1er démarrage sur une machine, ex. PC2)
La mémoire interne de Claude Code (`~/.claude/…/memory/`) **ne se synchronise PAS** entre machines. **Au début d'une session, si ta mémoire (MEMORY.md) ne contient pas encore les fiches du projet LSEI** (tu ne vois pas d'entrées `lsei-*` / `billard-*`), **lis [`PASSATION-PC1-PC2.md`](PASSATION-PC1-PC2.md) puis [`ETAT-DU-PROJET.md`](ETAT-DU-PROJET.md) et crée tes propres fiches mémoire** à partir de leur contenu (une fiche par fait : règles de commit, déploiement, archi billard 9 compétitions, pipeline Cuescore/auto-refresh, vocabulaire, UX, cette consigne d'état vivant…), avec un pointeur dans MEMORY.md. Fais-le **une seule fois** (si les fiches existent déjà, ne recommence pas). Ainsi chaque PC finit avec la même mémoire « riche », pas seulement les fichiers committés.

## ⚠️ Règles de commit (impératives)
1. **NE JAMAIS committer les fichiers de travail du PC2** (untracked exprès) : `public/uploads/cdm-blackball-2026-*.jpg` et `src/content/articles/championnat-du-monde-blackball-2026-bilan-des-bleus.md`. → Toujours committer avec des **chemins explicites**, **jamais** `git add -A` / `git add .`.
2. **Routine pré-commit systématique** :
   ```bash
   git checkout -- src/data/cache/channel-stats.json src/data/cache/broadcasts.json
   rm -f live.json
   git fetch origin -q
   git rev-list --left-right --count main...origin/main   # si remote a avancé : pull --rebase avant push
   ```
3. **FileZilla / FTP** : si on donne une consigne FTP, toujours re-donner **hôte / utilisateur / port**, **jamais le mot de passe**.
4. **Vocabulaire LSEI** : mots créés par LSEI à conserver tels quels (ex. « webtvspectateur(s) »). Ne pas « corriger ».
5. **UX** : minimiser les changements de page (accordéon / inline). La page « saison » a été supprimée volontairement — ne pas la recréer.

## Repères techniques
- **Billard = 9 compétitions Blackball** (Masters, Femmes, Mixte, Espoir, Junior, Vétéran, Prestige Vétéran, Para fauteuil, Para malvoyants), fiches silotées par catégorie reliées par `src/lib/crossComp.ts`.
- **Auto-refresh** 2×/jour (`.github/workflows/refresh-data.yml` → `scripts/import-blackball.mjs`) : réimporte les scores de la saison en cours depuis Cuescore pour les 9 compétitions. Détails et recette d'ajout de catégorie : voir [`PASSATION-PC1-PC2.md`](PASSATION-PC1-PC2.md).
