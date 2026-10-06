// ReelsVolumeHUD.js - Custom Instagram-style Reels Volume Indicator HUD
let currentVolumePercent = 75;
let lastNonZeroVolume = 75;
let hudTimeout = null;
let hudInitialized = false;

/**
 * Initialize the Reels Volume HUD in the top-left corner
 */
export function initReelsVolumeHUD() {
  if (hudInitialized) return;
  hudInitialized = true;

  const reelsView = document.getElementById("reelsView");
  if (!reelsView) return;

  let hud = document.getElementById("reelsVolumeHUD");
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "reelsVolumeHUD";
    hud.className = "reels-volume-hud";
    hud.title = "Volume • Tap to mute/unmute";
    hud.innerHTML = `
      <div class="reels-volume-icon-wrapper">
        <i id="reelsVolumeIcon" class="fa-solid fa-volume-high"></i>
      </div>
      <div class="reels-volume-bars" id="reelsVolumeBars">
        <span class="volume-bar" data-index="0"></span>
        <span class="volume-bar" data-index="1"></span>
        <span class="volume-bar" data-index="2"></span>
        <span class="volume-bar" data-index="3"></span>
        <span class="volume-bar" data-index="4"></span>
        <span class="volume-bar" data-index="5"></span>
        <span class="volume-bar" data-index="6"></span>
        <span class="volume-bar" data-index="7"></span>
      </div>
    `;

    // Tap on volume indicator to toggle Mute / Unmute instantly
    hud.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleReelsMute();
    });

    reelsView.appendChild(hud);
  }

  // 1. Listen for native Android reelsVolumeChange event
  window.addEventListener("reelsVolumeChange", (e) => {
    const vol = typeof e?.detail?.volume === "number" ? e.detail.volume : 50;
    showVolumeHUD(vol);
  });

  // 2. Keyboard shortcut support for web browser preview (ArrowUp / ArrowDown in Reels)
  window.addEventListener("keydown", (e) => {
    if (!window.__isReelsActive && !document.getElementById("reelsView")?.classList.contains("active")) {
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newVol = Math.min(100, currentVolumePercent + 10);
      showVolumeHUD(newVol);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newVol = Math.max(0, currentVolumePercent - 10);
      showVolumeHUD(newVol);
    }
  });

  // Initial volume level sync
  updateVolumeBars(currentVolumePercent);
}

/**
 * Display the Volume HUD with the given percentage and auto-hide after 1.5s
 */
export function showVolumeHUD(percent) {
  const safePercent = Math.min(100, Math.max(0, Math.round(percent)));
  currentVolumePercent = safePercent;
  if (safePercent > 0) {
    lastNonZeroVolume = safePercent;
  }

  const hud = document.getElementById("reelsVolumeHUD");
  if (!hud) return;

  updateVolumeBars(safePercent);

  // Sync active video element volume and mute status
  const currentVideo = document.querySelector("video.active-reel") || document.querySelector("#reelsView video:not([paused])");
  if (currentVideo) {
    currentVideo.volume = safePercent / 100;
    currentVideo.muted = (safePercent === 0);
  }

  // Fade-in animation
  hud.classList.add("visible");

  // Auto fade out after 1.5 seconds of inactivity
  clearTimeout(hudTimeout);
  hudTimeout = setTimeout(() => {
    hud.classList.remove("visible");
  }, 1500);
}

/**
 * Update the 8 curved audio wave bars and speaker icon
 */
function updateVolumeBars(percent) {
  const icon = document.getElementById("reelsVolumeIcon");
  const bars = document.querySelectorAll("#reelsVolumeBars .volume-bar");

  // Update speaker icon according to volume level
  if (icon) {
    if (percent === 0) {
      icon.className = "fa-solid fa-volume-xmark";
    } else if (percent <= 40) {
      icon.className = "fa-solid fa-volume-low";
    } else {
      icon.className = "fa-solid fa-volume-high";
    }
  }

  // Fill the 8 bars dynamically (each bar is ~12.5% of total volume)
  bars.forEach((bar, idx) => {
    const threshold = (idx + 1) * 12.5 - 6.25;
    if (percent >= threshold) {
      bar.classList.add("filled");
    } else {
      bar.classList.remove("filled");
    }
  });
}

/**
 * Toggle Mute / Unmute instantly on tap
 */
export function toggleReelsMute() {
  if (currentVolumePercent > 0) {
    // Mute
    lastNonZeroVolume = currentVolumePercent;
    showVolumeHUD(0);
  } else {
    // Unmute to last known volume
    showVolumeHUD(lastNonZeroVolume || 75);
  }
}

// Expose globally
if (typeof window !== "undefined") {
  window.initReelsVolumeHUD = initReelsVolumeHUD;
  window.showVolumeHUD = showVolumeHUD;
  window.toggleReelsMute = toggleReelsMute;
}
