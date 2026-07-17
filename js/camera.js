/*
 * camera.js — accès à la caméra avant via getUserMedia, gestion du flux
 * vidéo et des erreurs d'autorisation / de disponibilité.
 *
 * Important : l'effet miroir n'est appliqué qu'en CSS sur l'aperçu vidéo
 * (voir .camera-video { transform: scaleX(-1) }). Les données brutes du flux
 * ne sont jamais inversées, donc une capture via drawImage() sur la vidéo
 * produit une photo dans le bon sens, sans inversion involontaire.
 */
(function (global) {
  "use strict";

  let stream = null;
  let videoEl = null;

  function friendlyError(err) {
    const name = err && err.name;
    switch (name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "L'accès à la caméra a été refusé. Autorisez la caméra dans les réglages de Safari pour utiliser le photobooth.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "Aucune caméra n'a été trouvée sur cet appareil.";
      case "NotReadableError":
      case "TrackStartError":
        return "La caméra est déjà utilisée par une autre application.";
      case "OverconstrainedError":
        return "La caméra ne supporte pas les réglages demandés.";
      case "SecurityError":
        return "L'accès à la caméra nécessite une connexion sécurisée (HTTPS).";
      default:
        return "Impossible d'accéder à la caméra pour le moment.";
    }
  }

  function isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Démarre la caméra avant et l'attache à l'élément <video> fourni.
   * Retourne une Promise résolue avec le flux, ou rejetée avec
   * { message } lisible par l'utilisateur.
   */
  function start(video) {
    videoEl = video;

    if (!isSupported()) {
      return Promise.reject({ message: "Ce navigateur ne permet pas d'utiliser la caméra (getUserMedia indisponible)." });
    }

    const constraints = {
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1920 },
        height: { ideal: 1440 },
        aspectRatio: { ideal: 3 / 2 },
      },
    };

    return navigator.mediaDevices
      .getUserMedia(constraints)
      .catch(() =>
        // repli avec des contraintes plus souples si la première demande échoue
        navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user" } })
      )
      .then((s) => {
        stream = s;
        videoEl.srcObject = stream;
        return new Promise((resolve) => {
          if (videoEl.readyState >= 2) {
            resolve(stream);
          } else {
            videoEl.onloadedmetadata = () => resolve(stream);
          }
        });
      })
      .then((s) => videoEl.play().then(() => s))
      .catch((err) => {
        if (err && err.message && !err.name) throw err; // déjà formaté
        return Promise.reject({ message: friendlyError(err), original: err });
      });
  }

  function stop() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (videoEl) {
      videoEl.srcObject = null;
    }
  }

  function isActive() {
    return !!stream && stream.getVideoTracks().some((t) => t.readyState === "live");
  }

  global.PB = global.PB || {};
  global.PB.camera = { start, stop, isActive, isSupported };
})(window);
