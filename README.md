# 📸 Photobooth Événement — PWA pour iPad + Canon SELPHY CP1500

Borne photo en libre-service pour anniversaires, mariages et événements :
prise de vue avec la caméra avant de l'iPad, montage automatique au format
10 × 15 cm, puis impression via AirPrint sur une Canon SELPHY CP1500.

C'est une **web-app statique** (HTML/CSS/JS natif, sans framework, sans
build, sans backend) hébergée gratuitement sur **GitHub Pages**, installée
sur l'écran d'accueil de l'iPad comme **PWA**, et capable de fonctionner
**entièrement hors ligne** une fois ouverte une première fois avec Internet.

Aucune donnée n'est envoyée à un serveur : tout (réglages, photos, galerie)
reste stocké localement sur l'iPad, dans IndexedDB.

**Réglage par défaut : 4 photos différentes par tirage 10 × 15.** À chaque
session, l'invité prend 4 photos successives (compte à rebours avant
chacune), assemblées automatiquement en grille 2 × 2 sur une seule feuille
10 × 15 cm. C'est modifiable à tout moment dans **Admin → Photos**
(dispositions disponibles : une grande photo, deux côte à côte, quatre en
grille, ou trois en bande façon photomaton).

---

## Sommaire

1. [Lancer le projet en local](#1-lancer-le-projet-en-local)
2. [Publier sur GitHub Pages](#2-publier-sur-github-pages)
3. [Installer la PWA sur l'iPad](#3-installer-la-pwa-sur-lipad)
4. [Autoriser la caméra](#4-autoriser-la-caméra)
5. [Connecter l'iPad au Wi-Fi de la Canon SELPHY CP1500](#5-connecter-lipad-au-wi-fi-de-la-canon-selphy-cp1500)
6. [Utiliser AirPrint depuis l'application](#6-utiliser-airprint-depuis-lapplication)
7. [Pourquoi l'impression 100 % silencieuse est impossible](#7-pourquoi-limpression-100--silencieuse-est-impossible)
8. [Utiliser Accès guidé (mode borne)](#8-utiliser-accès-guidé-mode-borne)
9. [Remplacer le cadre, le logo et les fonds](#9-remplacer-le-cadre-le-logo-et-les-fonds)
10. [Menu administrateur](#10-menu-administrateur)
11. [Vider la galerie / réinitialiser](#11-vider-la-galerie--réinitialiser)
12. [Mettre à jour l'application](#12-mettre-à-jour-lapplication)
13. [Architecture du projet](#13-architecture-du-projet)
14. [Limites connues](#14-limites-connues)

---

## 1. Lancer le projet en local

Aucune dépendance, aucun `npm install`. Un simple serveur HTTP statique
suffit (la caméra et les service workers exigent `http://localhost` ou
`https://`, pas `file://`).

Avec Python (déjà installé sur Mac) :

```bash
cd photobooth
python3 -m http.server 8080
```

Puis ouvrez `http://localhost:8080` dans Safari ou Chrome.

Avec l'extension VS Code "Live Server", ou `npx serve`, cela fonctionne
également.

---

## 2. Publier sur GitHub Pages

1. Poussez ce dépôt sur GitHub (branche `main` par exemple).
2. Dans le dépôt GitHub : **Settings → Pages**.
3. Source : **Deploy from a branch**, branche `main`, dossier `/ (root)`.
4. Attendez quelques minutes : l'application est disponible à l'adresse
   `https://<utilisateur>.github.io/<nom-du-depot>/`.

**Aucune configuration de chemin n'est nécessaire.** Tous les fichiers
(CSS, JS, images, `manifest.json`, `service-worker.js`) utilisent des
chemins **relatifs** (jamais `/xxx` en absolu). L'application fonctionne
donc aussi bien :

- sur `https://utilisateur.github.io/nom-du-depot/` (sous-dossier GitHub
  Pages classique) ;
- que sur un domaine personnalisé configuré ensuite dans GitHub Pages.

Si vous déplacez le site vers un autre sous-dossier, aucune modification de
code n'est nécessaire.

---

## 3. Installer la PWA sur l'iPad

1. Ouvrez l'URL GitHub Pages dans **Safari** sur l'iPad (obligatoire : Chrome
   iOS ne permet pas l'installation en PWA plein écran).
2. Laissez la page se charger complètement une première fois (avec
   Internet) : c'est ce chargement qui met toute l'application en cache
   pour le mode hors ligne.
3. Touchez le bouton **Partager** (carré avec flèche vers le haut).
4. Choisissez **« Sur l'écran d'accueil »**.
5. Validez. Une icône « Photobooth » apparaît sur l'écran d'accueil.
6. Lancez l'application depuis cette icône (pas depuis Safari) : elle
   s'ouvre alors en plein écran, sans barre d'adresse, en mode `standalone`.

---

## 4. Autoriser la caméra

Au premier lancement, iPadOS/Safari demande l'autorisation d'utiliser la
caméra. Touchez **Autoriser**.

Si vous avez refusé par erreur, ou si l'écran affiche « L'accès à la caméra
a été refusé » :

- **Réglages iPad → Safari → Caméra → Autoriser** (pour un usage via
  Safari), ou
- Si l'app est installée en PWA : **Réglages iPad → [nom de l'app] →
  Caméra**, ou parfois via **Réglages → Confidentialité et sécurité →
  Caméra**.

Puis touchez **Réessayer** dans l'application.

---

## 5. Connecter l'iPad au Wi-Fi de la Canon SELPHY CP1500

1. Allumez la Canon SELPHY CP1500 et activez son mode Wi-Fi (voir le manuel
   Canon : bouton Wi-Fi / menu Réglages Wi-Fi de l'imprimante).
2. Sur l'iPad : **Réglages → Wi-Fi**, puis sélectionnez le réseau créé par
   l'imprimante (nommé généralement `Canon_ij_...` ou similaire selon le
   mode configuré).
3. Ce réseau n'a généralement pas accès à Internet : c'est prévu, l'application
   fonctionne hors ligne (voir section 3).

> Astuce borne : faites le premier lancement/installation de la PWA **avant**
> de basculer sur le Wi-Fi direct de l'imprimante, pendant que l'iPad a
> encore Internet.

---

## 6. Utiliser AirPrint depuis l'application

1. Sur l'écran d'aperçu final, touchez **Imprimer**.
2. L'application affiche **uniquement** le montage 10 × 15 (toute
   l'interface est masquée) et ouvre automatiquement la feuille
   d'impression standard d'iPadOS (`window.print()`).
3. Choisissez l'imprimante **Canon SELPHY CP1500** dans la liste AirPrint.
4. Ajustez le nombre de copies si besoin, puis touchez **Imprimer** pour
   confirmer.
5. Une fois la fenêtre d'impression refermée, l'application revient
   automatiquement à son interface normale puis à l'écran de remerciement.

---

## 7. Pourquoi l'impression 100 % silencieuse est impossible

C'est une **limite volontaire et incontournable d'iPadOS**, pas un manque
de finition de l'application :

- Une page web (PWA comprise) **ne peut pas** choisir automatiquement une
  imprimante AirPrint, ni lancer une impression sans que l'utilisateur ne
  confirme dans l'interface système. C'est une protection de sécurité
  d'Apple, identique pour tous les sites et toutes les PWA.
- Seule une application native (Swift/Xcode, avec l'API `UIPrintInteractionController`
  ou le SDK Canon) pourrait éventuellement automatiser davantage — ce que ce
  projet exclut explicitement (pas de Mac, pas d'Xcode, pas de Raspberry Pi,
  pas de serveur payant).

L'application fait donc le maximum possible côté web :

- elle prépare une page d'impression dédiée ne contenant **que** le montage,
  au bon ratio 10 × 15 ;
- elle masque tout le reste de l'interface via `css/print.css`
  (`@media print`) ;
- elle appelle `window.print()` pour ouvrir directement la feuille
  AirPrint, prête à imprimer en un seul geste supplémentaire de
  l'utilisateur (choisir l'imprimante + confirmer).

C'est le geste minimal possible dans les limites d'une web-app sur iPadOS —
**aucune page web, aucune PWA, sur aucun site, ne peut faire mieux** que ce
qui est décrit ici, quelle que soit la technologie utilisée en JavaScript.
Le seul moyen d'imprimer sans **aucune** confirmation serait une application
native iOS écrite en Swift avec Xcode, exclue dès le départ du cahier des
charges de ce projet.

### Réduire au minimum absolu le nombre de gestes (« impression automatique »)

Dans **Admin → Impression**, activez **« Lancer l'impression
automatiquement »** : dès que le montage est prêt, l'application ouvre
**toute seule** la feuille AirPrint (sans que l'invité ait à toucher le
bouton « Imprimer »). Il ne reste alors plus qu'**un seul geste
incompressible** : l'appui final sur le bouton **Imprimer** à l'intérieur
de la fenêtre système AirPrint — ce dernier tap ne peut être supprimé par
aucun site web, c'est une protection anti-abus d'Apple (sans elle, n'importe
quel site pourrait déclencher des impressions à l'insu de l'utilisateur).

Astuce : une fois la Canon SELPHY CP1500 sélectionnée manuellement une
première fois dans AirPrint, iPadOS la retient comme imprimante par défaut
pour les fois suivantes — la feuille AirPrint s'ouvre alors directement
avec la bonne imprimante et le bon format déjà présélectionnés.

---

## 8. Utiliser Accès guidé (mode borne)

Pour empêcher les invités de quitter l'application ou d'ouvrir d'autres
apps :

1. **Réglages iPad → Accessibilité → Accès guidé → Activer**, et définissez
   un code.
2. Ouvrez l'application Photobooth (depuis son icône sur l'écran d'accueil).
3. Triple-cliquez sur le bouton latéral (ou le bouton principal sur les
   iPad avec Face ID / Touch ID).
4. Touchez **Démarrer** en haut à droite.
5. Pour quitter : triple-clic à nouveau, saisissez le code.

L'application est conçue pour bien se comporter en Accès guidé :

- pas de sélection de texte, pas de menu contextuel (appui long) ;
- pas de zoom accidentel (pincement désactivé) ;
- pas de défilement intempestif de la page (`overscroll-behavior`,
  `touchmove` maîtrisés, sauf dans les zones prévues comme la galerie
  admin) ;
- grandes zones tactiles partout ;
- retour automatique à l'accueil en cas d'inactivité (configurable dans
  l'admin, 60 secondes par défaut).

---

## 9. Remplacer le cadre, le logo et les fonds

Deux méthodes :

### A. Depuis le menu administrateur (recommandé, sans toucher au code)

1. Ouvrez le menu admin (voir section 10).
2. Onglet **Apparence**.
3. **Image d'accueil**, **Logo**, **Cadre PNG** : touchez le champ
   correspondant, choisissez un fichier depuis **Photos** ou **Fichiers**
   sur l'iPad.
4. Le fichier est stocké dans IndexedDB et utilisé immédiatement — aucune
   modification du dépôt GitHub n'est nécessaire.

Pour le cadre, préparez un **PNG transparent** au même ratio que le
montage (3:2), soit par exemple 1800 × 1200 px (paysage) ou 1200 × 1800 px
(portrait), avec la zone centrale transparente pour laisser voir les
photos.

### B. En remplaçant les fichiers du dépôt (pour un thème par défaut différent)

Remplacez simplement les fichiers dans :

```
assets/frames/frame-generic-landscape.png
assets/frames/frame-generic-portrait.png
assets/logos/logo-generic.png
assets/backgrounds/bg-generic.jpg
```

(ou les équivalents `*-sarah18.*` pour le thème « Sarah – 18 ans »), en
conservant exactement les mêmes noms de fichiers, puis publiez à nouveau
sur GitHub Pages.

> Un script de génération des visuels de démonstration est fourni dans
> `dev/generate-assets.py` (Python + Pillow) si vous voulez régénérer ou
> vous inspirer des placeholders fournis.

---

## 10. Menu administrateur

Le menu admin est **caché** de l'interface invité :

1. Sur l'écran d'accueil, touchez **5 fois rapidement** le logo en haut à
   gauche (moins de ~2 secondes entre le 1er et le 5e appui).
2. Saisissez le code PIN. **Code de démonstration initial : `1818`.**
3. Changez ce code dès que possible dans l'onglet **Stockage** du menu
   admin.

Le menu admin permet de régler : nom/sous-titre/date de l'événement,
message personnalisé, thème et couleurs, image d'accueil/logo/cadre,
orientation et disposition du montage, nombre de photos, durée du compte à
rebours, délai entre les photos, son, flash, sauvegarde locale, retour
automatique, durée de l'écran de fin, minuteur d'inactivité, activation de
l'impression, nombre de copies suggéré, calibration d'impression, galerie,
stockage, code PIN, réinitialisation complète.

Touchez **« Fermer et revenir à l'accueil »** pour quitter le menu admin.

---

## 11. Vider la galerie / réinitialiser

Dans le menu admin :

- **Onglet Galerie → Supprimer toutes les photos** : supprime toutes les
  sessions enregistrées (photos + montages), garde les réglages.
- **Onglet Galerie → Exporter la galerie** : télécharge chaque montage
  final sur l'iPad (dans Fichiers, dossier Téléchargements).
- **Onglet Stockage → Réinitialisation complète de l'application** :
  supprime **tout** (réglages, cadres/logos importés, galerie) et recharge
  l'application avec les valeurs par défaut.

---

## 12. Mettre à jour l'application

1. Modifiez le code, testez en local, puis poussez sur la branche publiée
   sur GitHub Pages.
2. Le service worker détecte automatiquement la nouvelle version en
   arrière-plan et affiche un message discret indiquant qu'elle sera
   utilisée au **prochain démarrage** de l'application (fermez et rouvrez
   la PWA, ou double-appui sur le bouton d'accueil / balayage pour fermer
   l'app puis la rouvrir).
3. Si besoin de forcer une mise à jour immédiate pendant les tests :
   changez la constante `CACHE_VERSION` en haut de `service-worker.js`
   (ex. `v1` → `v2`), ce qui invalide l'ancien cache.

---

## 13. Architecture du projet

```
photobooth/
├── index.html                 Tous les écrans de l'application
├── manifest.json              Manifeste PWA (icônes, mode standalone…)
├── service-worker.js          Cache hors ligne
├── README.md
├── css/
│   ├── style.css              Styles principaux (écran)
│   ├── animations.css         Animations légères
│   └── print.css              Styles d'impression uniquement (media="print")
├── js/
│   ├── storage.js             Couche IndexedDB (réglages, sessions, assets)
│   ├── settings.js            Réglages par défaut, thèmes, résolution d'assets
│   ├── camera.js               getUserMedia, gestion des erreurs caméra
│   ├── capture.js             Compte à rebours, flash, son, capture multi-photos
│   ├── composer.js            Montage Canvas 10×15 (dispositions, cadre, texte)
│   ├── printer.js             Préparation + déclenchement de window.print()
│   ├── gallery.js             Galerie admin (miniatures, réimpression…)
│   ├── admin.js               Menu administrateur, PIN, import de fichiers
│   ├── router.js              Navigation entre écrans + minuteur d'inactivité
│   ├── pwa.js                 Enregistrement du service worker
│   └── app.js                 Orchestration générale, mode borne, erreurs
├── assets/
│   ├── icons/                 Icônes PWA (toutes tailles + maskable)
│   ├── sounds/                Déclic, tick, chime (WAV, générés localement)
│   ├── fonts/                 (vide par défaut : police système utilisée)
│   ├── frames/                Cadres PNG transparents (générique + Sarah 18)
│   ├── logos/                 Logos par défaut
│   └── backgrounds/           Fonds d'écran d'accueil
├── dev/
│   └── generate-assets.py     Script (Python/Pillow) ayant généré les visuels
│                               de démonstration ; ne fait pas partie de l'app
│                               livrée (non référencé, non mis en cache).
└── docs/
    └── github-pages-installation.md
```

Chaque module JS s'attache à un espace de noms global unique `window.PB`
(`PB.storage`, `PB.settings`, `PB.camera`, …), chargé via de simples
balises `<script defer>` — **aucun bundler, aucun build step**. C'est un
choix volontaire de simplicité et de robustesse pour un projet destiné à
rester facilement modifiable.

---

## 14. Limites connues

- **Impression automatique** : même activée, elle ne supprime que le tap
  sur le bouton « Imprimer » de l'application. L'appui final sur
  « Imprimer » dans la fenêtre système AirPrint reste obligatoire et ne
  peut être automatisé par aucune web-app (protection anti-abus d'Apple).
- **Nombre de copies** : le sélecteur « 1 / 2 exemplaires » sur l'écran
  d'aperçu est indicatif. Le nombre réel de copies imprimées se règle et se
  confirme dans la fenêtre AirPrint elle-même (limite d'iPadOS, voir
  section 7).
- **Confirmation de succès d'impression** : `window.print()` ne permet pas
  de savoir si l'utilisateur a réellement confirmé l'impression ou annulé
  la fenêtre AirPrint. La galerie marque une photo comme « imprimée » dès
  que la feuille d'impression a été fermée (événement `afterprint`), que
  l'impression ait été confirmée ou annulée.
- **`@page` en paysage** : le support de la règle CSS `@page { size: landscape }`
  varie selon les versions d'iPadOS. L'application ne s'appuie donc pas
  uniquement dessus : elle fixe aussi explicitement les dimensions en
  millimètres de la zone imprimée, ce qui reste fiable même si `@page`
  est partiellement ignoré.
- **Export de la galerie** : sans bibliothèque externe (contrainte « zéro
  dépendance/CDN »), l'export déclenche un téléchargement individuel par
  photo plutôt qu'une seule archive ZIP.
