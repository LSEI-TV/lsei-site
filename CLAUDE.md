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

### 📸 Photos joueurs — convention catégorie (invités Masters)
Un joueur du **Mixte National invité au Masters** n'est PAS un joueur qualifié Masters. Le site le détecte **tout seul** depuis Cuescore (`import-blackball.mjs`, `hasInvites: true` → champ `invite: true` + rang Mixte affiché) — **aucun nom de dossier n'entre en jeu** pour ça.
- **Archive perso `D:\BLACKBALL\joueurs`** (NON lue par le site, purement organisationnelle) : nommer par **catégorie d'origine** → `mixte - prenom nom` pour un invité, et ne passer à `masters - …` qu'à la **vraie qualification** (nouvelle saison). Le `parcours-AAAA-AAAA.txt` conservé par saison sert de **base de comparaison** avant/après qualification (il n'est lu par aucun script aujourd'hui).
- **Placement de la photo DANS LE DÉPÔT** (`public/billard/blackball/<CAT>/<saison>/`) — **≠ archive** : le pipeline `npm run assets` (`build-player-assets.mjs`, PASSE 2) donne **priorité à MASTERS** (ordre : MASTERS > FEMMES > MIXTE > PARA > ESPOIR > JUNIOR > VETERAN > PRESTIGE) et choisit la saison la plus récente **DANS** la catégorie gagnante (sauf joueur listé dans `players-roster.json` → récence globale). Conséquence : pour un joueur **ayant un historique Masters**, sa **photo active doit être dans `MASTERS/<saison récente>`** ; une photo rangée dans `MIXTE/` y serait **masquée** par n'importe quelle photo Masters (plus ancienne) → la nouvelle photo ne s'afficherait jamais. Règle pratique : **headshot actif = dossier de la catégorie de plus haute priorité où le joueur participe cette saison** (donc MASTERS pour un invité). Après dépôt : `npm run assets`, vérifier `public/billard/cutouts/<slug>.png`.
