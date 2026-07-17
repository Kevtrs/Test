/*
 * printer.js — déclenche l'impression du montage final.
 *
 * Limite technique volontaire (non contournable) : une PWA ne peut jamais
 * sélectionner une imprimante AirPrint ni lancer une impression sans
 * confirmation de l'utilisateur. On ne cherche pas à contourner cela.
 *
 * MÉTHODE PRINCIPALE — Web Share API (navigator.share avec un vrai fichier
 * image) : on partage le montage comme une PHOTO, exactement comme le fait
 * l'app Photos de l'iPad (qui, elle, imprime déjà très bien sur la Canon
 * SELPHY). L'utilisateur touche « Imprimer » dans le menu de partage
 * natif. Comme iOS traite alors un vrai fichier image (et non « une page
 * web »), on évite deux problèmes propres à l'impression d'une page web
 * depuis Safari sur iPadOS :
 *   - l'ajout automatique par le système d'un en-tête/pied de page
 *     (URL + date + numéro de page), impossible à supprimer en CSS ;
 *   - une mise en page sur un grand gabarit (Lettre/A4) qui laisse la
 *     photo minuscule entourée de vide au lieu de remplir le papier 10x15.
 *
 * MÉTHODE DE SECOURS — window.print() + css/print.css : utilisée
 * automatiquement si l'API Web Share (fichiers) n'est pas disponible
 * (anciennes versions d'iPadOS, ou tests sur ordinateur).
 */
(function (global) {
  "use strict";

  const printRoot = () => document.getElementById("print-root");
  const printImage = () => document.getElementById("print-image");

  function dataUrlToFile(dataUrl, filename) {
    return fetch(dataUrl)
      .then((r) => r.blob())
      .then((blob) => new File([blob], filename, { type: blob.type || "image/jpeg" }));
  }

  /**
   * Tente le partage natif (Imprimer / Enregistrer l'image / …), puis se
   * replie sur window.print() si indisponible.
   * @returns {Promise<"shared"|"printed"|"cancelled">}
   */
  function shareOrPrintMontage(dataUrl, calibration, callbacks) {
    const cb = callbacks || {};
    return dataUrlToFile(dataUrl, `photobooth-${Date.now()}.jpg`)
      .then((file) => {
        if (global.navigator.canShare && global.navigator.canShare({ files: [file] })) {
          if (typeof cb.onBeforePrint === "function") cb.onBeforePrint();
          return global.navigator
            .share({ files: [file] })
            .then(() => {
              if (typeof cb.onAfterPrint === "function") cb.onAfterPrint();
              return "shared";
            })
            .catch((err) => {
              if (err && err.name === "AbortError") return "cancelled"; // menu de partage fermé sans rien choisir
              return printMontage(dataUrl, calibration, cb);
            });
        }
        return printMontage(dataUrl, calibration, cb);
      })
      .catch(() => printMontage(dataUrl, calibration, cb));
  }

  /**
   * Méthode de secours : window.print() avec une vue dédiée (css/print.css
   * masque toute l'interface et n'affiche que le montage).
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
  global.PB.printer = { shareOrPrintMontage, printMontage };
})(window);
