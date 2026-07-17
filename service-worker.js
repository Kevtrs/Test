/*
 * service-worker.js — cache complet pour un fonctionnement 100% hors ligne
 * une fois l'application ouverte une première fois avec Internet.
 *
 * Stratégie : "cache d'abord" pour toutes les ressources précachées
 * (l'application doit rester utilisable sur le Wi-Fi direct de la Canon
 * SELPHY, sans Internet), avec mise à jour silencieuse en arrière-plan
 * quand le réseau est disponible.
 *
 * Tous les chemins sont RELATIFS au service worker lui-même : ils
 * fonctionnent aussi bien sur https://utilisateur.github.io/nom-du-depot/
 * que sur un domaine personnalisé, sans jamais dépendre d'un "/" absolu.
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = `photobooth-cache-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "index.html",
  "manifest.json",

  "css/style.css",
  "css/animations.css",
  "css/print.css",

  "js/storage.js",
  "js/settings.js",
  "js/camera.js",
  "js/capture.js",
  "js/composer.js",
  "js/printer.js",
  "js/gallery.js",
  "js/admin.js",
  "js/router.js",
  "js/pwa.js",
  "js/app.js",

  "assets/icons/favicon-16.png",
  "assets/icons/favicon-32.png",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/icon-16.png",
  "assets/icons/icon-32.png",
  "assets/icons/icon-48.png",
  "assets/icons/icon-72.png",
  "assets/icons/icon-96.png",
  "assets/icons/icon-120.png",
  "assets/icons/icon-152.png",
  "assets/icons/icon-167.png",
  "assets/icons/icon-180.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-256.png",
  "assets/icons/icon-384.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-192.png",
  "assets/icons/icon-maskable-512.png",

  "assets/sounds/shutter.wav",
  "assets/sounds/tick.wav",
  "assets/sounds/chime.wav",

  "assets/frames/frame-generic-landscape.png",
  "assets/frames/frame-generic-portrait.png",
  "assets/frames/frame-sarah18-landscape.png",
  "assets/frames/frame-sarah18-portrait.png",

  "assets/logos/logo-generic.png",
  "assets/logos/logo-sarah18.png",

  "assets/backgrounds/bg-generic.jpg",
  "assets/backgrounds/bg-sarah18.jpg",
  "assets/backgrounds/splash-generic.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS.map((u) => new URL(u, self.registration.scope).toString())))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // pas de proxy pour les ressources externes

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Rafraîchit le cache en arrière-plan si le réseau est disponible,
        // sans faire attendre l'utilisateur (borne hors ligne prioritaire).
        fetchAndUpdateCache(req);
        return cached;
      }
      return fetchAndUpdateCache(req).catch(() => {
        if (req.mode === "navigate") {
          return caches.match(new URL("index.html", self.registration.scope).toString());
        }
        return new Response("", { status: 504, statusText: "Hors ligne" });
      });
    })
  );
});

function fetchAndUpdateCache(req) {
  return fetch(req).then((response) => {
    if (response && response.status === 200) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
    }
    return response;
  });
}
