// IndexedDB Service with resilient fallback

function createFallbackDb() {
  const memoryVideos = [];
  return {
    isFallback: true,
    transaction(storeName, mode) {
      const tx = {
        oncomplete: null,
        onerror: null,
        objectStore(name) {
          return {
            getAll() {
              const req = { result: [...memoryVideos], onsuccess: null, onerror: null };
              setTimeout(() => {
                if (typeof req.onsuccess === "function") req.onsuccess({ target: req });
              }, 0);
              return req;
            },
            count() {
              const req = { result: memoryVideos.length, onsuccess: null, onerror: null };
              setTimeout(() => {
                if (typeof req.onsuccess === "function") req.onsuccess({ target: req });
              }, 0);
              return req;
            },
            add(item) {
              const id = Date.now() + Math.random();
              const record = { id, ...item };
              memoryVideos.push(record);
              const req = { result: id, onsuccess: null, onerror: null };
              setTimeout(() => {
                if (typeof req.onsuccess === "function") req.onsuccess({ target: req });
                if (typeof tx.oncomplete === "function") tx.oncomplete({ target: tx });
              }, 0);
              return req;
            },
            put(item) {
              const idx = memoryVideos.findIndex(v => v.id === item.id);
              if (idx >= 0) memoryVideos[idx] = item;
              else memoryVideos.push(item);
              const req = { result: item.id, onsuccess: null, onerror: null };
              setTimeout(() => {
                if (typeof req.onsuccess === "function") req.onsuccess({ target: req });
                if (typeof tx.oncomplete === "function") tx.oncomplete({ target: tx });
              }, 0);
              return req;
            }
          };
        }
      };
      return tx;
    }
  };
}

let db = createFallbackDb();
if (typeof window !== "undefined") {
  window.db = db;
}

function initDatabase() {
  return new Promise((resolve) => {
    try {
      if (typeof window === "undefined" || !window.indexedDB) {
        console.warn("IndexedDB not available, using in-memory store.");
        return resolve(db);
      }

      const req = window.indexedDB.open("InstaPureTransparentDB_v3", 1);
      req.onupgradeneeded = (e) => {
        try {
          const dbInstance = e.target.result;
          if (!dbInstance.objectStoreNames.contains("videos")) {
            dbInstance.createObjectStore("videos", { keyPath: "id", autoIncrement: true });
          }
        } catch (err) {
          console.warn("IndexedDB upgrade error:", err);
        }
      };

      req.onsuccess = (e) => {
        db = e.target.result;
        if (typeof window !== "undefined") {
          window.db = db;
        }
        resolve(db);
      };

      req.onerror = (err) => {
        console.warn("IndexedDB open error, keeping fallback:", err);
        resolve(db);
      };

      req.onblocked = () => {
        console.warn("IndexedDB blocked, keeping fallback");
        resolve(db);
      };
    } catch (e) {
      console.warn("IndexedDB init exception, keeping fallback:", e);
      resolve(db);
    }
  });
}

function getDb() {
  return db;
}

export { db, initDatabase, getDb, createFallbackDb };

