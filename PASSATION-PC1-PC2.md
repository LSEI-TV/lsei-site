# Passation PC1 → PC2 — Projet LSEI (et chantiers associés)

> **But de ce document.** La mémoire de Claude Code (`~/.claude/…/memory/`) ne se synchronise **pas** d'un PC à l'autre. Ce fichier rassemble tout le contexte nécessaire pour qu'une session Claude Code sur le **PC2** reprenne le travail sans perte d'information. Le coller dans une conversation, ou le laisser à la racine du projet et demander à Claude de le lire.
>
> Dernière mise à jour : **09/11/2026** (fin de session PC1).

---

## 1. Règles CRITIQUES (à respecter avant tout commit)

1. **NE JAMAIS committer les fichiers de travail du PC2** (ils sont *untracked* exprès) :
   - `public/uploads/cdm-blackball-2026-*.jpg`
   - `src/content/articles/championnat-du-monde-blackball-2026-bilan-des-bleus.md`
   - → Toujours committer avec des **chemins explicites** (`git add <chemin> <chemin>…`), **jamais** `git add -A` / `git add .`.
2. **Routine pré-commit systématique** (avant chaque commit sur LSEI) :
   ```bash
   git checkout -- src/data/cache/channel-stats.json src/data/cache/broadcasts.json
   rm -f live.json
   git fetch origin -q
   git rev-list --left-right --count main...origin/main   # vérifier la divergence
   # si le remote a avancé (droite > 0) : git pull --rebase origin main avant de push
   ```
   Ces fichiers de cache (`channel-stats.json`, `broadcasts.json`, `live.json`) sont régénérés localement et ne doivent pas partir dans un commit.
3. **FileZilla / FTP** : si on donne une consigne d'envoi FTP manuel, **toujours re-donner hôte / utilisateur / port**, **jamais le mot de passe** (le user l'a de son côté). En pratique le déploiement passe par GitHub Actions (voir §2), pas par FTP manuel.
4. **Vocabulaire LSEI** : certains mots sont des créations de LSEI, à conserver tels quels — ex. « **webtvspectateur(s)** ». Ne pas « corriger ».
5. **UX** : minimiser les changements de page (préférer accordéon / inline). La page « saison » a été supprimée volontairement — **ne pas la recréer**.

---

## 2. Le projet LSEI & son déploiement

- **LSEI = Le Sport en Image** : web TV associative sportive. Site **Astro 5 statique**, dossier `D:\LSEI - NEW SITE`. 5 disciplines filmées principales + billard très développé.
- **Build** : `npm.cmd run build` (sous Windows/Bash, utiliser `npm.cmd`). ~3 min, ~5500+ pages. `npm run assets` (= `scripts/build-player-assets.mjs`) est **séparé** et traite les photos joueurs (cutouts) — à relancer après ajout de photos.
- **Déploiement** : `git push origin main` → GitHub Actions **« Build & Deploy vers OVH »** (repo `github.com/LSEI-TV/lsei-site`) qui build + envoie en **FTP sur OVH**. **Cloudflare** = CDN/DNS devant (créer les sous-domaines côté Cloudflare). Rebuild nocturne des vidéos par une autre action. Worker OAuth pour l'admin.
- **Dev local** : `npm.cmd run dev -- --port 4321` → http://localhost:4321.
- **Auto-refresh données** : `.github/workflows/refresh-data.yml`, cron **2×/jour** (~10h30 et ~17h FR), ré-importe depuis **Cuescore** la saison en cours des catégories Blackball (voir §4).

---

## 3. Architecture Billard Blackball (le cœur du site)

- **9 compétitions** sous le hub Blackball (`/billard/blackball`), chacune son « mini-univers » (classement, joueurs, fiches carrière, comparateur, tableaux TN) :
  Masters `/billard` · Femmes `/femmes` · Mixte National `/mixte` · Espoir `/espoir` · Junior `/junior` · **Vétéran `/veteran`** · **Prestige Vétéran `/prestige`** · Para fauteuil `/para-billard` · Para malvoyants `/para-billard-malvoyants`.
- **Hub à 2 niveaux** : `/billard/hub` (Blackball / Snooker / Américain) → `/billard/blackball` (choix de la compétition).
- **Fiches silotées par catégorie** : 1 personne = 1 fiche **par catégorie**, reliées par les **liens croisés** (`src/lib/crossComp.ts` + composant `CrossComp.astro`, bandeau « Aussi présent en »). Clé de jointure = l'**id Cuescore** (le même d'une catégorie à l'autre ; réserve : quelques joueurs à **double id** selon la catégorie → lien parfois manquant).
- **Couleur par compétition** (champ `color` de `DEFS` dans `crossComp.ts`, miroir des cartes du hub) : Masters #7C4DD6, Femmes #F2B90A, Mixte #D6397E, Espoir #2E9E5B, Junior #0EA5C4, **Vétéran #3457D5**, **Prestige #C79A2E**, Para #14A38B, ParaMv #E0563B.
- **Fiche joueur — en-tête** :
  - **Badge de catégorie** (`.jh-cat`) = la catégorie de la PAGE, couleur `--cc` de la compétition.
  - **Épithète** = catégories de la **saison en cours** + rang (ex. « Vétéran 1ᵉʳ · Blackball Master 26ᵉ »), la courante en tête colorée, les autres atténuées. Calcul : `currentCategoriesInfo(pid, root)` / `categoryTag(root)`. Le rang suit l'auto-refresh.
  - **CRUCIAL** : `--cc` (couleur compétition) n'habille QUE le badge + la catégorie courante. La **couleur du maillot** `--pc` (qui pilote tout le héros via `.jfiche{--c-billard:var(--pc)}`) reste **intacte**. Fiches « broadcast » sombres aux couleurs du maillot (graphite si gris).
- **Invités Masters** : un invité d'étape Masters est un joueur du **Mixte National** → sa carte pointe vers `/mixte/joueur/<slug>` (PAS de fiche Masters auto-créée). Modèle FFB : un joueur « accède » au Masters pour une saison en gardant sa catégorie d'origine jouée en parallèle.
- **Permanents / invités** Masters 2026-2027 : 28 permanents + 4 invités/étape, maj manuelle depuis Cuescore.
- **Cartes OG de partage** (réseaux sociaux, 1200×630, générées au build) : `src/lib/ogCard.ts` + endpoints `src/pages/og/…`. Carte **joueur** (toutes catégories) avec logo FFB (haut-gauche) + logo LSEI (bas-gauche) ; carte **club** basket ; carte **discipline** ; carte **home**.

---

## 4. Pipeline de données Cuescore → JSON

- **API** : `https://api.cuescore.com/tournament/?id=<id>` (standings + matchs), `…/ranking/?id=<id>` (rang + points officiels). L'id du classement officiel d'une saison est dans le champ `tournoi.rankings` (un par saison). Page org : `cuescore.com/ffb?season=YYYY`.
- **Saison FFB** = septembre → « saison 2023 » = 2023-2024. Le Blackball FFB sur Cuescore **débute en 2023-2024** (pas d'antériorité), sauf **Prestige Vétéran** qui est **neuf en 2026-2027**.
- **Import historique** : `scripts/import-category.mjs --cat <junior|veteran|prestige> --out <dir> --audit` (générique ; forfaits 0-0 exclus ; audit = comparaison nb matchs vs Cuescore, viser **0 écart**). Puis `cp results-<cat>-*.json` dans `src/data/billard/`.
- **Auto-refresh (saison en cours)** : `scripts/import-blackball.mjs`, tableau `COMPETITIONS` (une entrée par catégorie avec `tnRe`, `cdfRe`, `rankingId` courant). Couvre **les 9 compétitions**. rankingId courants 2026-2027 : Masters 88637449, Femmes 88637419, Mixte 88637443, Espoir 88637410, Junior 88637407, Vétéran 88637422, Prestige 88637437, **Para fauteuil 88638310, Para malvoyants null** (à renseigner si CHF). Supporte `--only <clé[,clé…]>` pour un run manuel ciblé.
  - ⚠️ Le `tnRe` Vétéran `-\s*V[ée]t[ée]ran\s*-` exclut « Prestige Vétéran » grâce au tiret devant ; Prestige a son propre `tnRe`. Para fauteuil = `-\s*Para-?Billard\s*-` (nom 2026-2027).
  - **Para = montage « auto-promotion »** : au 09/11/2026 le circuit Para 2026-2027 n'a encore **aucun résultat** sur Cuescore. Fichiers **graines vides** `results-para-2026-2027.json` / `results-paramv-2026-2027.json` + flag `has2627` dans `seasonsPara`/`seasonsParaMalvoyants` qui calcule `status`/`results` dynamiquement : 2025-2026 reste « current » tant que vide ; la saison 2026-2027 devient vitrine **automatiquement au prochain build** dès le 1er match para validé. (Patron réutilisable pour toute catégorie à démarrage différé.)
- **Audits réalisés (0 écart)** : Mixte (33 tournois / 5910 matchs), Junior, Vétéran (251+275+370+31 matchs), Prestige (15 matchs).
- **Photos multi-catégories** : `node scripts/propagate-photos.mjs` (dry-run) puis `--apply` → copie la photo d'un joueur présent dans ≥2 catégories dans les dossiers (catégorie, saison) manquants. Puis `npm run assets`, puis build. Dossiers photos : `public/billard/blackball/<CAT>/<saison>/`.

---

## 5. ✅ Travail de cette session PC1 (déployé le 09/11/2026)

- **Correctif invités** (commit antérieur, en ligne) : les invités Masters pointent vers leur fiche Mixte.
- **Catégorie distinction** (commit `c6c510f`) : badge de catégorie + couleur par compétition sur les 7+ fiches, maillot préservé.
- **Cartes OG billard** (commit `5099107`) : logos FFB + LSEI, texte « LSEI.TV » retiré.
- **Catégories Vétéran + Prestige Vétéran** (commit **`065c1fe`**, le dernier) :
  - Vétéran `/veteran` (bleu roi #3457D5) : 4 saisons, audit 0 écart, 534 fiches.
  - Prestige Vétéran `/prestige` (or #C79A2E) : **catégorie neuve, 1 seule saison 2026-2027** (`seasonsPrestige.ts` à une entrée).
  - Câblage complet : HubSwitch, HubNav, cartes hub Blackball (**9 compétitions**) + hub Billard, crossComp, cartes OG, auto-refresh (import-blackball + refresh-data.yml), photos propagées (9 + 2).
- **Auto-refresh Para fauteuil + malvoyants** (commit `fd2f568`) : les 2 Para rejoignent le robot d'import avec montage auto-promotion (voir §4) → **les 9 compétitions** sont couvertes par la maj auto 2×/jour.
- **État git en fin de session** : `main` = **`fd2f568`** (+ ce document), poussé, déploiement OVH lancé. Aucun travail local non committé (hors fichiers PC2 interdits volontairement untracked).

**Recette pour ajouter une future catégorie** : voir le détail dans la mémoire `billard-nouvelles-categories-todo` (reproduite ci-dessous §7). En bref : `import-category.mjs --audit` → `seasons<Cat>.ts` → `cp -r src/pages/veteran src/pages/<cat>` + sed → câbler (blackball.astro, hub.astro, HubSwitch, HubNav, crossComp DEFS, build-player-assets, ogPlayers, propagate-photos, import-blackball + refresh-data.yml, dossiers photos) → propagate-photos → assets → build.

---

## 6. Autres chantiers LSEI (backlog / contexte)

- **Fiches joueurs — International** : section « International » (Mondial 2026), relancer `export_lsei.py` après chaque journée.
- **Articles SEO** : champs `seoTitle` / `seoDescription` / `updated` ; page dossier `/billard/championnat-du-monde-blackball-2026` (préfixe d'id). ⚠️ l'article CDM bilan des bleus est un **fichier PC2** (ne pas committer depuis PC1, cf §1).
- **Directs YouTube** : affichage via `live.json` + cron/clé YouTube ; fragilités quota/cron, garde-fous client (bascule auto si heure passée).
- **Basket — site dans le site** : hub `/basket` + mini-sites clubs `/clubs/<slug>` (façon NBA), Fougères pilote (publié 11/09/2026). Archi live = WebSocket (comme PALET) ; README désynchronisé. Backlog : README, tests Playwright, garde conflit.
- **Palets** : page annuelle `/palets/tournoi-des-champions`.
- **Audit backlog** (en attente du feu vert du user) : 404, images bandeau, README.

---

## 7. Index mémoire PC1 (à recréer si besoin sur PC2)

> Ces entrées sont la mémoire projet de Claude sur le PC1. Sur le PC2, Claude peut les recréer dans sa propre mémoire au fil de l'eau ; l'essentiel est résumé ci-dessus.

- **lsei-new-site** — refonte lsei.tv, Astro, `D:\LSEI - NEW SITE`.
- **lsei-deploiement** — OVH (FTP via GitHub Actions) + rebuild nocturne vidéos ; DNS Cloudflare ; Worker OAuth admin.
- **lsei-vocabulaire** — « webtvspectateur(s) » à conserver.
- **lsei-ux-une-page** — minimiser les changements de page ; page saison supprimée.
- **basket-site-dans-site**, **basket-live-architecture**, **basket-live-todo**, **lsei-direct-detection** — voir §6.
- **billard-\*** — hub structure, femmes, mixte (+audit), espoir, junior, **nouvelles-categories (toutes faites)**, auto-refresh, fiche-epithète, invités, affiches tournois, podium étape, para CdF, import historique, OG cartes.
- **Autres projets du user** (hors LSEI, dossiers séparés) :
  - **La Malle aux Clés** (conciergerie de Delphine) — Astro, `D:\SITE LA MALLE AUX CLES - DELPHINE`.
  - **Site Christophe Lambert** — GitHub `c8lambert/site-lambert`, clone `D:\SITE LAMBERT - GITHUB`, push = déploiement OVH auto.
  - **NOVA** — plateforme multi-sports de gestion de tournois (MySQL OVH), palet puis blackball, viser 256+ joueurs ; doc de vision `D:\NOVA\approche conception - 1`.
  - **FFB** — montages EDF Blackball Londres 2026 (`D:\FFB\montage-edf-blackball-2026`, gabarits HTML → Chrome headless) ; bilan Mondial (`…\bleus-du-jour\bilan-mondial-2026`, maj chaque soir).

---

### Pour reprendre sur le PC2
1. `cd "D:\LSEI - NEW SITE"` (adapter si le chemin diffère sur PC2), `git pull` pour récupérer le dernier commit.
2. Lire ce fichier (ou le coller en début de conversation) + respecter le §1.
3. `npm.cmd install` si besoin, puis `npm.cmd run dev` pour prévisualiser.
