// pipService.js - Automatic Picture-in-Picture & Hardware Back Handling for Reels
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

let pipListenerInitialized = false;
let controlsTimeout = null;

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
      setPipMode(true);
      return true;
    } catch (err) {
      console.log('[PiP] Picture-in-Picture request failed:', err);
    }
  }
  return false;
}

/**
 * Exit PiP mode cleanly
 */
export async function exitPipMode() {
  if (document.pictureInPictureElement && document.exitPictureInPicture) {
    try {
      await document.exitPictureInPicture();
    } catch (_) {}
  }
  setPipMode(false);
}

/**
 * Toggle or update clean PiP UI mode
 */
export function setPipMode(isPiP) {
  if (typeof document === 'undefined') return;

  if (isPiP) {
    document.body.classList.add('pip-active');
    const controls = ensurePipFloatingControls();
    showPipFloatingControls(controls);
  } else {
    document.body.classList.remove('pip-active');
    const controls = document.getElementById('pipFloatingControls');
    if (controls) {
      controls.classList.remove('visible');
    }
  }

  updatePipPlayButtonIcon();
}

/**
 * Update the play/pause icon in the floating PiP controls
 */
export function updatePipPlayButtonIcon() {
  const icon = document.querySelector('#pipPlayPauseBtn i');
  if (!icon) return;

  const activeVid = getActiveReelVideo();
  if (activeVid && !activeVid.paused) {
    icon.className = 'fa-solid fa-pause';
  } else {
    icon.className = 'fa-solid fa-play';
  }
}

/**
 * Show floating controls temporarily (auto-hides after 3s)
 */
export function showPipFloatingControls(controlsEl) {
  const controls = controlsEl || document.getElementById('pipFloatingControls');
  if (!controls) return;

  controls.classList.add('visible');
  updatePipPlayButtonIcon();

  clearTimeout(controlsTimeout);
  controlsTimeout = setTimeout(() => {
    controls.classList.remove('visible');
  }, 3000);
}

/**
 * Ensure floating PiP overlay controls exist in DOM
 */
function ensurePipFloatingControls() {
  let controls = document.getElementById('pipFloatingControls');
  if (!controls) {
    controls = document.createElement('div');
    controls.id = 'pipFloatingControls';
    controls.className = 'pip-floating-controls';
    controls.innerHTML = `
      <button type="button" class="pip-ctrl-btn" id="pipPrevBtn" title="Previous Reel">
        <i class="fa-solid fa-backward-step"></i>
      </button>
      <button type="button" class="pip-ctrl-btn pip-play-btn" id="pipPlayPauseBtn" title="Play/Pause">
        <i class="fa-solid fa-play"></i>
      </button>
      <button type="button" class="pip-ctrl-btn" id="pipNextBtn" title="Next Reel">
        <i class="fa-solid fa-forward-step"></i>
      </button>
      <button type="button" class="pip-ctrl-btn pip-close-btn" id="pipCloseBtn" title="Exit PiP">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    document.body.appendChild(controls);

    controls.querySelector('#pipPrevBtn').onclick = (e) => {
      e.stopPropagation();
      if (typeof window.goToPrevReel === 'function') window.goToPrevReel();
      showPipFloatingControls(controls);
    };

    controls.querySelector('#pipPlayPauseBtn').onclick = (e) => {
      e.stopPropagation();
      if (typeof window.toggleCurrentReelPlayback === 'function') window.toggleCurrentReelPlayback();
      setTimeout(updatePipPlayButtonIcon, 50);
      showPipFloatingControls(controls);
    };

    controls.querySelector('#pipNextBtn').onclick = (e) => {
      e.stopPropagation();
      if (typeof window.goToNextReel === 'function') window.goToNextReel();
      showPipFloatingControls(controls);
    };

    controls.querySelector('#pipCloseBtn').onclick = (e) => {
      e.stopPropagation();
      exitPipMode();
    };
  }
  return controls;
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
      // 1. Check if comments sheet is open first
      const commentsBackdrop = document.getElementById("reelsCommentsSheetBackdrop");
      if (commentsBackdrop && (commentsBackdrop.classList.contains("active") || window.isCommentsOpen)) {
        if (typeof window.closeReelsCommentsSheet === 'function') {
          window.closeReelsCommentsSheet();
          return;
        }
      }

      // 2. Check if any modal or bottom sheet is open
      const openModal = document.querySelector('.modal-overlay.active, .sheet-overlay.active, #permissionOnboardingModal[style*="display: flex"]');
      if (openModal) {
        if (typeof window.closeAllModals === 'function') {
          window.closeAllModals();
          return;
        }
      }

      const currentVideo = document.querySelector('video.active-reel') || getActiveReelVideo();

      // If a reel is playing, trigger native PiP or floating window instead of closing immediately
      if (currentVideo && !currentVideo.paused) {
        if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
          try {
            await currentVideo.requestPictureInPicture();
            setPipMode(true);
            return; // Prevent app exit
          } catch (err) {
            console.log('Web PiP fallback:', err);
          }
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

    // 3. Listen for Android native pipModeChange CustomEvent
    window.addEventListener('pipModeChange', (e) => {
      const isPiP = Boolean(e?.detail?.isPiP);
      console.log('[PiP] Native pipModeChange received:', isPiP);
      setPipMode(isPiP);
    });

    // 4. Listen for HTML5 Video Picture-in-Picture lifecycle
    document.addEventListener('enterpictureinpicture', () => {
      setPipMode(true);
    }, true);

    document.addEventListener('leavepictureinpicture', () => {
      setPipMode(false);
    }, true);

    // 5. Tap on screen during PiP displays floating controls
    document.addEventListener('click', (e) => {
      if (document.body.classList.contains('pip-active')) {
        const controls = ensurePipFloatingControls();
        showPipFloatingControls(controls);
      }
    }, true);
  }
}

// Expose on window
if (typeof window !== 'undefined') {
  window.getActiveReelVideo = getActiveReelVideo;
  window.setActiveReelVideo = setActiveReelVideo;
  window.triggerReelPiP = triggerReelPiP;
  window.exitPipMode = exitPipMode;
  window.setPipMode = setPipMode;
  window.initReelsPipHandler = initReelsPipHandler;
  window.updatePipPlayButtonIcon = updatePipPlayButtonIcon;
}
