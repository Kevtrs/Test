/*
 * gallery.js — galerie administrateur : liste des sessions enregistrées
 * (miniature, statut d'impression, réimpression, téléchargement, suppression).
 * N'est jamais visible depuis l'interface publique (accessible uniquement
 * via le panneau admin protégé par PIN).
 */
(function (global) {
  "use strict";

  const objectUrls = [];

  function revokeAll() {
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
    objectUrls.length = 0;
  }

  function blobUrl(blob) {
    const url = URL.createObjectURL(blob);
    objectUrls.push(url);
    return url;
  }

  function formatDateTime(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
    } catch (e) {
      return iso;
    }
  }

  function render(onReprint, onDelete) {
    const grid = document.getElementById("gallery-grid");
    const empty = document.getElementById("gallery-empty");
    if (!grid) return Promise.resolve();

    return global.PB.storage.getAllSessions().then((sessions) => {
      revokeAll();
      grid.innerHTML = "";
      empty.hidden = sessions.length > 0;

      sessions.forEach((session) => {
        const card = document.createElement("div");
        card.className = "gallery-card";

        const img = document.createElement("img");
        img.alt = "Montage du " + formatDateTime(session.date);
        img.src = session.finalImage ? blobUrl(session.finalImage) : "";

        const body = document.createElement("div");
        body.className = "gallery-card-body";

        const date = document.createElement("div");
        date.className = "gallery-card-date";
        date.textContent = formatDateTime(session.date);

        const status = document.createElement("div");
        status.className = "gallery-card-status " + (session.printed ? "is-printed" : "is-not-printed");
        status.textContent = session.printed
          ? `Imprimée (${session.printCount || 1}×)`
          : "Non imprimée";

        const actions = document.createElement("div");
        actions.className = "gallery-card-actions";

        const btnReprint = document.createElement("button");
        btnReprint.type = "button";
        btnReprint.textContent = "Réimprimer";
        btnReprint.addEventListener("click", () => onReprint && onReprint(session));

        const btnDownload = document.createElement("button");
        btnDownload.type = "button";
        btnDownload.textContent = "Télécharger";
        btnDownload.addEventListener("click", () => downloadSession(session));

        const btnDelete = document.createElement("button");
        btnDelete.type = "button";
        btnDelete.className = "is-danger";
        btnDelete.textContent = "Supprimer";
        btnDelete.addEventListener("click", () => {
          global.PB.storage.deleteSession(session.id).then(() => {
            if (onDelete) onDelete(session);
            render(onReprint, onDelete);
          });
        });

        actions.append(btnReprint, btnDownload, btnDelete);
        body.append(date, status, actions);
        card.append(img, body);
        grid.appendChild(card);
      });
    });
  }

  function downloadSession(session) {
    if (!session.finalImage) return;
    const url = URL.createObjectURL(session.finalImage);
    const a = document.createElement("a");
    a.href = url;
    const stamp = (session.date || "").replace(/[:.]/g, "-");
    a.download = `photobooth-${stamp}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function exportAll() {
    return global.PB.storage.getAllSessions().then((sessions) => {
      const withImage = sessions.filter((s) => s.finalImage);
      withImage.forEach((session, i) => {
        setTimeout(() => downloadSession(session), i * 350);
      });
      return withImage.length;
    });
  }

  global.PB = global.PB || {};
  global.PB.gallery = { render, downloadSession, exportAll };
})(window);
