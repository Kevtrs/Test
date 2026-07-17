/*
 * storage.js — couche de persistance IndexedDB.
 *
 * On évite volontairement localStorage pour les images : IndexedDB gère
 * bien mieux de gros Blobs et ne bloque pas le thread principal.
 * Toutes les fonctions renvoient des Promises. Aucune dépendance externe.
 */
(function (global) {
  "use strict";

  const DB_NAME = "photobooth-db";
  const DB_VERSION = 1;

  const STORE_SETTINGS = "settings";
  const STORE_SESSIONS = "sessions";
  const STORE_ASSETS = "assets";

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in global)) {
        reject(new Error("IndexedDB indisponible sur ce navigateur."));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          const store = db.createObjectStore(STORE_SESSIONS, { keyPath: "id", autoIncrement: true });
          store.createIndex("date", "date", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_ASSETS)) {
          const store = db.createObjectStore(STORE_ASSETS, { keyPath: "id", autoIncrement: true });
          store.createIndex("type", "type", { unique: false });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("Impossible d'ouvrir la base locale."));
      req.onblocked = () => reject(new Error("Base locale bloquée par un autre onglet."));
    });
    return dbPromise;
  }

  function tx(storeName, mode) {
    return openDb().then((db) => db.transaction(storeName, mode).objectStore(storeName));
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ---------------------------------------------------------------- réglages
  function getSettings() {
    return tx(STORE_SETTINGS, "readonly").then((store) => reqToPromise(store.get("main")));
  }

  function saveSettings(settings) {
    const record = Object.assign({}, settings, { id: "main" });
    return tx(STORE_SETTINGS, "readwrite").then((store) => reqToPromise(store.put(record)));
  }

  // ---------------------------------------------------------------- sessions
  function addSession(session) {
    return tx(STORE_SESSIONS, "readwrite").then((store) => reqToPromise(store.add(session)));
  }

  function updateSession(id, patch) {
    return tx(STORE_SESSIONS, "readwrite").then((store) =>
      reqToPromise(store.get(id)).then((existing) => {
        if (!existing) throw new Error("Session introuvable.");
        const updated = Object.assign({}, existing, patch);
        return reqToPromise(store.put(updated));
      })
    );
  }

  function getSession(id) {
    return tx(STORE_SESSIONS, "readonly").then((store) => reqToPromise(store.get(id)));
  }

  function getAllSessions() {
    return tx(STORE_SESSIONS, "readonly").then(
      (store) =>
        new Promise((resolve, reject) => {
          const out = [];
          const req = store.openCursor(null, "prev");
          req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
              out.push(cursor.value);
              cursor.continue();
            } else {
              resolve(out);
            }
          };
          req.onerror = () => reject(req.error);
        })
    );
  }

  function deleteSession(id) {
    return tx(STORE_SESSIONS, "readwrite").then((store) => reqToPromise(store.delete(id)));
  }

  function clearSessions() {
    return tx(STORE_SESSIONS, "readwrite").then((store) => reqToPromise(store.clear()));
  }

  function countSessions() {
    return tx(STORE_SESSIONS, "readonly").then((store) => reqToPromise(store.count()));
  }

  function trimSessions(maxCount) {
    return getAllSessions().then((sessions) => {
      if (sessions.length <= maxCount) return;
      const toDelete = sessions.slice(maxCount); // le plus ancien en dernier (tri "prev")
      return Promise.all(toDelete.map((s) => deleteSession(s.id)));
    });
  }

  // ------------------------------------------------------------------ assets
  function addAsset(asset) {
    return tx(STORE_ASSETS, "readwrite").then((store) => reqToPromise(store.add(asset)));
  }

  function getAssetsByType(type) {
    return tx(STORE_ASSETS, "readonly").then((store) =>
      reqToPromise(store.index("type").getAll(IDBKeyRange.only(type)))
    );
  }

  function getAsset(id) {
    return tx(STORE_ASSETS, "readonly").then((store) => reqToPromise(store.get(id)));
  }

  function deleteAsset(id) {
    return tx(STORE_ASSETS, "readwrite").then((store) => reqToPromise(store.delete(id)));
  }

  // ------------------------------------------------------------------ divers
  function estimateUsage() {
    if (navigator.storage && navigator.storage.estimate) {
      return navigator.storage.estimate().then((r) => ({
        usage: r.usage || 0,
        quota: r.quota || 0,
      }));
    }
    return Promise.resolve({ usage: 0, quota: 0 });
  }

  function resetAll() {
    return openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const t = db.transaction([STORE_SETTINGS, STORE_SESSIONS, STORE_ASSETS], "readwrite");
          t.objectStore(STORE_SETTINGS).clear();
          t.objectStore(STORE_SESSIONS).clear();
          t.objectStore(STORE_ASSETS).clear();
          t.oncomplete = () => resolve();
          t.onerror = () => reject(t.error);
        })
    );
  }

  global.PB = global.PB || {};
  global.PB.storage = {
    openDb,
    getSettings,
    saveSettings,
    addSession,
    updateSession,
    getSession,
    getAllSessions,
    deleteSession,
    clearSessions,
    countSessions,
    trimSessions,
    addAsset,
    getAssetsByType,
    getAsset,
    deleteAsset,
    estimateUsage,
    resetAll,
  };
})(window);
