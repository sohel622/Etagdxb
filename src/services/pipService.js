// pipService.js - Automatic Picture-in-Picture & Hardware Back Handling for Reels
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

let pipListenerInitialized = false;

/**
 * Returns the currently playing or active Reel video element
 */
export function getActiveReelVideo() {
  const markedVideo = document.querySelector('video.active-reel');
  if (markedVideo && !markedVideo.paused) return markedVideo;

  const playingReel = document.querySelector('#reelsView video:not([paused])');
  if (playingReel) return playingReel;

  const anyPlaying = Array.from(document.querySelectorAll('video')).find(v => !v.paused);
  return anyPlaying || markedVideo || null;
}

/**
 * Tag video element with active-reel class and untag others
 */
export function setActiveReelVideo(videoElement) {
  if (!videoElement) return;
  document.querySelectorAll('video.active-reel').forEach(v => {
    if (v !== videoElement) v.classList.remove('active-reel');
  });
  videoElement.classList.add('active-reel');
}

/**
 * Request HTML5 / Browser Picture-in-Picture for given video element
 */
export async function triggerReelPiP(videoElement) {
  const vid = videoElement || getActiveReelVideo();
  if (!vid) return false;

  if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
    try {
      await vid.requestPictureInPicture();
      return true;
    } catch (err) {
      console.log('[PiP] Picture-in-Picture request failed:', err);
    }
  }
  return false;
}

/**
 * Initialize back button listener & PiP auto-entry on user leave
 */
export function initReelsPipHandler() {
  if (pipListenerInitialized) return;
  pipListenerInitialized = true;

  // 1. Hardware Back Button Listener via @capacitor/app
  try {
    CapApp.addListener('backButton', async (data) => {
      const currentVideo = document.querySelector('video.active-reel') || getActiveReelVideo();

      // If a reel is playing, trigger native PiP or floating window instead of closing immediately
      if (currentVideo && !currentVideo.paused) {
        if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
          try {
            await currentVideo.requestPictureInPicture();
            return; // Prevent app exit
          } catch (err) {
            console.log('Web PiP fallback:', err);
          }
        }
      }

      // Check if any modal or bottom sheet is open first
      const openModal = document.querySelector('.modal-overlay.active, .sheet-overlay.active, #permissionOnboardingModal[style*="display: flex"]');
      if (openModal) {
        if (typeof window.closeAllModals === 'function') {
          window.closeAllModals();
          return;
        }
      }

      // Otherwise standard back navigation
      if (data && data.canGoBack) {
        window.history.back();
      }
    });
  } catch (err) {
    console.warn('[PiP] CapApp backButton listener setup notice:', err);
  }

  // 2. Auto Picture-in-Picture on app leave / tab switch / visibility hide
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        const activeVid = getActiveReelVideo();
        if (activeVid && !activeVid.paused) {
          triggerReelPiP(activeVid);
        }
      }
    });

    window.addEventListener('pagehide', () => {
      const activeVid = getActiveReelVideo();
      if (activeVid && !activeVid.paused) {
        triggerReelPiP(activeVid);
      }
    });
  }
}

// Expose on window
if (typeof window !== 'undefined') {
  window.getActiveReelVideo = getActiveReelVideo;
  window.setActiveReelVideo = setActiveReelVideo;
  window.triggerReelPiP = triggerReelPiP;
  window.initReelsPipHandler = initReelsPipHandler;
}
