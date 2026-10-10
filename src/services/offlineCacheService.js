// offlineCacheService.js - Seamless Offline Video Caching with IndexedDB, CacheStorage & Capacitor Network
import { Network } from '@capacitor/network';

const DB_NAME = 'FlashgramOfflineDB_v1';
const DB_VERSION = 1;
const STORE_POSTS = 'offline_watched_posts';
const STORE_BLOBS = 'offline_video_blobs';
const CACHE_STORAGE_NAME = 'flashgram-offline-videos-v1';
const MAX_CACHED_VIDEOS = 15;

let idbInstance = null;
let isOfflineState = false;
const activeObjectUrls = new Map();
const inProgressCaches = new Set();
const networkListeners = new Set();

/**
 * Open or initialize IndexedDB for offline video caching
 */
export function openOfflineDB() {
  return new Promise((resolve) => {
    if (idbInstance) return resolve(idbInstance);
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[OfflineCache] IndexedDB not available');
      return resolve(null);
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_POSTS)) {
          const postStore = db.createObjectStore(STORE_POSTS, { keyPath: 'id' });
          postStore.createIndex('cached_at', 'cached_at', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_BLOBS)) {
          const blobStore = db.createObjectStore(STORE_BLOBS, { keyPath: 'key' });
          blobStore.createIndex('cached_at', 'cached_at', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        idbInstance = event.target.result;
        resolve(idbInstance);
      };

      request.onerror = (err) => {
        console.warn('[OfflineCache] IndexedDB open error:', err);
        resolve(null);
      };
    } catch (e) {
      console.warn('[OfflineCache] IndexedDB open exception:', e);
      resolve(null);
    }
  });
}

/**
 * Initialize Network listener with @capacitor/network and browser events
 */
export async function initNetworkListener() {
  try {
    const status = await Network.getStatus();
    isOfflineState = !status.connected;
    updateOfflineUIIndicator(isOfflineState);

    Network.addListener('networkStatusChange', (status) => {
      const newOffline = !status.connected;
      if (isOfflineState !== newOffline) {
        isOfflineState = newOffline;
        console.log(`[OfflineCache] Network status changed. Connected: ${status.connected}`);
        updateOfflineUIIndicator(isOfflineState);
        notifyNetworkSubscribers(isOfflineState);
      }
    });
  } catch (err) {
    console.warn('[OfflineCache] Capacitor Network init fallback:', err);
    isOfflineState = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  }

  // Web fallback listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      isOfflineState = false;
      updateOfflineUIIndicator(false);
      notifyNetworkSubscribers(false);
    });
    window.addEventListener('offline', () => {
      isOfflineState = true;
      updateOfflineUIIndicator(true);
      notifyNetworkSubscribers(true);
    });
  }
}

/**
 * Check if the device is currently offline
 */
export function isOffline() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  return isOfflineState;
}

/**
 * Subscribe to network status changes
 */
export function onNetworkChange(callback) {
  networkListeners.add(callback);
  return () => networkListeners.delete(callback);
}

function notifyNetworkSubscribers(offline) {
  networkListeners.forEach(cb => {
    try { cb(offline); } catch (_) {}
  });
}

/**
 * Update subtle offline pill badge in the UI without disrupting layout
 */
export function updateOfflineUIIndicator(offline) {
  if (typeof document === 'undefined') return;

  let indicator = document.getElementById('offlineStatusBarBadge');
  if (!indicator) {
    const topBar = document.getElementById('topNavbarHeader') || document.querySelector('.top-bar');
    if (topBar) {
      indicator = document.createElement('div');
      indicator.id = 'offlineStatusBarBadge';
      indicator.className = 'hidden transition-all duration-300 ease-out py-0.5 px-2.5 rounded-full bg-neutral-900/90 dark:bg-neutral-800/90 text-neutral-200 border border-neutral-700/60 text-[11px] font-semibold items-center gap-1.5 shadow-sm';
      indicator.innerHTML = '<i class="fa-solid fa-cloud-arrow-down text-sky-400 text-[10px]"></i><span>Offline Cache</span>';
      
      const topActions = topBar.querySelector('.top-bar-actions');
      if (topActions) {
        topBar.insertBefore(indicator, topActions);
      } else {
        topBar.appendChild(indicator);
      }
    }
  }

  if (indicator) {
    if (offline) {
      indicator.classList.remove('hidden');
      indicator.classList.add('flex');
    } else {
      indicator.classList.add('hidden');
      indicator.classList.remove('flex');
    }
  }
}

/**
 * Fetch video blob and cache in IndexedDB & CacheStorage (Key: cached_reel_${id})
 */
export async function cacheFullyWatchedVideo(postData) {
  if (!postData || !postData.id) return;
  const id = String(postData.id);
  const cacheKey = `cached_reel_${id}`;

  if (inProgressCaches.has(id)) return;

  // Check if already in IndexedDB
  const existing = await getCachedVideoBlob(id);
  if (existing) {
    console.log(`[OfflineCache] Video ${id} is already cached.`);
    return;
  }

  inProgressCaches.add(id);
  console.log(`[OfflineCache] 100% watched detected. Background caching video for post ${id}...`);

  try {
    const rawUrl = postData.video_url || postData.url;
    if (!rawUrl) return;

    // Background fetch video blob
    const response = await fetch(rawUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`);
    }

    const blob = await response.blob();
    const mimeType = blob.type || 'video/mp4';

    // 1. Store in CacheStorage
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(CACHE_STORAGE_NAME);
        const headers = new Headers();
        headers.set('Content-Type', mimeType);
        headers.set('Content-Length', String(blob.size));
        const resToCache = new Response(blob, { headers });
        await cache.put(cacheKey, resToCache);
      } catch (cacheErr) {
        console.warn('[OfflineCache] CacheStorage put note:', cacheErr);
      }
    }

    // 2. Store in IndexedDB
    const db = await openOfflineDB();
    if (db) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_POSTS, STORE_BLOBS], 'readwrite');
        const postStore = tx.objectStore(STORE_POSTS);
        const blobStore = tx.objectStore(STORE_BLOBS);

        const profile = (Array.isArray(postData.profiles) ? postData.profiles[0] : postData.profiles) || {};

        const postRecord = {
          id: id,
          user_id: postData.user_id || profile.id || '',
          author_name: profile.username || postData.author_name || postData.user || 'creator',
          avatar_url: profile.avatar_url || postData.avatar_url || postData.avatar || '',
          caption: postData.caption || postData.title || '',
          thumbnail_url: postData.thumbnail_url || postData.poster || '',
          video_url: rawUrl,
          likes_count: postData.likes_count || postData.likes || '1.2K',
          comments_count: postData.comments_count || postData.comments || '18',
          shares: postData.shares || '12',
          cached_at: Date.now()
        };

        const blobRecord = {
          key: cacheKey,
          id: id,
          blob: blob,
          mimeType: mimeType,
          size: blob.size,
          cached_at: Date.now()
        };

        postStore.put(postRecord);
        blobStore.put(blobRecord);

        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
      });
    }

    console.log(`[OfflineCache] Successfully cached reel_${id} (${(blob.size / (1024 * 1024)).toFixed(2)} MB).`);

    // 3. FIFO Capacity Limit: Keep at most last 15 videos
    await enforceFIFOCapacityLimit();

    // 4. Subtle non-intrusive micro toast
    showCacheMicroToast(postData.caption || postData.id);

  } catch (err) {
    console.warn(`[OfflineCache] Failed to background cache video for ${id}:`, err);
  } finally {
    inProgressCaches.delete(id);
  }
}

/**
 * Enforce FIFO Capacity Limit (Max 15 fully-watched videos)
 */
export async function enforceFIFOCapacityLimit() {
  const db = await openOfflineDB();
  if (!db) return;

  try {
    const allPosts = await new Promise((resolve) => {
      const tx = db.transaction(STORE_POSTS, 'readonly');
      const req = tx.objectStore(STORE_POSTS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    if (allPosts.length <= MAX_CACHED_VIDEOS) return;

    // Sort by cached_at ascending (oldest first)
    allPosts.sort((a, b) => (a.cached_at || 0) - (b.cached_at || 0));

    const removeCount = allPosts.length - MAX_CACHED_VIDEOS;
    const itemsToDelete = allPosts.slice(0, removeCount);

    console.log(`[OfflineCache] Storage limit reached (${allPosts.length}/${MAX_CACHED_VIDEOS}). Purging ${removeCount} oldest items.`);

    for (const item of itemsToDelete) {
      const id = String(item.id);
      const key = `cached_reel_${id}`;

      // Revoke in-memory object URL if active
      if (activeObjectUrls.has(id)) {
        URL.revokeObjectURL(activeObjectUrls.get(id));
        activeObjectUrls.delete(id);
      }

      // Delete from CacheStorage
      if (typeof caches !== 'undefined') {
        try {
          const cache = await caches.open(CACHE_STORAGE_NAME);
          await cache.delete(key);
        } catch (_) {}
      }

      // Delete from IndexedDB
      await new Promise((resolve) => {
        const tx = db.transaction([STORE_POSTS, STORE_BLOBS], 'readwrite');
        tx.objectStore(STORE_POSTS).delete(id);
        tx.objectStore(STORE_BLOBS).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch (err) {
    console.warn('[OfflineCache] FIFO purge notice:', err);
  }
}

/**
 * Retrieve cached video blob from IndexedDB or CacheStorage
 */
export async function getCachedVideoBlob(reelId) {
  if (!reelId) return null;
  const id = String(reelId);
  const cacheKey = `cached_reel_${id}`;

  // 1. Check IndexedDB
  const db = await openOfflineDB();
  if (db) {
    const record = await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_BLOBS, 'readonly');
        const req = tx.objectStore(STORE_BLOBS).get(cacheKey);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });

    if (record && record.blob) {
      return record.blob;
    }
  }

  // 2. Fallback to CacheStorage
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_STORAGE_NAME);
      const match = await cache.match(cacheKey);
      if (match) {
        return await match.blob();
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Get or create reusable Object URL for cached video
 */
export async function getCachedVideoBlobUrl(reelId) {
  if (!reelId) return null;
  const id = String(reelId);

  if (activeObjectUrls.has(id)) {
    return activeObjectUrls.get(id);
  }

  const blob = await getCachedVideoBlob(id);
  if (blob) {
    const objUrl = URL.createObjectURL(blob);
    activeObjectUrls.set(id, objUrl);
    return objUrl;
  }

  return null;
}

/**
 * Video Source Resolver:
 * Returns the local blob URL if cached, or fallback URL / offline placeholder
 */
export async function resolveVideoSource(reel) {
  if (!reel) return { src: '', isCached: false };
  const id = String(reel.id || '');

  // 1. Check if cached locally in IndexedDB
  const cachedBlobUrl = await getCachedVideoBlobUrl(id);
  if (cachedBlobUrl) {
    return {
      src: cachedBlobUrl,
      isCached: true,
      offlinePlayable: true
    };
  }

  // 2. If device is offline and video is not cached, do NOT attempt network fetch
  if (isOffline()) {
    return {
      src: '',
      isCached: false,
      offlinePlayable: false,
      isOfflineNoNetwork: true
    };
  }

  // 3. Online: return original / optimized URL
  return {
    src: reel.video_url || reel.url || '',
    isCached: false,
    offlinePlayable: true
  };
}

/**
 * Get all fully-watched posts from offline_watched_posts table
 */
export async function getOfflineWatchedPosts() {
  const db = await openOfflineDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_POSTS, 'readonly');
      const req = tx.objectStore(STORE_POSTS).getAll();
      req.onsuccess = () => {
        const posts = req.result || [];
        // Sort newest cached first
        posts.sort((a, b) => (b.cached_at || 0) - (a.cached_at || 0));
        resolve(posts);
      };
      req.onerror = () => resolve([]);
    } catch (_) {
      resolve([]);
    }
  });
}

/**
 * Check and track video progress for automatic 95% caching
 */
export function trackVideoProgressForCaching(videoElement, postData) {
  if (!videoElement || !postData || !postData.id) return;
  let hasTriggeredCache = false;

  const checkProgress = () => {
    if (hasTriggeredCache) return;
    const dur = videoElement.duration;
    const cur = videoElement.currentTime;

    if (dur && dur > 0 && cur / dur >= 0.95) {
      hasTriggeredCache = true;
      cacheFullyWatchedVideo(postData);
    }
  };

  const onEnded = () => {
    if (!hasTriggeredCache) {
      hasTriggeredCache = true;
      cacheFullyWatchedVideo(postData);
    }
  };

  videoElement.addEventListener('timeupdate', checkProgress);
  videoElement.addEventListener('ended', onEnded);
}

/**
 * Non-disruptive micro notification when a video is saved for offline
 */
function showCacheMicroToast(caption) {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById('offlineSaveMicroBadge');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'offlineSaveMicroBadge';
  toast.className = 'fixed top-14 left-1/2 -translate-x-1/2 z-[105] flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 dark:bg-neutral-100/90 text-white dark:text-neutral-900 shadow-lg backdrop-blur border border-white/10 dark:border-black/10 text-[11.5px] font-medium pointer-events-none transition-all duration-300';
  toast.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400 dark:text-emerald-600"></i><span>Saved for offline watching ⚡</span>';

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, -6px)';
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

// Global exposure for window & backwards compatibility
if (typeof window !== 'undefined') {
  window.openOfflineDB = openOfflineDB;
  window.cacheFullyWatchedVideo = cacheFullyWatchedVideo;
  window.getCachedVideoBlob = getCachedVideoBlob;
  window.getCachedVideoBlobUrl = getCachedVideoBlobUrl;
  window.resolveVideoSource = resolveVideoSource;
  window.getOfflineWatchedPosts = getOfflineWatchedPosts;
  window.isOffline = isOffline;
}
