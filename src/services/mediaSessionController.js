// mediaSessionController.js
// Handles Web MediaSession, Capacitor LocalNotifications for Swipe-to-Dismiss on Pause,
// Continuous Background Audio Playback, and Wake Lock Management.

let wakeLockSentinel = null;

/**
 * Ensure persistent HTML5 audio element attached to window so it is NEVER garbage collected.
 */
export function ensurePersistentAudioElement() {
  if (typeof window === "undefined") return null;

  if (!window._flashgramPersistentAudio) {
    try {
      const audio = new Audio();
      // 1-second silent WAV loop to retain audio focus in Android system mixer
      audio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/w==";
      audio.loop = true;
      audio.volume = 0.01;
      audio.preload = "auto";
      window._flashgramPersistentAudio = audio;
    } catch (e) {
      console.warn("[BackgroundAudio] Could not initialize persistent audio element:", e);
    }
  }

  return window._flashgramPersistentAudio;
}

/**
 * Acquire Screen / CPU Wake Lock to prevent Android from sleeping or killing audio on lock screen
 */
export async function acquireWakeLock() {
  if (typeof navigator === "undefined" || !('wakeLock' in navigator)) return;

  try {
    if (!wakeLockSentinel) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
      console.log("[WakeLock] Acquired for background audio playback");
    }
  } catch (err) {
    console.warn("[WakeLock] Could not acquire wake lock:", err);
  }
}

/**
 * Release Wake Lock appropriately when audio pauses or stops
 */
export async function releaseWakeLock() {
  try {
    if (wakeLockSentinel) {
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
      console.log("[WakeLock] Released wake lock");
    }
  } catch (err) {
    console.warn("[WakeLock] Could not release wake lock:", err);
  }
}

/**
 * Initialize Notification Channel on Android via Capacitor
 */
function ensureNotificationChannel() {
  if (typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      window.Capacitor.Plugins?.LocalNotifications?.createChannel({
        id: 'flashgram_music_channel',
        name: 'Flashgram Music Playback',
        description: 'Media playback notifications for Flashgram',
        importance: 3,
        visibility: 1,
        vibration: false,
        lights: false
      });
    } catch (_) {}
  }
}

// Initialize channel early if running native
ensureNotificationChannel();

/**
 * Update media session state & notification ongoing flag
 * - When playing: ongoing = true (pinned in tray)
 * - When paused / stopped: ongoing = false (allows user to swipe it away)
 * @param {boolean} isPlaying
 * @param {object} trackInfo - { title, artist, cover, coverUrl, thumbnail }
 */
export const updateMediaSessionState = (isPlaying, trackInfo = {}) => {
  const title = trackInfo.title || 'Flashgram Audio';
  const artist = trackInfo.artist || trackInfo.channelTitle || 'Flashgram Audio';
  const coverUrl = trackInfo.cover || trackInfo.coverUrl || trackInfo.thumbnail || '';

  // 1. Web MediaSession API update
  if (typeof navigator !== "undefined" && 'mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      if (trackInfo && trackInfo.title && (!navigator.mediaSession.metadata || navigator.mediaSession.metadata.title !== trackInfo.title)) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title,
          artist,
          album: 'Flashgram Hits',
          artwork: coverUrl ? [
            { src: coverUrl, sizes: '512x512', type: 'image/jpeg' },
            { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: '/app-icon.png', sizes: '128x128', type: 'image/png' }
          ] : [
            { src: '/app-icon.png', sizes: '128x128', type: 'image/png' }
          ]
        });
      }
    } catch (e) {
      console.warn("[MediaSession] Error updating state:", e);
    }
  }

  // 2. Native Android Media Foreground Service sync via NativeMediaBridge
  if (typeof window !== "undefined" && window.NativeMediaBridge && typeof window.NativeMediaBridge.updateMediaMetadata === "function") {
    try {
      window.NativeMediaBridge.updateMediaMetadata(
        title,
        artist,
        trackInfo.album || 'Flashgram Music',
        coverUrl,
        Boolean(isPlaying),
        Math.round((trackInfo.duration || 215) * 1000),
        Math.round((trackInfo.currentTime || 0) * 1000),
        Boolean(trackInfo.isLiked)
      );
    } catch (err) {
      console.warn("[MediaSession] Error syncing NativeMediaBridge:", err);
    }
  }

  // Ensure any legacy dummy local notification is suppressed
  if (typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      window.Capacitor.Plugins?.LocalNotifications?.cancel({
        notifications: [{ id: 2001 }]
      }).catch(() => {});
    } catch (_) {}
  }

  // 3. Manage Persistent Background Audio & WakeLock
  if (isPlaying) {
    const keepAlive = ensurePersistentAudioElement();
    if (keepAlive && keepAlive.paused) {
      keepAlive.play().catch(() => {});
    }
    acquireWakeLock();
  } else {
    if (window._flashgramPersistentAudio && !window._flashgramPersistentAudio.paused) {
      try {
        window._flashgramPersistentAudio.pause();
      } catch (_) {}
    }
    releaseWakeLock();
  }
};

/**
 * Explicitly cancel and clear media notification and reset media session
 * Called when user taps 'stop' or closes player
 */
export const clearMediaNotification = async () => {
  // 1. Clear Web MediaSession
  if (typeof navigator !== "undefined" && 'mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      if (typeof navigator.mediaSession.setPositionState === 'function') {
        navigator.mediaSession.setPositionState(null);
      }
    } catch (_) {}
  }

  // 2. Stop Native Android Media Foreground Service
  if (typeof window !== "undefined" && window.NativeMediaBridge && typeof window.NativeMediaBridge.stopMediaService === "function") {
    try {
      window.NativeMediaBridge.stopMediaService();
    } catch (err) {
      console.warn("[MediaSession] Error stopping NativeMediaBridge:", err);
    }
  }

  // Clear any legacy LocalNotification id: 2001
  if (typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      await window.Capacitor.Plugins.LocalNotifications?.cancel({
        notifications: [{ id: 2001 }]
      });
    } catch (_) {}
  }

  // 3. Pause persistent audio and release wake lock
  if (typeof window !== "undefined" && window._flashgramPersistentAudio) {
    try {
      window._flashgramPersistentAudio.pause();
    } catch (_) {}
  }
  await releaseWakeLock();
};

// Auto re-acquire wake lock if tab becomes visible while audio is actively playing
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const isAnyAudioPlaying = (typeof window !== "undefined" && window.youtubeMusicService?.isPlaying) ||
        Array.from(document.querySelectorAll("audio, video")).some(m => !m.paused);
      if (isAnyAudioPlaying) {
        acquireWakeLock();
      }
    }
  });
}

// Expose globally
if (typeof window !== "undefined") {
  window.updateMediaSessionState = updateMediaSessionState;
  window.clearMediaNotification = clearMediaNotification;
  window.ensurePersistentAudioElement = ensurePersistentAudioElement;
}
