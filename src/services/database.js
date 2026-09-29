// IndexedDB Service
import { getSavedVideos } from "../utils/storage.js";

    /* =======================================================
       ২. IndexedDB
    ======================================================= */
    let db;
    function initDatabase() {
      return new Promise((resolve) => {
        const req = indexedDB.open("InstaPureTransparentDB_v3", 1);
        req.onupgradeneeded = (e) => {
          e.target.result.createObjectStore("videos", { keyPath: "id", autoIncrement: true });
        };
        req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      });
    }


export { db, initDatabase };
