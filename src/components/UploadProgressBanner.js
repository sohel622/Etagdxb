// UploadProgressBanner.js - Instagram-Style Top Upload Progress Bar
import { prependPostToHomeFeed } from "./Feed.js";

let bannerEl = null;
let progressBarEl = null;
let percentTextEl = null;
let thumbImgEl = null;
let titleEl = null;
let statusIconEl = null;
let subtextEl = null;
let actionIconWrapper = null;
let activeTempBlobUrl = null;

function resolveElements() {
  if (!bannerEl || !document.body.contains(bannerEl)) {
    bannerEl = document.getElementById("homeUploadProgressBanner");
  }
  if (bannerEl) {
    progressBarEl = document.getElementById("uploadBannerProgressBar");
    percentTextEl = document.getElementById("uploadBannerPercentText");
    thumbImgEl = document.getElementById("uploadBannerThumb");
    titleEl = document.getElementById("uploadBannerStatusTitle");
    statusIconEl = document.getElementById("uploadBannerStatusIcon");
    subtextEl = document.getElementById("uploadBannerSubtext");
    actionIconWrapper = document.getElementById("uploadBannerActionIcon");
  }
  return {
    bannerEl,
    progressBarEl,
    percentTextEl,
    thumbImgEl,
    titleEl,
    statusIconEl,
    subtextEl,
    actionIconWrapper
  };
}

/**
 * Show the Instagram-style upload progress banner above the feed
 */
export function showUploadProgressBanner({ thumbnailSrc, title = "Keep Flashgram open to finish posting..." }) {
  const els = resolveElements();
  if (!els.bannerEl) return;

  if (activeTempBlobUrl && activeTempBlobUrl.startsWith("blob:")) {
    try { URL.revokeObjectURL(activeTempBlobUrl); } catch (_) {}
    activeTempBlobUrl = null;
  }
  if (thumbnailSrc && thumbnailSrc.startsWith("blob:")) {
    activeTempBlobUrl = thumbnailSrc;
  }

  // Ensure element is visible and styled smoothly
  els.bannerEl.classList.remove("hidden");
  els.bannerEl.style.maxHeight = "80px";
  els.bannerEl.style.opacity = "1";
  els.bannerEl.style.transform = "translateY(0)";
  els.bannerEl.style.paddingTop = "";
  els.bannerEl.style.paddingBottom = "";
  els.bannerEl.style.transition = "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)";

  if (els.thumbImgEl) {
    els.thumbImgEl.src = thumbnailSrc || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100";
  }
  if (els.titleEl) {
    els.titleEl.textContent = title || "Posting...";
  }
  if (els.percentTextEl) {
    els.percentTextEl.textContent = "0%";
  }
  if (els.progressBarEl) {
    els.progressBarEl.style.width = "0%";
    els.progressBarEl.style.background = "linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)";
  }
}

/**
 * Update upload progress in real-time
 */
export function updateUploadProgressBanner(percent, meta) {
  const els = resolveElements();
  const safePercent = Math.min(100, Math.max(0, Math.round(percent)));

  if (els.progressBarEl) {
    els.progressBarEl.style.width = `${safePercent}%`;
  }
  if (els.percentTextEl) {
    els.percentTextEl.textContent = `${safePercent}%`;
  }
  if (safePercent >= 100) {
    if (els.titleEl) els.titleEl.textContent = "Finishing post...";
  } else if (els.titleEl) {
    els.titleEl.textContent = "Posting...";
  }
}

/**
 * Complete upload, flash checkmark, smoothly slide up, and prepend to feed
 */
export function completeUploadProgressBanner(newPost) {
  const els = resolveElements();

  if (els.progressBarEl) {
    els.progressBarEl.style.width = "100%";
    els.progressBarEl.style.background = "#10b981"; // success emerald green
  }
  if (els.percentTextEl) {
    els.percentTextEl.textContent = "100%";
  }
  if (els.titleEl) {
    els.titleEl.innerHTML = `<span class="text-green-500 font-semibold flex items-center gap-1.5"><i class="fa-solid fa-circle-check text-green-500"></i> Posted!</span>`;
  }
  if (els.subtextEl) {
    els.subtextEl.textContent = "• Published to feed";
  }
  if (els.statusIconEl) {
    els.statusIconEl.className = "fa-solid fa-check text-xs text-white";
  }
  if (els.actionIconWrapper) {
    els.actionIconWrapper.className = "flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-green-500 text-white shadow-sm transition-transform scale-110";
  }

  // Prepend newly created post to top of home feed instantly
  if (newPost) {
    prependPostToHomeFeed(newPost);
  }

  // Scroll smoothly to top of feed
  const homeView = document.getElementById("homeView");
  if (homeView) {
    homeView.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Revoke temp blob thumbnail if any
  if (activeTempBlobUrl && activeTempBlobUrl.startsWith("blob:")) {
    try { URL.revokeObjectURL(activeTempBlobUrl); } catch (_) {}
    activeTempBlobUrl = null;
  }

  // Hold completion for 850ms so user clearly perceives the "Posted!" checkmark, then smoothly slide up/collapse
  setTimeout(() => {
    if (!els.bannerEl) return;
    els.bannerEl.style.maxHeight = "0px";
    els.bannerEl.style.opacity = "0";
    els.bannerEl.style.transform = "translateY(-12px)";
    els.bannerEl.style.marginBottom = "0px";
    els.bannerEl.style.paddingTop = "0px";
    els.bannerEl.style.paddingBottom = "0px";
    els.bannerEl.style.borderWidth = "0px";

    setTimeout(() => {
      if (els.bannerEl) {
        els.bannerEl.classList.add("hidden");
        els.bannerEl.style.maxHeight = "";
        els.bannerEl.style.opacity = "";
        els.bannerEl.style.transform = "";
        els.bannerEl.style.marginBottom = "";
        els.bannerEl.style.paddingTop = "";
        els.bannerEl.style.paddingBottom = "";
        els.bannerEl.style.borderWidth = "";
      }
      if (els.progressBarEl) els.progressBarEl.style.width = "0%";
    }, 450);
  }, 850);
}

/**
 * Handle upload failure
 */
export function failUploadProgressBanner(errorMessage = "Upload failed") {
  const els = resolveElements();

  if (els.titleEl) {
    els.titleEl.innerHTML = `<span class="text-red-500 font-semibold flex items-center gap-1.5"><i class="fa-solid fa-triangle-exclamation"></i> Upload failed</span>`;
  }
  if (els.subtextEl) {
    els.subtextEl.textContent = `• ${errorMessage}`;
  }
  if (els.progressBarEl) {
    els.progressBarEl.style.background = "#ef4444";
  }
  if (els.statusIconEl) {
    els.statusIconEl.className = "fa-solid fa-xmark text-xs text-white";
  }
  if (els.actionIconWrapper) {
    els.actionIconWrapper.className = "flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-red-500 text-white";
  }

  if (activeTempBlobUrl && activeTempBlobUrl.startsWith("blob:")) {
    try { URL.revokeObjectURL(activeTempBlobUrl); } catch (_) {}
    activeTempBlobUrl = null;
  }

  setTimeout(() => {
    if (!els.bannerEl) return;
    els.bannerEl.style.maxHeight = "0px";
    els.bannerEl.style.opacity = "0";
    setTimeout(() => {
      if (els.bannerEl) {
        els.bannerEl.classList.add("hidden");
        els.bannerEl.style.maxHeight = "";
        els.bannerEl.style.opacity = "";
      }
    }, 400);
  }, 4000);
}

if (typeof window !== "undefined") {
  window.showUploadProgressBanner = showUploadProgressBanner;
  window.updateUploadProgressBanner = updateUploadProgressBanner;
  window.completeUploadProgressBanner = completeUploadProgressBanner;
  window.failUploadProgressBanner = failUploadProgressBanner;
}
