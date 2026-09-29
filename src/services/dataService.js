// Data Service for Flashgram
import { db, initDatabase, getDb } from "./database.js";
import { SAMPLE_VIDEOS } from "../utils/mockData.js";
import { getSavedVideos } from "../utils/storage.js";

export const DataService = {
  // Get all videos / reels
  async getAllVideos() {
    await initDatabase();
    const activeDb = getDb() || db || (typeof window !== "undefined" && window.db);
    return new Promise((resolve) => {
      try {
        if (!activeDb || typeof activeDb.transaction !== "function") {
          return resolve(getSavedVideos());
        }
        const tx = activeDb.transaction("videos", "readonly");
        const store = tx.objectStore("videos");
        const request = store.getAll();
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        request.onerror = () => {
          resolve(getSavedVideos());
        };
      } catch (err) {
        resolve(getSavedVideos());
      }
    });
  },

  // Save new video / reel
  async addVideo(videoData) {
    await initDatabase();
    const activeDb = getDb() || db || (typeof window !== "undefined" && window.db);
    return new Promise((resolve, reject) => {
      try {
        if (!activeDb || typeof activeDb.transaction !== "function") {
          return resolve(null);
        }
        const tx = activeDb.transaction("videos", "readwrite");
        const store = tx.objectStore("videos");
        const request = store.add(videoData);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e);
      } catch (err) {
        reject(err);
      }
    });
  },

  // Update video interactions
  async updateVideo(videoData) {
    await initDatabase();
    const activeDb = getDb() || db || (typeof window !== "undefined" && window.db);
    return new Promise((resolve, reject) => {
      try {
        if (!activeDb || typeof activeDb.transaction !== "function") {
          return resolve(null);
        }
        const tx = activeDb.transaction("videos", "readwrite");
        const store = tx.objectStore("videos");
        const request = store.put(videoData);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e);
      } catch (err) {
        reject(err);
      }
    });
  }
};

window.DataService = DataService;
