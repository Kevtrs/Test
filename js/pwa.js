/*
 * pwa.js — enregistrement du service worker, détection du mode standalone,
 * et conseil d'installation sur l'écran d'accueil iPad.
 *
 * Chemins volontairement RELATIFS ("./service-worker.js") pour que
 * l'application fonctionne aussi bien sur https://utilisateur.github.io/nom-du-depot/
 * que sur un domaine personnalisé, sans dépendre d'un chemin absolu "/...".
 */
(function (global) {
  "use strict";

  function isStandalone() {
    return (
      global.matchMedia("(display-mode: standalone)").matches ||
      global.navigator.standalone === true
    );
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              if (global.PB.app && global.PB.app.toast) {
                global.PB.app.toast("Une nouvelle version est prête. Elle sera utilisée au prochain démarrage.", "success");
              }
            }
          });
        });
      })
      .catch((err) => {
        console.error("Échec de l'enregistrement du service worker :", err);
      });
  }

  function maybeShowInstallHint() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!isIOS || isStandalone()) return;
    if (localStorage.getItem("pb-install-hint-shown")) return;
    localStorage.setItem("pb-install-hint-shown", "1");
    setTimeout(() => {
      if (global.PB.app && global.PB.app.toast) {
        global.PB.app.toast(
          "Astuce : touchez Partager puis « Sur l'écran d'accueil » pour installer ce photobooth en plein écran.",
          "info"
        );
      }
    }, 2500);
  }

  function init() {
    registerServiceWorker();
    maybeShowInstallHint();
  }

  global.PB = global.PB || {};
  global.PB.pwa = { init, isStandalone };
})(window);
