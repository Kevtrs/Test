/*
 * router.js — bascule entre les écrans de l'application (sans rechargement),
 * hooks d'entrée/sortie par écran, et minuteur d'inactivité configurable qui
 * ramène automatiquement l'invité à l'accueil si une session est abandonnée.
 */
(function (global) {
  "use strict";

  const screens = {};
  const hooks = { enter: {}, leave: {} };
  let currentName = null;
  let hideTimer = null;

  let inactivity = {
    seconds: 60,
    monitoredScreens: [],
    onTimeout: null,
    timer: null,
  };

  function collectScreens() {
    document.querySelectorAll("[data-screen]").forEach((el) => {
      screens[el.getAttribute("data-screen")] = el;
      if (!el.classList.contains("is-active")) el.hidden = true;
      else currentName = el.getAttribute("data-screen");
    });
  }

  function on(name, phase, fn) {
    hooks[phase][name] = hooks[phase][name] || [];
    hooks[phase][name].push(fn);
  }

  function runHooks(name, phase) {
    (hooks[phase][name] || []).forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error(`Erreur dans un hook ${phase} de l'écran "${name}"`, e);
      }
    });
  }

  function goTo(name) {
    if (!screens[name]) {
      console.error("Écran inconnu :", name);
      return;
    }
    if (name === currentName) {
      armInactivity();
      return;
    }
    const prevName = currentName;
    const prevEl = prevName ? screens[prevName] : null;
    const nextEl = screens[name];

    if (hideTimer) clearTimeout(hideTimer);

    nextEl.hidden = false;
    void nextEl.offsetWidth; // reflow pour permettre la transition CSS
    requestAnimationFrame(() => nextEl.classList.add("is-active"));

    if (prevEl) {
      prevEl.classList.remove("is-active");
      hideTimer = setTimeout(() => {
        prevEl.hidden = true;
      }, 360);
    }

    currentName = name;
    if (prevName) runHooks(prevName, "leave");
    runHooks(name, "enter");
    armInactivity();
  }

  function current() {
    return currentName;
  }

  function configureInactivity(seconds, monitoredScreens, onTimeout) {
    inactivity.seconds = seconds;
    inactivity.monitoredScreens = monitoredScreens;
    inactivity.onTimeout = onTimeout;
    armInactivity();
  }

  function armInactivity() {
    clearInactivity();
    if (inactivity.onTimeout && inactivity.monitoredScreens.includes(currentName)) {
      inactivity.timer = setTimeout(() => {
        if (inactivity.monitoredScreens.includes(currentName)) inactivity.onTimeout();
      }, inactivity.seconds * 1000);
    }
  }

  function clearInactivity() {
    if (inactivity.timer) {
      clearTimeout(inactivity.timer);
      inactivity.timer = null;
    }
  }

  function initActivityListeners() {
    ["pointerdown", "touchstart", "click"].forEach((evt) => {
      document.addEventListener(evt, () => armInactivity(), { passive: true });
    });
  }

  function init() {
    collectScreens();
    initActivityListeners();
  }

  global.PB = global.PB || {};
  global.PB.router = { init, on, goTo, current, configureInactivity, armInactivity };
})(window);
