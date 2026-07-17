/*
 * settings.js — réglages de l'application : valeurs par défaut, chargement /
 * sauvegarde (IndexedDB), application du thème visuel, résolution des
 * ressources (fichiers du dépôt ou fichiers importés stockés en IndexedDB).
 */
(function (global) {
  "use strict";

  const DEFAULT_SETTINGS = {
    eventName: "Votre Événement",
    eventSubtitle: "Photobooth libre-service",
    eventDate: "",
    customMessage: "",

    theme: "generic", // "generic" | "sarah18"
    primaryColor: "#0a84b8",
    secondaryColor: "#ffb703",

    homeImageSrc: "assets/backgrounds/bg-generic.jpg",
    logoSrc: "assets/logos/logo-generic.png",
    frameSrc: "assets/frames/frame-generic-landscape.png",
    frameSrcPortrait: "assets/frames/frame-generic-portrait.png",

    orientation: "landscape", // "landscape" | "portrait"
    layout: "single", // "single" | "duo" | "grid4" | "strip3"
    photoCount: 1,
    countdownDuration: 3,
    delayBetweenPhotos: 2,

    soundEnabled: true,
    flashEnabled: true,

    copiesSuggested: 1,
    finalScreenDuration: 8,
    printingEnabled: true,
    saveLocalPhotos: true,
    autoReturnHome: true,
    inactivityTimeout: 60,

    maxSessions: 100,
    adminPin: "1818",

    printCalibration: {
      zoom: 100,
      offsetX: 0,
      offsetY: 0,
      fillMode: "fill", // "fill" | "contain"
      rotation: "landscape", // "landscape" | "portrait"
    },
  };

  const THEME_PRESETS = {
    generic: {
      primaryColor: "#0a84b8",
      secondaryColor: "#ffb703",
      homeImageSrc: "assets/backgrounds/bg-generic.jpg",
      logoSrc: "assets/logos/logo-generic.png",
      frameSrc: "assets/frames/frame-generic-landscape.png",
      frameSrcPortrait: "assets/frames/frame-generic-portrait.png",
    },
    sarah18: {
      eventName: "Sarah fête ses 18 ans",
      eventSubtitle: "Photobooth de la soirée",
      primaryColor: "#e91e63",
      secondaryColor: "#c62828",
      homeImageSrc: "assets/backgrounds/bg-sarah18.jpg",
      logoSrc: "assets/logos/logo-sarah18.png",
      frameSrc: "assets/frames/frame-sarah18-landscape.png",
      frameSrcPortrait: "assets/frames/frame-sarah18-portrait.png",
    },
  };

  let current = null;
  const objectUrlCache = new Map(); // "idb:<id>" -> object URL

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function mergeWithDefaults(partial) {
    const merged = clone(DEFAULT_SETTINGS);
    if (partial) {
      Object.keys(partial).forEach((k) => {
        if (k === "printCalibration" && partial[k]) {
          merged.printCalibration = Object.assign({}, merged.printCalibration, partial[k]);
        } else if (k !== "id") {
          merged[k] = partial[k];
        }
      });
    }
    return merged;
  }

  function load() {
    return global.PB.storage
      .getSettings()
      .then((stored) => {
        current = mergeWithDefaults(stored);
        return current;
      })
      .catch(() => {
        current = clone(DEFAULT_SETTINGS);
        return current;
      });
  }

  function get() {
    return current || clone(DEFAULT_SETTINGS);
  }

  function save(patch) {
    current = mergeWithDefaults(Object.assign({}, current, patch));
    return global.PB.storage.saveSettings(current).then(() => {
      global.dispatchEvent(new CustomEvent("pb:settings-changed", { detail: current }));
      return current;
    });
  }

  function applyThemePreset(themeName) {
    const preset = THEME_PRESETS[themeName];
    if (!preset) return Promise.resolve(get());
    return save(Object.assign({ theme: themeName }, preset));
  }

  /**
   * Résout une "source" de réglage (fond, logo, cadre) vers une URL utilisable
   * par <img>/Canvas : soit un chemin relatif du dépôt, soit une image
   * importée par l'admin et stockée en IndexedDB sous la forme "idb:<id>".
   */
  function resolveAssetSrc(value) {
    if (!value) return Promise.resolve("");
    if (typeof value !== "string" || !value.startsWith("idb:")) {
      return Promise.resolve(value);
    }
    if (objectUrlCache.has(value)) {
      return Promise.resolve(objectUrlCache.get(value));
    }
    const id = parseInt(value.slice(4), 10);
    return global.PB.storage.getAsset(id).then((asset) => {
      if (!asset || !asset.blob) return "";
      const url = URL.createObjectURL(asset.blob);
      objectUrlCache.set(value, url);
      return url;
    });
  }

  /** Applique les couleurs / le thème courant aux variables CSS globales. */
  function applyThemeToDocument(settings) {
    const s = settings || get();
    const root = document.documentElement;
    root.style.setProperty("--color-primary", s.primaryColor);
    root.style.setProperty("--color-primary-dark", shade(s.primaryColor, -0.35));
    root.style.setProperty("--color-secondary", s.secondaryColor);
    document.body.setAttribute("data-theme", s.theme);

    resolveAssetSrc(s.homeImageSrc).then((url) => {
      const bg = document.getElementById("home-bg");
      if (bg && url) bg.style.setProperty("--home-bg-image", `url("${url}")`);
      if (bg && url) bg.style.backgroundImage = `url("${url}")`;
    });
    resolveAssetSrc(s.logoSrc).then((url) => {
      const logo = document.getElementById("home-logo");
      if (logo && url) logo.src = url;
    });
  }

  function shade(hex, amt) {
    try {
      const c = hex.replace("#", "");
      const num = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
      let r = (num >> 16) & 255;
      let g = (num >> 8) & 255;
      let b = num & 255;
      r = Math.round(Math.min(255, Math.max(0, r + r * amt)));
      g = Math.round(Math.min(255, Math.max(0, g + g * amt)));
      b = Math.round(Math.min(255, Math.max(0, b + b * amt)));
      return `rgb(${r}, ${g}, ${b})`;
    } catch (e) {
      return hex;
    }
  }

  global.PB = global.PB || {};
  global.PB.settings = {
    DEFAULT_SETTINGS,
    THEME_PRESETS,
    load,
    get,
    save,
    applyThemePreset,
    applyThemeToDocument,
    resolveAssetSrc,
  };
})(window);
