/*
 * app.js — chef d'orchestre de l'application : démarrage, écran d'accueil,
 * parcours caméra → montage → aperçu → impression → fin, mode borne
 * (anti-gestes), minuteur d'inactivité et gestion des erreurs affichées à
 * l'utilisateur. Relie entre eux tous les autres modules (PB.*).
 */
(function (global) {
  "use strict";

  const state = {
    photos: [],
    composedImage: null,
    sessionId: null,
    copies: 1,
    captureHandle: null,
    endCountdownTimer: null,
  };

  // ------------------------------------------------------------- utilitaires
  function $(id) {
    return document.getElementById(id);
  }

  function toast(message, type) {
    const root = $("toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = "toast" + (type && type !== "info" ? ` toast-${type}` : "");
    el.textContent = message;
    root.appendChild(el);
    while (root.children.length > 3) root.removeChild(root.firstChild);
    setTimeout(() => {
      el.style.transition = "opacity .3s ease";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 320);
    }, type === "error" ? 6000 : 4200);
  }

  function dataUrlToBlob(dataUrl) {
    return fetch(dataUrl).then((r) => r.blob());
  }

  function showFatalError(message) {
    document.body.innerHTML = `
      <div style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
        background:#0a0e15;color:#f5f8fb;text-align:center;padding:32px;font-family:-apple-system,system-ui,sans-serif;">
        <div style="font-size:52px;margin-bottom:16px;">⚠️</div>
        <p style="font-size:20px;max-width:520px;line-height:1.5;">${message}</p>
      </div>`;
  }

  // ------------------------------------------------------------- accueil
  function renderHomeText(settings) {
    $("home-title").textContent = settings.eventName || "Votre Événement";
    $("home-subtitle").textContent = settings.eventSubtitle || "";
    const dateEl = $("home-date");
    if (settings.eventDate) {
      try {
        const d = new Date(settings.eventDate + "T00:00:00");
        dateEl.textContent = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
      } catch (e) {
        dateEl.textContent = "";
      }
    } else {
      dateEl.textContent = "";
    }
  }

  // ------------------------------------------------------------- caméra
  function resetCameraUi() {
    $("camera-error").hidden = true;
    $("countdown-overlay").hidden = true;
    $("camera-progress").hidden = true;
    $("btn-shoot").disabled = false;
  }

  function startCameraFlow() {
    resetCameraUi();
    const video = $("camera-video");
    global.PB.camera
      .start(video)
      .then(() => {
        $("camera-error").hidden = true;
      })
      .catch((err) => {
        $("camera-error").hidden = false;
        $("camera-error-text").textContent = err.message || "La caméra n'est pas accessible.";
      });
  }

  function stopCameraFlow() {
    if (state.captureHandle) {
      state.captureHandle.cancel();
      state.captureHandle = null;
    }
    global.PB.camera.stop();
  }

  function cancelSessionToHome(reason) {
    stopCameraFlow();
    state.photos = [];
    state.composedImage = null;
    state.sessionId = null;
    if (reason) toast(reason, "warn");
    global.PB.router.goTo("home");
  }

  function runCaptureSession() {
    const settings = global.PB.settings.get();
    $("btn-shoot").disabled = true;
    const els = {
      countdownOverlay: $("countdown-overlay"),
      countdownNumber: $("countdown-number"),
      flash: $("camera-flash"),
      progress: $("camera-progress"),
      progressText: $("camera-progress-text"),
    };

    state.captureHandle = global.PB.capture.run({
      video: $("camera-video"),
      count: settings.photoCount,
      countdownDuration: settings.countdownDuration,
      delayBetweenPhotos: settings.delayBetweenPhotos,
      soundEnabled: settings.soundEnabled,
      flashEnabled: settings.flashEnabled,
      els,
    });

    state.captureHandle.promise
      .then((photos) => {
        state.photos = photos;
        state.captureHandle = null;
        goToComposing();
      })
      .catch((err) => {
        state.captureHandle = null;
        if (err && err.cancelled) return; // annulation volontaire (retour/inactivité)
        toast("Une erreur est survenue pendant la prise de vue.", "error");
        $("btn-shoot").disabled = false;
      });
  }

  // ------------------------------------------------------------- composition
  function goToComposing() {
    global.PB.router.goTo("composing");
    const settings = global.PB.settings.get();
    const start = Date.now();
    const MIN_DELAY = 1300; // laisse l'animation "Création de votre photo…" se voir

    global.PB.composer
      .composeMontage(state.photos, settings)
      .then((finalDataUrl) => {
        const elapsed = Date.now() - start;
        const wait = Math.max(0, MIN_DELAY - elapsed);
        return new Promise((resolve) => setTimeout(() => resolve(finalDataUrl), wait));
      })
      .then((finalDataUrl) => {
        state.composedImage = finalDataUrl;
        return persistSessionIfNeeded(settings);
      })
      .then(() => {
        $("preview-image").src = state.composedImage;
        state.copies = settings.copiesSuggested || 1;
        document.querySelectorAll(".btn-copies").forEach((b) =>
          b.classList.toggle("is-active", Number(b.dataset.copies) === state.copies)
        );
        global.PB.router.goTo("preview");
        if (settings.printingEnabled && settings.autoPrint) {
          // Laisse la photo s'afficher un court instant avant d'ouvrir la
          // feuille AirPrint, pour que l'invité comprenne ce qui se passe.
          setTimeout(() => {
            if (global.PB.router.current() === "preview") doPrint();
          }, 900);
        }
      })
      .catch((err) => {
        console.error(err);
        toast(err && err.message ? err.message : "Erreur lors de la création du montage.", "error");
        global.PB.router.goTo("camera");
      });
  }

  function persistSessionIfNeeded(settings) {
    if (!settings.saveLocalPhotos) return Promise.resolve();
    return Promise.all(state.photos.map(dataUrlToBlob))
      .then((photoBlobs) => dataUrlToBlob(state.composedImage).then((finalBlob) => ({ photoBlobs, finalBlob })))
      .then(({ photoBlobs, finalBlob }) => {
        const session = {
          date: new Date().toISOString(),
          photos: photoBlobs,
          finalImage: finalBlob,
          layout: settings.layout,
          printed: false,
          printCount: 0,
        };
        return global.PB.storage.addSession(session).then((id) => {
          state.sessionId = id;
          return global.PB.storage.trimSessions(settings.maxSessions);
        });
      })
      .catch((err) => {
        console.error(err);
        toast("Stockage local presque plein : cette photo n'a pas pu être enregistrée dans la galerie.", "warn");
      });
  }

  // ------------------------------------------------------------- aperçu / impression
  function doPrint() {
    const settings = global.PB.settings.get();
    if (!settings.printingEnabled) {
      toast("L'impression est désactivée pour le moment.", "warn");
      return;
    }
    $("btn-print").disabled = true;
    global.PB.printer
      .printMontage(state.composedImage, settings.printCalibration, {
        onAfterPrint: () => {
          if (state.sessionId != null) {
            global.PB.storage.getSession(state.sessionId).then((s) => {
              if (!s) return;
              global.PB.storage.updateSession(state.sessionId, {
                printed: true,
                printCount: (s.printCount || 0) + 1,
              });
            });
          }
        },
      })
      .then(() => {
        $("btn-print").disabled = false;
        goToEnd();
      });
  }

  // ------------------------------------------------------------- fin
  function goToEnd() {
    global.PB.router.goTo("end");
  }

  function startEndCountdown() {
    const settings = global.PB.settings.get();
    let remaining = settings.autoReturnHome ? Math.max(2, settings.finalScreenDuration || 8) : null;
    $("end-countdown").textContent = remaining != null ? remaining : "—";
    clearEndCountdown();
    if (remaining == null) return;
    state.endCountdownTimer = setInterval(() => {
      remaining -= 1;
      $("end-countdown").textContent = remaining;
      if (remaining <= 0) {
        clearEndCountdown();
        returnHomeFromEnd();
      }
    }, 1000);
  }

  function clearEndCountdown() {
    if (state.endCountdownTimer) {
      clearInterval(state.endCountdownTimer);
      state.endCountdownTimer = null;
    }
  }

  function returnHomeFromEnd() {
    clearEndCountdown();
    state.photos = [];
    state.composedImage = null;
    state.sessionId = null;
    global.PB.router.goTo("home");
  }

  // ------------------------------------------------------------- mode borne
  function initKioskGuards() {
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("gesturestart", (e) => e.preventDefault());
    document.addEventListener("dragstart", (e) => e.preventDefault());

    let lastTouchEnd = 0;
    document.addEventListener(
      "touchend",
      (e) => {
        const now = Date.now();
        if (now - lastTouchEnd < 300) e.preventDefault();
        lastTouchEnd = now;
      },
      { passive: false }
    );

    document.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches.length > 1) {
          e.preventDefault();
          return;
        }
        const scrollable = e.target.closest(".admin-content, .gallery-grid");
        if (!scrollable) e.preventDefault();
      },
      { passive: false }
    );
  }

  // ------------------------------------------------------------- câblage UI
  function wireUi() {
    $("btn-start").addEventListener("click", () => {
      state.photos = [];
      state.composedImage = null;
      state.sessionId = null;
      global.PB.router.goTo("camera");
    });

    $("btn-shoot").addEventListener("click", runCaptureSession);
    $("btn-camera-back").addEventListener("click", () => cancelSessionToHome());
    $("btn-camera-retry").addEventListener("click", startCameraFlow);
    $("btn-camera-cancel").addEventListener("click", () => cancelSessionToHome());

    $("btn-sound-toggle").addEventListener("click", (e) => {
      const s = global.PB.settings.get();
      global.PB.settings.save({ soundEnabled: !s.soundEnabled }).then((ns) => {
        e.currentTarget.textContent = ns.soundEnabled ? "🔊" : "🔇";
      });
    });

    document.querySelectorAll(".btn-copies").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.copies = Number(btn.dataset.copies);
        document.querySelectorAll(".btn-copies").forEach((b) => b.classList.toggle("is-active", b === btn));
      });
    });

    $("btn-print").addEventListener("click", doPrint);
    $("btn-retake").addEventListener("click", () => {
      state.photos = [];
      state.composedImage = null;
      global.PB.router.goTo("camera");
    });
    $("btn-finish").addEventListener("click", goToEnd);
    $("btn-end-now").addEventListener("click", returnHomeFromEnd);
  }

  function wireRouterHooks() {
    const router = global.PB.router;
    router.on("camera", "enter", startCameraFlow);
    router.on("camera", "leave", stopCameraFlow);
    router.on("end", "enter", startEndCountdown);
    router.on("end", "leave", clearEndCountdown);
    router.on("home", "enter", () => {
      state.photos = [];
      state.composedImage = null;
      state.sessionId = null;
    });
  }

  function reconfigureInactivity(settings) {
    const s = settings || global.PB.settings.get();
    const screensToWatch = s.autoReturnHome ? ["camera", "composing", "preview"] : [];
    global.PB.router.configureInactivity(s.inactivityTimeout || 60, screensToWatch, () => {
      cancelSessionToHome("Session annulée après une période d'inactivité.");
    });
  }

  // ------------------------------------------------------------- démarrage
  function checkBrowserSupport() {
    if (!("indexedDB" in global)) return "Ce navigateur ne dispose pas d'IndexedDB : l'application ne peut pas fonctionner correctement. Utilisez Safari sur iPad ou un navigateur récent.";
    if (!document.createElement("canvas").getContext) return "Ce navigateur ne supporte pas Canvas : l'application ne peut pas créer de montages photo.";
    return null;
  }

  function boot() {
    const unsupported = checkBrowserSupport();
    if (unsupported) {
      showFatalError(unsupported);
      return;
    }

    global.PB.router.init();
    wireRouterHooks();
    wireUi();
    initKioskGuards();

    global.PB.storage
      .openDb()
      .catch((err) => {
        console.error(err);
        toast("Le stockage local n'a pas pu être initialisé. Les photos ne seront pas conservées.", "warn");
      })
      .then(() => global.PB.settings.load())
      .then((settings) => {
        global.PB.settings.applyThemeToDocument(settings);
        renderHomeText(settings);
        $("btn-sound-toggle").textContent = settings.soundEnabled ? "🔊" : "🔇";
        global.PB.admin.init();
        global.PB.pwa.init();
        reconfigureInactivity(settings);
      });

    global.addEventListener("pb:settings-changed", (e) => {
      renderHomeText(e.detail);
      reconfigureInactivity(e.detail);
    });

    global.addEventListener("offline", () => toast("Connexion Internet perdue : l'application continue de fonctionner hors ligne.", "info"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  global.PB = global.PB || {};
  global.PB.app = { toast };
})(window);
