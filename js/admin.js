/*
 * admin.js — accès caché au menu administrateur (5 appuis sur le logo +
 * code PIN), formulaire de réglages, import d'assets, calibration
 * d'impression, galerie et gestion du stockage.
 */
(function (global) {
  "use strict";

  const TAP_COUNT_REQUIRED = 5;
  const TAP_WINDOW_MS = 2200;
  let tapTimestamps = [];
  let pinBuffer = "";

  function $(id) {
    return document.getElementById(id);
  }

  function toast(message, type) {
    if (global.PB.app && global.PB.app.toast) global.PB.app.toast(message, type);
  }

  // --------------------------------------------------------- geste caché
  function initHiddenGesture() {
    const hotspot = $("admin-hotspot");
    if (!hotspot) return;
    hotspot.addEventListener("click", () => {
      const now = Date.now();
      tapTimestamps.push(now);
      tapTimestamps = tapTimestamps.filter((t) => now - t < TAP_WINDOW_MS);
      if (tapTimestamps.length >= TAP_COUNT_REQUIRED) {
        tapTimestamps = [];
        openPinModal();
      }
    });
  }

  // --------------------------------------------------------- modale PIN
  function renderPinDots() {
    const settings = global.PB.settings.get();
    const len = Math.max(4, (settings.adminPin || "1818").length);
    const wrap = $("pin-dots");
    wrap.innerHTML = "";
    for (let i = 0; i < len; i++) {
      const dot = document.createElement("span");
      dot.className = "pin-dot";
      wrap.appendChild(dot);
    }
  }

  function updatePinDots() {
    const dots = document.querySelectorAll("#pin-dots .pin-dot");
    dots.forEach((dot, i) => dot.classList.toggle("is-filled", i < pinBuffer.length));
  }

  function openPinModal() {
    pinBuffer = "";
    renderPinDots();
    updatePinDots();
    $("pin-error").hidden = true;
    $("modal-pin").hidden = false;
  }

  function closePinModal() {
    $("modal-pin").hidden = true;
    pinBuffer = "";
  }

  function initPinPad() {
    document.querySelectorAll(".pin-key").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-key");
        if (key === "cancel") {
          closePinModal();
          return;
        }
        if (key === "back") {
          pinBuffer = pinBuffer.slice(0, -1);
          updatePinDots();
          return;
        }
        const settings = global.PB.settings.get();
        const expected = settings.adminPin || "1818";
        if (pinBuffer.length >= expected.length) return;
        pinBuffer += key;
        updatePinDots();
        if (pinBuffer.length === expected.length) {
          if (pinBuffer === expected) {
            closePinModal();
            openAdminPanel();
          } else {
            $("pin-error").hidden = false;
            setTimeout(() => {
              pinBuffer = "";
              updatePinDots();
            }, 500);
          }
        }
      });
    });
  }

  // --------------------------------------------------------- panneau admin
  function initTabs() {
    document.querySelectorAll(".admin-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".admin-tab").forEach((t) => t.classList.toggle("is-active", t === tab));
        const key = tab.getAttribute("data-tab");
        document.querySelectorAll(".admin-panel").forEach((p) => p.classList.toggle("is-active", p.getAttribute("data-panel") === key));
        if (key === "galerie") refreshGallery();
        if (key === "stockage") refreshStorageUsage();
      });
    });
  }

  function fillForm() {
    const s = global.PB.settings.get();
    $("set-eventName").value = s.eventName || "";
    $("set-eventSubtitle").value = s.eventSubtitle || "";
    $("set-eventDate").value = s.eventDate || "";
    $("set-customMessage").value = s.customMessage || "";
    $("set-soundEnabled").checked = !!s.soundEnabled;
    $("set-flashEnabled").checked = !!s.flashEnabled;
    $("set-saveLocalPhotos").checked = !!s.saveLocalPhotos;
    $("set-autoReturnHome").checked = !!s.autoReturnHome;
    $("set-finalScreenDuration").value = s.finalScreenDuration;
    $("set-inactivityTimeout").value = s.inactivityTimeout;

    $("set-theme").value = s.theme;
    $("set-primaryColor").value = s.primaryColor;
    $("set-secondaryColor").value = s.secondaryColor;
    $("set-orientation").value = s.orientation;

    $("set-layout").value = s.layout;
    $("set-photoCount").value = s.photoCount;
    $("set-countdownDuration").value = s.countdownDuration;
    $("set-delayBetweenPhotos").value = s.delayBetweenPhotos;

    $("set-printingEnabled").checked = !!s.printingEnabled;
    $("set-copiesSuggested").value = s.copiesSuggested;

    $("cal-zoom").value = s.printCalibration.zoom;
    $("cal-offsetX").value = s.printCalibration.offsetX;
    $("cal-offsetY").value = s.printCalibration.offsetY;
    $("cal-fillMode").value = s.printCalibration.fillMode;
    $("cal-rotation").value = s.printCalibration.rotation;

    $("set-maxSessions").value = s.maxSessions;
    $("set-adminPin").value = s.adminPin;

    refreshAssetPreviews(s);
  }

  function refreshAssetPreviews(s) {
    global.PB.settings.resolveAssetSrc(s.homeImageSrc).then((u) => ($("prev-homeImage").src = u || ""));
    global.PB.settings.resolveAssetSrc(s.logoSrc).then((u) => ($("prev-logo").src = u || ""));
    const frameSrc = s.orientation === "portrait" ? s.frameSrcPortrait : s.frameSrc;
    global.PB.settings.resolveAssetSrc(frameSrc).then((u) => ($("prev-frame").src = u || ""));
  }

  function bindSimpleField(id, key, kind) {
    const el = $(id);
    if (!el) return;
    const evt = el.type === "range" || el.tagName === "SELECT" ? "input" : "change";
    el.addEventListener(evt, () => {
      let value;
      if (kind === "checkbox") value = el.checked;
      else if (kind === "number") value = Number(el.value);
      else value = el.value;
      global.PB.settings.save({ [key]: value }).then((s) => {
        global.PB.settings.applyThemeToDocument(s);
        if (key === "orientation") refreshAssetPreviews(s);
      });
    });
  }

  function bindCalibrationField(id, key, kind, labelSuffix) {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", () => {
      const s = global.PB.settings.get();
      const value = kind === "number" ? Number(el.value) : el.value;
      const printCalibration = Object.assign({}, s.printCalibration, { [key]: value });
      global.PB.settings.save({ printCalibration });
    });
  }

  function bindFileImport(id, assetType, onSaved) {
    const el = $(id);
    if (!el) return;
    el.addEventListener("change", () => {
      const file = el.files && el.files[0];
      if (!file) return;
      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        global.PB.storage
          .addAsset({ type: assetType, name: file.name, blob: file })
          .then((id2) => onSaved("idb:" + id2))
          .catch(() => toast("Impossible d'enregistrer ce fichier.", "error"));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        toast("Fichier image invalide.", "error");
      };
      img.src = objUrl;
    });
  }

  function initLayoutSync() {
    $("set-layout").addEventListener("change", (e) => {
      const needed = global.PB.composer.photosNeeded(e.target.value);
      $("set-photoCount").value = needed;
      global.PB.settings.save({ layout: e.target.value, photoCount: needed });
    });
  }

  function initThemeSelect() {
    $("set-theme").addEventListener("change", (e) => {
      global.PB.settings.applyThemePreset(e.target.value).then((s) => {
        fillForm();
        global.PB.settings.applyThemeToDocument(s);
      });
    });
  }

  function initFileImports() {
    bindFileImport("set-homeImage", "home", (ref) =>
      global.PB.settings.save({ homeImageSrc: ref }).then((s) => {
        global.PB.settings.applyThemeToDocument(s);
        refreshAssetPreviews(s);
        toast("Image d'accueil mise à jour.", "success");
      })
    );
    bindFileImport("set-logo", "logo", (ref) =>
      global.PB.settings.save({ logoSrc: ref }).then((s) => {
        global.PB.settings.applyThemeToDocument(s);
        refreshAssetPreviews(s);
        toast("Logo mis à jour.", "success");
      })
    );
    bindFileImport("set-frame", "frame", (ref) =>
      global.PB.settings
        .save({ frameSrc: ref, frameSrcPortrait: ref })
        .then((s) => {
          refreshAssetPreviews(s);
          toast("Cadre mis à jour.", "success");
        })
    );
  }

  function labelValueSuffix(id, formatter) {
    const el = $(id);
    if (!el) return;
    const label = el.closest(".field").querySelector("span");
    const base = label.textContent;
    const update = () => {
      label.textContent = `${base} : ${formatter(el.value)}`;
    };
    el.addEventListener("input", update);
    update();
  }

  function initCalibration() {
    bindCalibrationField("cal-zoom", "zoom", "number");
    bindCalibrationField("cal-offsetX", "offsetX", "number");
    bindCalibrationField("cal-offsetY", "offsetY", "number");
    bindCalibrationField("cal-fillMode", "fillMode", "string");
    bindCalibrationField("cal-rotation", "rotation", "string");

    labelValueSuffix("cal-zoom", (v) => `${v}%`);
    labelValueSuffix("cal-offsetX", (v) => `${v}px`);
    labelValueSuffix("cal-offsetY", (v) => `${v}px`);

    $("btn-cal-test").addEventListener("click", () => {
      const s = global.PB.settings.get();
      const testImg = buildCalibrationTestPattern(s.printCalibration.rotation);
      global.PB.printer.printMontage(testImg, s.printCalibration);
    });

    $("btn-cal-reset").addEventListener("click", () => {
      global.PB.settings.save({ printCalibration: { zoom: 100, offsetX: 0, offsetY: 0, fillMode: "fill", rotation: "landscape" } }).then(fillForm);
    });
  }

  function buildCalibrationTestPattern(rotation) {
    const w = rotation === "portrait" ? 1200 : 1800;
    const h = rotation === "portrait" ? 1800 : 1200;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#0a84b8";
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.strokeStyle = "#ffb703";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#161616";
    ctx.font = "bold 42px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Mire de calibration 10 × 15 cm", w / 2, h / 2 - 40);
    ctx.font = "28px -apple-system, system-ui, sans-serif";
    ctx.fillText(`${w} × ${h} px`, w / 2, h / 2 + 10);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  // --------------------------------------------------------- galerie admin
  function refreshGallery() {
    global.PB.gallery.render(
      (session) => {
        const s = global.PB.settings.get();
        const url = URL.createObjectURL(session.finalImage);
        global.PB.printer.printMontage(url, s.printCalibration, {
          onAfterPrint: () => {
            URL.revokeObjectURL(url);
            global.PB.storage.updateSession(session.id, {
              printed: true,
              printCount: (session.printCount || 0) + 1,
            }).then(() => refreshGallery());
          },
        });
      },
      () => refreshStorageUsage()
    );
  }

  function initGalleryToolbar() {
    $("btn-gallery-export").addEventListener("click", () => {
      global.PB.gallery.exportAll().then((n) => toast(n > 0 ? `Export de ${n} photo(s) lancé.` : "Galerie vide.", "success"));
    });
    $("btn-gallery-clear").addEventListener("click", () => {
      if (!confirm("Supprimer définitivement toutes les photos de la galerie ?")) return;
      global.PB.storage.clearSessions().then(() => {
        refreshGallery();
        refreshStorageUsage();
        toast("Galerie vidée.", "success");
      });
    });
  }

  // --------------------------------------------------------- stockage
  function refreshStorageUsage() {
    Promise.all([global.PB.storage.estimateUsage(), global.PB.storage.countSessions()]).then(([usage, count]) => {
      const box = $("storage-usage");
      const pct = usage.quota ? Math.min(100, Math.round((usage.usage / usage.quota) * 100)) : 0;
      const mb = (n) => (n / (1024 * 1024)).toFixed(1);
      box.innerHTML = `
        <div>${count} session(s) enregistrée(s) — ${mb(usage.usage)} Mo utilisés${usage.quota ? " / " + mb(usage.quota) + " Mo disponibles" : ""}</div>
        <div class="storage-bar"><div class="storage-bar-fill${pct > 90 ? " is-danger" : pct > 70 ? " is-warn" : ""}" style="width:${pct}%"></div></div>
      `;
      if (pct > 85) toast("Le stockage local devient important. Pensez à vider la galerie.", "warn");
    });
  }

  function initDangerZone() {
    $("btn-reset-all").addEventListener("click", () => {
      if (!confirm("Réinitialiser complètement l'application (réglages + galerie) ? Cette action est irréversible.")) return;
      global.PB.storage.resetAll().then(() => {
        location.reload();
      });
    });
  }

  // --------------------------------------------------------- ouverture/fermeture
  function openAdminPanel() {
    fillForm();
    refreshGallery();
    refreshStorageUsage();
    global.PB.router.goTo("admin");
  }

  function closeAdminPanel() {
    global.PB.router.goTo("home");
  }

  function init() {
    initHiddenGesture();
    initPinPad();
    initTabs();
    initThemeSelect();
    initLayoutSync();
    initFileImports();
    initCalibration();
    initGalleryToolbar();
    initDangerZone();

    [
      ["set-eventName", "eventName", "text"],
      ["set-eventSubtitle", "eventSubtitle", "text"],
      ["set-eventDate", "eventDate", "text"],
      ["set-customMessage", "customMessage", "text"],
      ["set-soundEnabled", "soundEnabled", "checkbox"],
      ["set-flashEnabled", "flashEnabled", "checkbox"],
      ["set-saveLocalPhotos", "saveLocalPhotos", "checkbox"],
      ["set-autoReturnHome", "autoReturnHome", "checkbox"],
      ["set-finalScreenDuration", "finalScreenDuration", "number"],
      ["set-inactivityTimeout", "inactivityTimeout", "number"],
      ["set-primaryColor", "primaryColor", "text"],
      ["set-secondaryColor", "secondaryColor", "text"],
      ["set-orientation", "orientation", "text"],
      ["set-photoCount", "photoCount", "number"],
      ["set-countdownDuration", "countdownDuration", "number"],
      ["set-delayBetweenPhotos", "delayBetweenPhotos", "number"],
      ["set-printingEnabled", "printingEnabled", "checkbox"],
      ["set-copiesSuggested", "copiesSuggested", "number"],
      ["set-maxSessions", "maxSessions", "number"],
    ].forEach(([id, key, kind]) => bindSimpleField(id, key, kind));

    $("set-adminPin").addEventListener("change", (e) => {
      const v = e.target.value.replace(/\D/g, "");
      if (v.length < 4) {
        toast("Le code PIN doit contenir au moins 4 chiffres.", "error");
        e.target.value = global.PB.settings.get().adminPin;
        return;
      }
      global.PB.settings.save({ adminPin: v });
      toast("Code PIN mis à jour.", "success");
    });

    $("btn-admin-close").addEventListener("click", closeAdminPanel);
  }

  global.PB = global.PB || {};
  global.PB.admin = { init, openAdminPanel, closeAdminPanel };
})(window);
