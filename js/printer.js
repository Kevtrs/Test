/*
 * printer.js — ouvre directement le sélecteur d'imprimante d'iPadOS pour
 * imprimer le montage final.
 *
 * Limite technique volontaire (non contournable) : une PWA ne peut jamais
 * sélectionner une imprimante AirPrint ni lancer une impression sans
 * confirmation de l'utilisateur. On ne cherche pas à contourner cela.
 *
 * window.print() est la méthode qui va droit au but pour des enfants en
 * borne libre-service : dès que la photo est prête, la feuille système
 * "Options" (Imprimante / Copies / …) s'ouvre directement, sans étape
 * intermédiaire à comprendre. css/print.css masque toute l'interface et
 * force le montage à remplir 100% de la page imprimée, quel que soit le
 * gabarit réellement utilisé par iPadOS (le CSS @page personnalisé n'est
 * pas toujours respecté).
 */
(function (global) {
  "use strict";

  const printRoot = () => document.getElementById("print-root");
  const printImage = () => document.getElementById("print-image");

  /**
   * @param {string} dataUrl - montage final (dataURL ou URL d'objet)
   * @param {object} calibration - { zoom, offsetX, offsetY, fillMode, rotation }
   * @param {object} [callbacks] - { onBeforePrint, onAfterPrint }
   * @returns {Promise<"printed">}
   */
  function printMontage(dataUrl, calibration, callbacks) {
    const root = printRoot();
    const img = printImage();
    if (!root || !img) return Promise.reject(new Error("Zone d'impression introuvable."));

    const cal = Object.assign({ zoom: 100, offsetX: 0, offsetY: 0, fillMode: "fill", rotation: "landscape" }, calibration);

    img.src = dataUrl;
    root.classList.toggle("is-landscape", cal.rotation === "landscape");
    root.classList.toggle("mode-contain", cal.fillMode === "contain");
    img.style.transform = `scale(${cal.zoom / 100}) translate(${cal.offsetX}px, ${cal.offsetY}px)`;

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        global.removeEventListener("afterprint", finish);
        if (callbacks && typeof callbacks.onAfterPrint === "function") callbacks.onAfterPrint();
        resolve("printed");
      };

      global.addEventListener("afterprint", finish);
      if (callbacks && typeof callbacks.onBeforePrint === "function") callbacks.onBeforePrint();

      // Laisse le temps au navigateur de peindre l'image avant d'ouvrir la
      // feuille d'impression (évite un aperçu vide sur certaines versions iPadOS).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            global.print();
          } catch (e) {
            finish();
          }
          // Filet de sécurité : si "afterprint" n'est pas déclenché
          // (comportement observé occasionnellement sur iPadOS), on
          // considère l'impression terminée après un délai raisonnable.
          setTimeout(finish, 15000);
        });
      });
    });
  }

  global.PB = global.PB || {};
  global.PB.printer = { printMontage };
})(window);
