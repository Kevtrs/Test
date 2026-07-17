# Polices

Par défaut, le photobooth utilise la police système d'iPadOS (San Francisco,
via la pile CSS `-apple-system, system-ui, ...`). C'est un choix volontaire :

- elle est déjà présente sur l'iPad, donc **aucun fichier à télécharger ni à
  mettre en cache** pour le mode hors ligne ;
- son rendu est net et parfaitement lisible à distance, sans risque de
  licence.

Si vous souhaitez une police personnalisée pour un événement (ex. thème
« Sarah – 18 ans ») :

1. Déposez le fichier `.woff2` dans ce dossier (ex. `ma-police.woff2`).
2. Ajoutez une règle `@font-face` en haut de `css/style.css` :

   ```css
   @font-face {
     font-family: "MaPolice";
     src: url("../assets/fonts/ma-police.woff2") format("woff2");
     font-display: swap;
   }
   :root { --font: "MaPolice", -apple-system, system-ui, sans-serif; }
   ```

3. Ajoutez le chemin du fichier dans `PRECACHE_URLS` de `service-worker.js`
   pour qu'il reste disponible hors ligne.

Vérifiez que la police est libre de droits pour un usage commercial si
l'événement est payant.
