// Fullscreen Video Player Component for Flashgram
// Provides an immersive 100% viewport viewing experience for landscape & long-form videos
// with system UI suppression and clean Back button exit flow.

let activeSourceVideo = null;
let controlsTimeout = null;
let isFullscreenActive = false;

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function isVideoLandscapeOrLong(videoElement) {
  if (!videoElement) return false;
  const w = videoElement.videoWidth || 0;
  const h = videoElement.videoHeight || 0;
  if (w > 0 && h > 0) {
    // Landscape if width exceeds height by at least 5% (ratio >= 1.05)
    return (w / h) >= 1.05;
  }
  // Check container aspect ratio or explicit flags
  const container = videoElement.closest(".home-post-video-container, .reel-video-wrapper, .post-video-container");
  if (container) {
    if (container.classList.contains("is-landscape")) return true;
    const cw = container.clientWidth || 0;
    const ch = container.clientHeight || 0;
    if (cw > 0 && ch > 0 && (cw / ch) >= 1.05) return true;
  }
  return false;
}

export function initFullscreenVideoPlayer() {
  if (document.getElementById("globalFullscreenVideoContainer")) return;

  const container = document.createElement("div");
  container.id = "globalFullscreenVideoContainer";
  container.className = "fullscreen-video-modal";
  container.setAttribute("aria-hidden", "true");
  container.style.display = "none";

  container.innerHTML = `
    <div class="fullscreen-center-tap-area" id="fullscreenCenterTapArea"></div>
    <video id="fullscreenActiveVideo" class="fullscreen-video-element" playsinline webkit-playsinline></video>
    
    <!-- Top Overlay Bar with Back Button & Meta Info -->
    <div class="fullscreen-top-overlay" id="fullscreenTopOverlay">
      <div class="flex items-center min-w-0 flex-1">
        <button type="button" class="fullscreen-back-btn" id="fullscreenBackBtn" aria-label="Exit Fullscreen" title="Back">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <div class="fullscreen-meta-info min-w-0">
          <span class="fullscreen-author-title truncate" id="fullscreenAuthorTitle">Flashgram Video</span>
          <span class="fullscreen-caption-subtext truncate" id="fullscreenCaptionSubtext">Fullscreen Mode</span>
        </div>
      </div>
      <button type="button" class="fullscreen-control-btn ml-2" id="fullscreenPiPBtn" title="Picture-in-Picture">
        <i class="fa-solid fa-clone text-[15px]"></i>
      </button>
    </div>

    <!-- Bottom Overlay Bar with Scrubber & Controls -->
    <div class="fullscreen-bottom-overlay" id="fullscreenBottomOverlay">
      <div class="fullscreen-progress-row">
        <span class="fullscreen-time-label" id="fullscreenCurrentTime">0:00</span>
        <div class="fullscreen-progress-bar-track" id="fullscreenProgressTrack" title="Seek video">
          <div class="fullscreen-progress-bar-fill" id="fullscreenProgressFill"></div>
          <div class="fullscreen-progress-thumb" id="fullscreenProgressThumb"></div>
        </div>
        <span class="fullscreen-time-label" id="fullscreenDuration">0:00</span>
      </div>
      <div class="fullscreen-controls-row">
        <div class="flex items-center gap-1.5">
          <button type="button" class="fullscreen-control-btn" id="fullscreenPlayPauseBtn" title="Play/Pause">
            <i class="fa-solid fa-pause"></i>
          </button>
          <button type="button" class="fullscreen-control-btn" id="fullscreenMuteBtn" title="Mute/Unmute">
            <i class="fa-solid fa-volume-high"></i>
          </button>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" class="fullscreen-control-btn" id="fullscreenExitBtn" title="Exit Fullscreen">
            <i class="fa-solid fa-compress"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  const fsVideo = container.querySelector("#fullscreenActiveVideo");
  const backBtn = container.querySelector("#fullscreenBackBtn");
  const exitBtn = container.querySelector("#fullscreenExitBtn");
  const playPauseBtn = container.querySelector("#fullscreenPlayPauseBtn");
  const muteBtn = container.querySelector("#fullscreenMuteBtn");
  const pipBtn = container.querySelector("#fullscreenPiPBtn");
  const tapArea = container.querySelector("#fullscreenCenterTapArea");
  const progressTrack = container.querySelector("#fullscreenProgressTrack");
  const progressFill = container.querySelector("#fullscreenProgressFill");
  const progressThumb = container.querySelector("#fullscreenProgressThumb");
  const currentTimeEl = container.querySelector("#fullscreenCurrentTime");
  const durationEl = container.querySelector("#fullscreenDuration");

  // Reset controls hide timer
  const resetControlsTimer = () => {
    container.classList.remove("controls-hidden");
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (fsVideo && !fsVideo.paused) {
        container.classList.add("controls-hidden");
      }
    }, 3200);
  };

  // Exit Fullscreen handlers
  backBtn.onclick = (e) => {
    e.stopPropagation();
    closeFullscreenVideo();
  };

  exitBtn.onclick = (e) => {
    e.stopPropagation();
    closeFullscreenVideo();
  };

  // Tap background to toggle controls / play-pause
  tapArea.onclick = () => {
    if (container.classList.contains("controls-hidden")) {
      resetControlsTimer();
    } else {
      if (fsVideo.paused) {
        fsVideo.play().catch(() => {});
        resetControlsTimer();
      } else {
        fsVideo.pause();
        container.classList.remove("controls-hidden");
        clearTimeout(controlsTimeout);
      }
    }
  };

  // Play/Pause button
  playPauseBtn.onclick = (e) => {
    e.stopPropagation();
    if (fsVideo.paused) {
      fsVideo.play().catch(() => {});
    } else {
      fsVideo.pause();
    }
    resetControlsTimer();
  };

  // Mute/Unmute button
  muteBtn.onclick = (e) => {
    e.stopPropagation();
    fsVideo.muted = !fsVideo.muted;
    updateMuteIcon();
    resetControlsTimer();
  };

  // PiP button
  pipBtn.onclick = async (e) => {
    e.stopPropagation();
    if (document.pictureInPictureEnabled && fsVideo) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await fsVideo.requestPictureInPicture();
        }
      } catch (err) {
        console.warn("Fullscreen PiP notice:", err);
      }
    }
  };

  const updateMuteIcon = () => {
    if (!muteBtn || !fsVideo) return;
    const icon = muteBtn.querySelector("i");
    if (icon) {
      icon.className = fsVideo.muted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
    }
  };

  const updatePlayPauseIcon = () => {
    if (!playPauseBtn || !fsVideo) return;
    const icon = playPauseBtn.querySelector("i");
    if (icon) {
      icon.className = fsVideo.paused ? "fa-solid fa-play" : "fa-solid fa-pause";
    }
  };

  fsVideo.onplay = () => {
    updatePlayPauseIcon();
    resetControlsTimer();
  };

  fsVideo.onpause = () => {
    updatePlayPauseIcon();
    container.classList.remove("controls-hidden");
    clearTimeout(controlsTimeout);
  };

  // Time & Scrubber tracking
  fsVideo.ontimeupdate = () => {
    if (!fsVideo.duration) return;
    const pct = (fsVideo.currentTime / fsVideo.duration) * 100;
    progressFill.style.width = `${pct}%`;
    progressThumb.style.left = `${pct}%`;
    currentTimeEl.textContent = formatTime(fsVideo.currentTime);
  };

  fsVideo.onloadedmetadata = () => {
    durationEl.textContent = formatTime(fsVideo.duration);
    currentTimeEl.textContent = formatTime(fsVideo.currentTime);
    updateMuteIcon();
    updatePlayPauseIcon();
  };

  // Scrubber seeking
  let isSeeking = false;
  const seekToPosition = (clientX) => {
    const rect = progressTrack.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (fsVideo.duration) {
      fsVideo.currentTime = pos * fsVideo.duration;
    }
    progressFill.style.width = `${pos * 100}%`;
    progressThumb.style.left = `${pos * 100}%`;
  };

  progressTrack.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    isSeeking = true;
    seekToPosition(e.clientX);
    progressTrack.setPointerCapture(e.pointerId);
    resetControlsTimer();
  });

  progressTrack.addEventListener("pointermove", (e) => {
    if (isSeeking) {
      e.stopPropagation();
      seekToPosition(e.clientX);
      resetControlsTimer();
    }
  });

  const stopSeeking = (e) => {
    if (isSeeking) {
      isSeeking = false;
      try { progressTrack.releasePointerCapture(e.pointerId); } catch (_) {}
      resetControlsTimer();
    }
  };

  progressTrack.addEventListener("pointerup", stopSeeking);
  progressTrack.addEventListener("pointercancel", stopSeeking);

  // Esc key to exit fullscreen
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isFullscreenActive) {
      closeFullscreenVideo();
    }
  });

  // History popstate to exit fullscreen on back button
  window.addEventListener("popstate", (e) => {
    if (isFullscreenActive && (!e.state || !e.state.isFullscreenVideo)) {
      closeFullscreenVideo(false);
    }
  });
}

/**
 * Open the Fullscreen Video mode for a video element
 */
export function openFullscreenVideo({ sourceVideo, title, author, caption, videoUrl }) {
  if (!sourceVideo && !videoUrl) return;
  initFullscreenVideoPlayer();

  const container = document.getElementById("globalFullscreenVideoContainer");
  const fsVideo = document.getElementById("fullscreenActiveVideo");
  const authorEl = document.getElementById("fullscreenAuthorTitle");
  const captionEl = document.getElementById("fullscreenCaptionSubtext");
  if (!container || !fsVideo) return;

  activeSourceVideo = sourceVideo;
  isFullscreenActive = true;

  const currentSrc = (sourceVideo && sourceVideo.src) || videoUrl;
  const currentTime = (sourceVideo && sourceVideo.currentTime) || 0;
  const isPaused = sourceVideo ? sourceVideo.paused : false;
  const isMuted = sourceVideo ? sourceVideo.muted : false;

  // Pause original video to avoid duplicate audio/decoders
  if (sourceVideo) {
    try {
      sourceVideo.pause();
    } catch (_) {}
  }

  // Populate metadata
  if (authorEl) authorEl.textContent = author || "Flashgram Video";
  if (captionEl) captionEl.textContent = caption || title || "Fullscreen Player";

  // Configure fullscreen video
  fsVideo.src = currentSrc;
  fsVideo.currentTime = currentTime;
  fsVideo.muted = isMuted;

  // Show container and suppress app UI headers and bottom bar
  container.style.display = "flex";
  requestAnimationFrame(() => {
    container.classList.add("active");
    document.body.classList.add("in-fullscreen-mode");
    const appC = document.getElementById("appContainer");
    if (appC) appC.classList.add("in-fullscreen-mode");
  });

  // Start playback
  if (!isPaused) {
    fsVideo.play().catch(() => {
      fsVideo.muted = true;
      fsVideo.play().catch(() => {});
    });
  }

  // Push history state so Android hardware back button and browser back smoothly exit
  try {
    window.history.pushState({ isFullscreenVideo: true }, "", window.location.href);
  } catch (_) {}

  // Request native fullscreen or orientation lock if available
  try {
    if (screen.orientation && typeof screen.orientation.lock === "function") {
      screen.orientation.lock("landscape").catch(() => {});
    }
  } catch (_) {}
}

/**
 * Exit Fullscreen Video mode and resume feed playback
 */
export function closeFullscreenVideo(triggerHistoryBack = true) {
  if (!isFullscreenActive) return;
  isFullscreenActive = false;

  const container = document.getElementById("globalFullscreenVideoContainer");
  const fsVideo = document.getElementById("fullscreenActiveVideo");

  let exitTime = 0;
  let wasPlaying = false;
  let wasMuted = false;

  if (fsVideo) {
    exitTime = fsVideo.currentTime || 0;
    wasPlaying = !fsVideo.paused;
    wasMuted = fsVideo.muted;
    try {
      fsVideo.pause();
      fsVideo.removeAttribute("src");
      fsVideo.load();
    } catch (_) {}
  }

  // Resume source video in the feed / reels viewer
  if (activeSourceVideo) {
    try {
      activeSourceVideo.currentTime = exitTime;
      activeSourceVideo.muted = wasMuted;
      if (wasPlaying) {
        activeSourceVideo.play().catch(() => {});
      }
    } catch (_) {}
  }

  // Restore screen orientation if locked
  try {
    if (screen.orientation && typeof screen.orientation.unlock === "function") {
      screen.orientation.unlock();
    }
  } catch (_) {}

  // Restore system UI, headers, and bottom nav
  if (container) {
    container.classList.remove("active");
    container.style.display = "none";
  }
  document.body.classList.remove("in-fullscreen-mode");
  const appC = document.getElementById("appContainer");
  if (appC) appC.classList.remove("in-fullscreen-mode");

  // Re-sync bottom nav visibility
  if (typeof window.syncBottomNavVisibility === "function") {
    window.syncBottomNavVisibility();
  }

  // Revert history state if not triggered by popstate
  if (triggerHistoryBack && window.history.state?.isFullscreenVideo) {
    window.history.back();
  }

  activeSourceVideo = null;
}

/**
 * Attach or update the conditional Fullscreen button overlay on a video container
 * strictly when video is horizontal / landscape or long-form.
 */
export function attachConditionalFullscreenButton(container, videoElement, metadata = {}) {
  if (!container || !videoElement) return;

  const evaluateAndMount = () => {
    const isLandscape = isVideoLandscapeOrLong(videoElement);
    let existingBtn = container.querySelector(".video-fullscreen-btn");

    if (isLandscape) {
      if (!existingBtn) {
        existingBtn = document.createElement("button");
        existingBtn.type = "button";
        existingBtn.className = "video-fullscreen-btn";
        existingBtn.setAttribute("aria-label", "Watch in Fullscreen");
        existingBtn.setAttribute("title", "Fullscreen mode");
        existingBtn.innerHTML = `
          <i class="fa-solid fa-expand"></i>
          <span>Fullscreen</span>
        `;
        container.appendChild(existingBtn);
      }

      existingBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openFullscreenVideo({
          sourceVideo: videoElement,
          title: metadata.title || metadata.caption || "Flashgram",
          author: metadata.author || metadata.username || "creator",
          caption: metadata.caption || "",
          videoUrl: videoElement.src
        });
      };
    } else if (existingBtn) {
      // Standard vertical 9:16 short reel: remove or don't display
      existingBtn.remove();
    }
  };

  if (videoElement.readyState >= 1) {
    evaluateAndMount();
  } else {
    videoElement.addEventListener("loadedmetadata", evaluateAndMount, { once: true });
  }
}

if (typeof window !== "undefined") {
  window.openFullscreenVideo = openFullscreenVideo;
  window.closeFullscreenVideo = closeFullscreenVideo;
  window.isVideoLandscapeOrLong = isVideoLandscapeOrLong;
  window.attachConditionalFullscreenButton = attachConditionalFullscreenButton;
}
