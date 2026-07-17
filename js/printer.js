/*
 * printer.js — prépare la vue d'impression dédiée et déclenche window.print().
 *
 * Limite technique volontaire : une PWA ne peut pas sélectionner une
 * imprimante AirPrint ni lancer une impression silencieuse. window.print()
 * ouvre la feuille d'impression standard d'iPadOS ; c'est l'utilisateur qui
 * choisit la Canon SELPHY CP1500 et confirme. On ne cherche pas à contourner
 * cela : on se contente de ne laisser apparaître QUE le montage, au bon
 * format, grâce à css/print.css (media="print").
 */
(function (global) {
  "use strict";

  const printRoot = () => document.getElementById("print-root");
  const printImage = () => document.getElementById("print-image");

  /**
   * @param {string} dataUrl - montage final (dataURL)
   * @param {object} calibration - { zoom, offsetX, offsetY, fillMode, rotation }
   * @param {object} [callbacks] - { onBeforePrint, onAfterPrint }
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
        resolve();
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
