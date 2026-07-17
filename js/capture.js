/*
 * capture.js — compte à rebours, flash simulé, son de déclenchement et
 * capture d'une ou plusieurs photos depuis le flux vidéo.
 */
(function (global) {
  "use strict";

  const sounds = {
    tick: new Audio("assets/sounds/tick.wav"),
    shutter: new Audio("assets/sounds/shutter.wav"),
    chime: new Audio("assets/sounds/chime.wav"),
  };
  Object.values(sounds).forEach((a) => {
    a.preload = "auto";
    a.load();
  });

  function play(name, enabled) {
    if (!enabled) return;
    const base = sounds[name];
    if (!base) return;
    try {
      const node = base.cloneNode(true);
      node.play().catch(() => {});
    } catch (e) {
      /* lecture audio non critique */
    }
  }

  function sleep(ms, token) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        if (token && token.cancelled) reject({ cancelled: true });
        else resolve();
      }, ms);
      if (token) {
        token._timers = token._timers || [];
        token._timers.push(t);
      }
    });
  }

  function makeToken() {
    return { cancelled: false, _timers: [] };
  }

  function cancelToken(token) {
    token.cancelled = true;
    (token._timers || []).forEach((t) => clearTimeout(t));
  }

  /**
   * Capture une image nette depuis la vidéo (flux non-mirroré) et la
   * renvoie en dataURL JPEG haute qualité, en respectant le ratio réel
   * du flux (aucune déformation).
   */
  function grabFrame(video) {
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 960;
    const canvas = document.createElement("canvas");
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, vw, vh);
    return canvas.toDataURL("image/jpeg", 0.95);
  }

  /**
   * Lance une séance de prise de vue.
   * options: {
   *   video, count, countdownDuration, delayBetweenPhotos,
   *   soundEnabled, flashEnabled,
   *   els: { countdownOverlay, countdownNumber, flash, progress, progressText },
   *   onPhoto(index, dataURL, total)
   * }
   * Retourne { promise: Promise<string[]>, cancel: Function }
   */
  function run(options) {
    const token = makeToken();
    const { video, els } = options;
    const count = Math.max(1, options.count || 1);
    const countdownDuration = Math.max(1, options.countdownDuration || 3);
    const delayBetween = Math.max(0, options.delayBetweenPhotos != null ? options.delayBetweenPhotos : 2);
    const soundEnabled = !!options.soundEnabled;
    const flashEnabled = !!options.flashEnabled;

    async function doCountdown() {
      els.countdownOverlay.hidden = false;
      for (let n = countdownDuration; n >= 1; n--) {
        if (token.cancelled) throw { cancelled: true };
        els.countdownNumber.textContent = String(n);
        els.countdownNumber.classList.remove("is-pulsing");
        // force reflow pour rejouer l'animation
        void els.countdownNumber.offsetWidth;
        els.countdownNumber.classList.add("is-pulsing");
        play("tick", soundEnabled);
        await sleep(1000, token);
      }
      els.countdownOverlay.hidden = true;
    }

    async function doFlash() {
      if (!flashEnabled) return;
      els.flash.classList.remove("is-firing");
      void els.flash.offsetWidth;
      els.flash.classList.add("is-firing");
      await sleep(120, token).catch(() => {});
    }

    async function main() {
      const photos = [];
      for (let i = 0; i < count; i++) {
        if (els.progress) {
          els.progress.hidden = false;
          els.progressText.textContent = `Photo ${i + 1} sur ${count}`;
        }
        await doCountdown();
        play("shutter", soundEnabled);
        await doFlash();
        const dataUrl = grabFrame(video);
        photos.push(dataUrl);
        if (typeof options.onPhoto === "function") options.onPhoto(i, dataUrl, count);
        if (i < count - 1 && delayBetween > 0) {
          await sleep(delayBetween * 1000, token);
        }
      }
      if (els.progress) els.progress.hidden = true;
      return photos;
    }

    const promise = main().catch((err) => {
      els.countdownOverlay.hidden = true;
      if (els.progress) els.progress.hidden = true;
      throw err;
    });

    return {
      promise,
      cancel: () => cancelToken(token),
    };
  }

  global.PB = global.PB || {};
  global.PB.capture = { run, grabFrame, playSound: play };
})(window);
