/*
 * composer.js — assemble les photos capturées en un montage final au format
 * 10 x 15 cm (canvas 1800x1200 paysage ou 1200x1800 portrait, ratio 3:2,
 * proche de 300 DPI à l'impression), avec cadre PNG, logo, texte et date.
 */
(function (global) {
  "use strict";

  const CANVAS_LANDSCAPE = { w: 1800, h: 1200 };
  const CANVAS_PORTRAIT = { w: 1200, h: 1800 };

  const LAYOUTS = {
    single: [{ x: 0, y: 0, w: 1, h: 1 }],
    duo: [
      { x: 0, y: 0, w: 0.49, h: 1 },
      { x: 0.51, y: 0, w: 0.49, h: 1 },
    ],
    grid4: [
      { x: 0, y: 0, w: 0.49, h: 0.49 },
      { x: 0.51, y: 0, w: 0.49, h: 0.49 },
      { x: 0, y: 0.51, w: 0.49, h: 0.49 },
      { x: 0.51, y: 0.51, w: 0.49, h: 0.49 },
    ],
    strip3: [
      { x: 0, y: 0, w: 1, h: 0.32 },
      { x: 0, y: 0.34, w: 1, h: 0.32 },
      { x: 0, y: 0.68, w: 1, h: 0.32 },
    ],
  };

  function photosNeeded(layout) {
    return (LAYOUTS[layout] || LAYOUTS.single).length;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      if (!src) {
        reject(new Error("Source d'image manquante."));
        return;
      }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Impossible de charger l'image : ${src}`));
      img.src = src;
    });
  }

  /** Dessine `img` dans le rectangle donné en mode "cover" (comme object-fit: cover), sans déformation. */
  function drawCover(ctx, img, x, y, w, h) {
    const ir = img.width / img.height;
    const dr = w / h;
    let sx, sy, sw, sh;
    if (ir > dr) {
      sh = img.height;
      sw = sh * dr;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = sw / dr;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  /** Dessine `img` en mode "contain" (image entière visible, marges éventuelles). */
  function drawContain(ctx, img, x, y, w, h) {
    const ir = img.width / img.height;
    const dr = w / h;
    let dw, dh;
    if (ir > dr) {
      dw = w;
      dh = w / ir;
    } else {
      dh = h;
      dw = h * ir;
    }
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso + "T00:00:00");
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    } catch (e) {
      return iso;
    }
  }

  /**
   * Compose le montage final.
   * @param {string[]} photoDataUrls
   * @param {object} settings
   * @returns {Promise<string>} dataURL JPEG du montage
   */
  async function composeMontage(photoDataUrls, settings) {
    const orientation = settings.orientation === "portrait" ? "portrait" : "landscape";
    const size = orientation === "portrait" ? CANVAS_PORTRAIT : CANVAS_LANDSCAPE;
    const layoutKey = LAYOUTS[settings.layout] ? settings.layout : "single";
    const rects = LAYOUTS[layoutKey];

    const canvas = document.createElement("canvas");
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext("2d");

    // Fond blanc (papier photo dye-sub : un fond blanc net donne le meilleur rendu)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size.w, size.h);

    const marginX = size.w * 0.035;
    const headerH = size.h * 0.1;
    const footerH = size.h * 0.09;
    const gap = size.w * 0.014;

    const photoArea = {
      x: marginX,
      y: headerH,
      w: size.w - marginX * 2,
      h: size.h - headerH - footerH,
    };

    // Chargement des photos nécessaires
    const needed = rects.length;
    const sources = photoDataUrls.slice(0, needed);
    while (sources.length < needed) sources.push(sources[sources.length - 1] || photoDataUrls[0]);
    const images = await Promise.all(sources.map(loadImage));

    images.forEach((img, i) => {
      const r = rects[i];
      const x = photoArea.x + r.x * photoArea.w + (r.x > 0 ? gap / 2 : 0);
      const y = photoArea.y + r.y * photoArea.h + (r.y > 0 ? gap / 2 : 0);
      const w = r.w * photoArea.w - (rects.length > 1 ? gap / 2 : 0);
      const h = r.h * photoArea.h - (rects.length > 1 ? gap / 2 : 0);
      ctx.save();
      roundRectPath(ctx, x, y, w, h, size.w * 0.008);
      ctx.clip();
      drawCover(ctx, img, x, y, w, h);
      ctx.restore();
    });

    // En-tête : nom de l'événement + date
    ctx.textAlign = "center";
    ctx.fillStyle = "#161616";
    ctx.font = `700 ${Math.round(size.h * 0.052)}px -apple-system, system-ui, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText(settings.eventName || "", size.w / 2, headerH * 0.62, size.w - marginX * 2);

    const dateStr = formatDate(settings.eventDate);
    if (dateStr) {
      ctx.fillStyle = "#6b6b6b";
      ctx.font = `500 ${Math.round(size.h * 0.026)}px -apple-system, system-ui, Arial, sans-serif`;
      ctx.fillText(dateStr, size.w / 2, headerH * 0.9, size.w - marginX * 2);
    }

    // Pied de page : message personnalisé + logo
    const footerY = size.h - footerH;
    if (settings.customMessage) {
      ctx.fillStyle = "#2a2a2a";
      ctx.font = `500 ${Math.round(size.h * 0.026)}px -apple-system, system-ui, Arial, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(settings.customMessage, marginX, footerY + footerH * 0.62, size.w * 0.6);
    }

    if (settings.logoSrc) {
      try {
        const logoUrl = await global.PB.settings.resolveAssetSrc(settings.logoSrc);
        if (logoUrl) {
          const logoImg = await loadImage(logoUrl);
          const logoH = footerH * 0.75;
          const logoW = logoH * (logoImg.width / logoImg.height);
          drawContain(ctx, logoImg, size.w - marginX - logoW, footerY + (footerH - logoH) / 2, logoW, logoH);
        }
      } catch (e) {
        // logo optionnel : on ignore silencieusement si absent/invalide
      }
    }

    // Cadre décoratif PNG (transparent), superposé à l'ensemble du montage
    const frameSetting = orientation === "portrait" ? settings.frameSrcPortrait : settings.frameSrc;
    if (frameSetting) {
      try {
        const frameUrl = await global.PB.settings.resolveAssetSrc(frameSetting);
        if (frameUrl) {
          const frameImg = await loadImage(frameUrl);
          ctx.drawImage(frameImg, 0, 0, size.w, size.h);
        }
      } catch (e) {
        throw new Error("Le fichier de cadre est invalide ou n'a pas pu être chargé.");
      }
    }

    return canvas.toDataURL("image/jpeg", 0.93);
  }

  global.PB = global.PB || {};
  global.PB.composer = { composeMontage, photosNeeded, LAYOUTS, loadImage, drawCover, drawContain };
})(window);
