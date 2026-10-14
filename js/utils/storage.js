// js/utils/storage.js - Storage and Offline Helpers
import { UserProfileStore, showInstagramToast } from "../../src/utils/storage.js";

export { UserProfileStore, showInstagramToast };

export function getCachedItem(key, fallback = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function setCachedItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Storage quota exceeded or error:", e);
  }
}
