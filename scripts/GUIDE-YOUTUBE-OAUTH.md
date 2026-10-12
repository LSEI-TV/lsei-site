# Autoriser le renommage YouTube — mode d'emploi Google Cloud

Objectif : donner à `scripts/rename-videos.mjs` le droit de **renommer tes vidéos**
sur **ta** chaîne. Cela se fait **une seule fois** (≈ 10 min). Aucun paiement,
aucune carte bancaire.

> ⚠️ **Le plus important d'abord** : à l'étape d'autorisation (étape 6), connecte-toi
> avec **le compte Google qui gère la chaîne LSEI**. Si la chaîne est une
> « **Brand Account** » (compte de marque), choisis bien ce compte-là dans la liste,
> pas ton compte perso. Le script ne peut renommer que les vidéos que **ce compte**
> a le droit de modifier.

---

## 1. Ouvrir la console et créer un projet

1. Va sur **https://console.cloud.google.com** (connecte-toi avec le compte de la chaîne).
2. En haut à gauche, clique sur le **sélecteur de projet** (à côté du logo Google Cloud).
3. **Nouveau projet** → Nom : `LSEI YouTube` → **Créer**.
4. Attends quelques secondes, puis **sélectionne** ce projet (sélecteur en haut).

## 2. Activer l'API YouTube

1. Menu ☰ (en haut à gauche) → **API et services** → **Bibliothèque**.
2. Dans la recherche, tape **`YouTube Data API v3`** → clique dessus.
3. Bouton bleu **Activer**.

## 3. Configurer l'écran de consentement

1. Menu ☰ → **API et services** → **Écran de consentement OAuth**
   (parfois nommé **« Google Auth Platform »** / **« Branding »** dans la nouvelle interface).
2. Type d'utilisateur : **Externe** → **Créer**.
3. Remplis le minimum obligatoire :
   - **Nom de l'application** : `LSEI YouTube`
   - **E-mail d'assistance utilisateur** : ton adresse
   - **Coordonnées du développeur** : ton adresse (tout en bas)
   - Le reste : laisse vide → **Enregistrer et continuer**.
4. Écran **Champs d'application (scopes)** : ne rien ajouter → **Enregistrer et continuer**.
5. Écran **Utilisateurs de test** → **+ Ajouter des utilisateurs** → saisis **l'adresse
   Gmail du compte de la chaîne** → **Ajouter** → **Enregistrer et continuer**.
6. **Résumé** → **Revenir au tableau de bord**.

> Laisse l'application en statut **« Test »** (ne clique pas sur « Publier l'application »).
> C'est suffisant pour un usage perso. Voir le piège des 7 jours plus bas.

## 4. Créer l'identifiant OAuth

1. Menu ☰ → **API et services** → **Identifiants**.
2. **+ Créer des identifiants** → **ID client OAuth**.
3. Type d'application : **Application de bureau** (important — ça autorise le retour
   sur `127.0.0.1` sans configuration).
4. Nom : `LSEI rename` → **Créer**.
5. Une fenêtre affiche **l'ID client** et le **Code secret du client**. Garde-la ouverte
   (ou **Télécharger le JSON**).

## 5. Enregistrer les identifiants dans le projet

Crée le fichier **`D:\lsei-site\youtube-oauth.json`** avec ce contenu
(colle tes deux valeurs de l'étape 4) :

```json
{
  "client_id": "0000000000-xxxxxxxxxxxxxxxx.apps.googleusercontent.com",
  "client_secret": "GOCSPX-xxxxxxxxxxxxxxxxxxxx"
}
```

> Ce fichier contient un secret → il est **déjà exclu de Git** (`.gitignore`). Ne le partage pas.

## 6. Autoriser (une fois)

Dans un terminal, à la racine du site :

```bash
cd "D:\lsei-site"
node scripts/rename-videos.mjs auth
```

- Une page Google s'ouvre. **Choisis le compte de la chaîne.**
- Message « Google n'a pas validé cette application » → **Paramètres avancés** →
  **Accéder à LSEI YouTube (non sécurisé)**. (Normal : c'est TON appli, en mode test.)
- Coche l'autorisation **« Gérer votre compte YouTube »** → **Continuer**.
- L'onglet affiche « Autorisation reçue… » → reviens au terminal :
  `✓ refresh_token enregistré dans youtube-oauth.json`.

C'est fini. Tu n'as plus à refaire les étapes 1 à 6.

---

## Utiliser le renommage

1. Regénère la liste si besoin : `node scripts/audit-videos.mjs`
   → remplit `rename-videos.csv`.
2. Ouvre **`rename-videos.csv`** dans Excel. Complète **uniquement** la colonne
   **`nouveau_titre`** pour les vidéos à renommer (laisse les autres vides). Enregistre
   en gardant le format CSV.
3. Aperçu (ne modifie **rien**) :
   ```bash
   node scripts/rename-videos.mjs
   ```
4. Quand l'aperçu te convient, applique :
   ```bash
   node scripts/rename-videos.mjs --apply
   ```

Format de titre recommandé (pour la reconnaissance auto sur le site) :

```
🎱 26-27 | BLACKBALL MASTERS | 1/8 Finale – TN1 | JOLY vs LEFRANÇOIS
```

L'ordre des mots, les initiales et les accents sont désormais tolérés — l'essentiel
est que **les deux noms de famille** figurent dans le titre.

---

## Pièges à connaître

- **Expiration à 7 jours (mode test)** : en statut « Test », l'autorisation peut expirer
  au bout de ~7 jours. Si un jour tu vois une erreur de token, relance simplement
  `node scripts/rename-videos.mjs auth`. (Fais tes renommages par sessions groupées.)
- **Quota journalier** : l'API offre 10 000 unités/jour. Un renommage coûte ~51 unités
  → **~190 vidéos/jour** maximum. Si ça s'arrête avec une erreur « quota », reprends le
  lendemain (le CSV garde ta progression : les titres déjà corrects sont ignorés).
- **`redirect_uri_mismatch`** : tu as choisi un type d'application autre que
  « Application de bureau » à l'étape 4. Recrée un ID client en « Application de bureau ».
- **`insufficientPermissions` / vidéo introuvable** : tu n'es pas connecté avec le compte
  qui possède la chaîne. Relance `auth` et choisis le bon compte (de marque).
