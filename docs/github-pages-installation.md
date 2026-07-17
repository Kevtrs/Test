# Installation détaillée — GitHub Pages + iPad

Ce guide détaille, étape par étape, la mise en ligne du photobooth et son
installation sur un iPad destiné à servir de borne photo.

## Étape 1 — Vérifier le contenu du dépôt

À la racine du dépôt, vous devez retrouver au minimum :

```
index.html
manifest.json
service-worker.js
css/
js/
assets/
```

Aucune étape de compilation n'est nécessaire : le dépôt est publié tel
quel.

## Étape 2 — Activer GitHub Pages

1. Ouvrez le dépôt sur GitHub.
2. **Settings** (Paramètres) → **Pages** (menu de gauche).
3. Sous **Build and deployment** :
   - **Source** : `Deploy from a branch`.
   - **Branch** : choisissez la branche à publier (ex. `main`) et le
     dossier `/ (root)`.
4. Cliquez sur **Save**.
5. GitHub affiche une bannière verte avec l'URL publique une fois le
   déploiement terminé (généralement moins de 2 minutes), au format :

   ```
   https://<votre-utilisateur>.github.io/<nom-du-depot>/
   ```

## Étape 3 — Vérifier que tout se charge correctement

Ouvrez l'URL ci-dessus sur ordinateur (Chrome ou Safari) et vérifiez dans
les outils de développement (onglet *Network*/*Réseau*) qu'aucune requête
ne renvoie une erreur 404. Si un fichier ne se charge pas :

- vérifiez que son chemin dans `index.html` / `manifest.json` /
  `service-worker.js` est bien **relatif** (ne commence pas par `/`) ;
- vérifiez la casse des noms de fichiers (GitHub Pages est sensible à la
  casse, contrairement à certains environnements Windows/Mac locaux).

## Étape 4 — HTTPS (obligatoire pour la caméra et le service worker)

GitHub Pages fournit automatiquement un certificat HTTPS pour les domaines
`github.io`. Vérifiez simplement, dans **Settings → Pages**, que
**Enforce HTTPS** est coché. Sans HTTPS, `getUserMedia()` (caméra) et les
service workers ne fonctionnent pas.

## Étape 5 — Premier chargement sur l'iPad (avec Internet)

1. Connectez l'iPad à un Wi-Fi avec accès Internet (pas encore celui de la
   Canon SELPHY).
2. Ouvrez l'URL GitHub Pages dans **Safari**.
3. Autorisez la caméra lorsque c'est demandé.
4. Naviguez un peu dans l'application (accueil → caméra → retour) pour
   laisser le service worker terminer la mise en cache de toutes les
   ressources. Vous pouvez vérifier dans Safari (menu Développement, si
   activé) que le service worker est bien « activé ».

## Étape 6 — Installer sur l'écran d'accueil

1. Toujours dans Safari, touchez l'icône **Partager**.
2. **Sur l'écran d'accueil**.
3. Confirmez le nom (ex. « Photobooth ») et validez.
4. Fermez Safari et lancez l'application depuis sa nouvelle icône.

## Étape 7 — Basculer sur le Wi-Fi de la Canon SELPHY CP1500

À partir de maintenant, l'iPad peut être connecté au réseau Wi-Fi de
l'imprimante (sans Internet) : l'application, déjà installée et mise en
cache, continue de fonctionner intégralement hors ligne.

## Étape 8 — Domaine personnalisé (optionnel)

Si vous configurez un domaine personnalisé dans **Settings → Pages →
Custom domain**, aucune modification du code n'est nécessaire : tous les
chemins du projet sont relatifs et s'adaptent automatiquement à la racine
du domaine utilisé.

## Dépannage rapide

| Symptôme | Piste |
|---|---|
| Écran blanc au premier chargement | Vérifiez la console Safari (via un Mac connecté, menu Développement) pour une erreur 404 sur un fichier — chemin absolu oublié quelque part. |
| La caméra ne s'active jamais | Vérifiez que l'URL est bien en `https://`, et que l'autorisation caméra est accordée dans les réglages iPad. |
| L'app ne fonctionne plus hors ligne après une mise à jour du code | Le service worker met à jour le cache en tâche de fond ; fermez et rouvrez complètement l'app (pas juste un rafraîchissement) pour activer la nouvelle version. |
| Le bouton Imprimer n'affiche rien | Vérifiez que l'impression est activée dans le menu admin (onglet Impression). |
