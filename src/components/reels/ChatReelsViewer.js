// Dedicated Chat-Scoped Fullscreen Reels Viewer
// When tapping a video preview card in chat, opens a full-screen vertical player
// scoped strictly to the video(s) shared in the active conversation (no split-screen, no endless extra feed)

import { openReelsCommentsSheet, openReelsShareSheet, openPostOptionsSheet } from "./index.js";
import { isGlobalAudioMuted, toggleGlobalAudio } from "../Navbar.js";
import { isFollowingShabnam, toggleFollowShabnam, showInstagramToast } from "../../utils/storage.js";
import { spawnFloatingHeart } from "../ReelsViewer.js";

let chatReelsOverlay = null;
let activeChatVideos = [];
let activeObserver = null;
let activeProgressInterval = null;

function createChatReelsDOM() {
  if (chatReelsOverlay) return chatReelsOverlay;

  const overlay = document.createElement("div");
  overlay.id = "chatReelsViewerOverlay";
  overlay.className = "chat-reels-overlay";
  overlay.style.display = "none";

  overlay.innerHTML = `
    <!-- Top Header -->
    <div class="chat-reels-top-header">
      <button type="button" class="chat-reel-back-btn" id="chatReelsBackBtn" title="Back to chat">
        <i class="fa-solid fa-arrow-left text-[17px]"></i>
      </button>
      <div class="chat-reels-top-title">Reels</div>
      <button type="button" class="chat-reel-back-btn" id="chatReelsMuteToggleBtn" title="Toggle Sound">
        <i class="fa-solid fa-volume-high text-[14px]" id="chatReelsGlobalMuteIcon"></i>
      </button>
    </div>

    <!-- Scoped Reels Feed Container -->
    <div class="chat-reels-container" id="chatReelsContainer"></div>
  `;

  document.body.appendChild(overlay);
  chatReelsOverlay = overlay;

  const backBtn = overlay.querySelector("#chatReelsBackBtn");
  if (backBtn) {
    backBtn.onclick = () => {
      closeChatReelsViewer();
    };
  }

  const muteBtn = overlay.querySelector("#chatReelsMuteToggleBtn");
  if (muteBtn) {
    muteBtn.onclick = () => {
      if (typeof toggleGlobalAudio === "function") {
        toggleGlobalAudio();
      }
      syncChatReelsMuteIcons();
    };
  }

  return overlay;
}

function syncChatReelsMuteIcons() {
  const isMuted = typeof isGlobalAudioMuted === "function" ? isGlobalAudioMuted() : false;
  const icon = document.getElementById("chatReelsGlobalMuteIcon");
  if (icon) {
    icon.className = isMuted ? "fa-solid fa-volume-xmark text-[14px]" : "fa-solid fa-volume-high text-[14px]";
  }
  if (chatReelsOverlay) {
    const vids = chatReelsOverlay.querySelectorAll("video");
    vids.forEach(v => {
      v.muted = isMuted;
    });
  }
}

/**
 * Open dedicated full-screen Reels viewer scoped strictly to conversation-shared videos
 * @param {Object} options
 * @param {Array} options.videos - Array of video card objects shared in this conversation
 * @param {number} options.initialIndex - Initial video index to play
 */
export function openChatReelsViewer({ videos = [], initialIndex = 0 } = {}) {
  const overlay = createChatReelsDOM();
  const feed = overlay.querySelector("#chatReelsContainer");
  if (!feed) return;

  activeChatVideos = videos;
  feed.innerHTML = "";

  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }
  clearInterval(activeProgressInterval);

  const isMuted = typeof isGlobalAudioMuted === "function" ? isGlobalAudioMuted() : false;

  videos.forEach((reel, index) => {
    const item = document.createElement("div");
    item.className = "chat-reel-item";
    item.dataset.index = index;
    item.dataset.id = reel.id || "reel_" + index;

    const displayUser = reel.user || "creator";
    const isShabnam = displayUser === "shabnam_ai" || reel.id === "shabnam_reel_1";
    const displayAvatar = reel.avatar || (isShabnam ? "https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/IMG_20260921_164350.png" : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80");
    const likesCount = reel.likes || "14.2K";
    const commentsCount = reel.comments || "142";
    const sharesCount = reel.shares || "210";
    const captionText = reel.caption || reel.title || "Flashgram Reel";

    let followBtnHtml = "";
    if (isShabnam) {
      const isFoll = typeof isFollowingShabnam === "function" && isFollowingShabnam();
      followBtnHtml = `<button type="button" class="follow-btn ${isFoll ? 'following' : ''}" id="chatReelFollowBtn_${index}">${isFoll ? 'Following' : 'Follow'}</button>`;
    } else {
      followBtnHtml = `<button type="button" class="follow-btn" id="chatReelFollowBtn_${index}">Follow</button>`;
    }

    item.innerHTML = `
      <div class="reel-video-wrapper w-full h-full relative flex items-center justify-center bg-black">
        <video class="reel-video w-full h-full object-cover" src="${reel.url}" loop playsinline preload="auto" ${isMuted ? 'muted' : ''}></video>
        
        <div class="sound-status-badge"><i class="fa-solid fa-volume-high"></i></div>

        <!-- Bottom Metadata Info -->
        <div class="reels-bottom-info">
          <div class="reels-user-row">
            <img src="${displayAvatar}" class="post-avatar" alt="${displayUser}" />
            <span class="font-bold text-[14px] text-white">${displayUser}</span>
            ${isShabnam ? '<span class="text-sky-400 text-[12px] ml-1" title="Verified"><i class="fa-solid fa-circle-check"></i></span>' : ''}
            ${followBtnHtml}
          </div>
          <div class="reels-caption">${captionText}</div>
        </div>

        <!-- Right Side Action Rail -->
        <div class="reels-sidebar">
          <div class="reel-action-btn chat-reel-like-btn" title="Like">
            <i class="fa-solid fa-heart"></i>
            <span>${likesCount}</span>
          </div>
          <div class="reel-action-btn chat-reel-comment-btn" title="Comments">
            <i class="fa-solid fa-comment-dots"></i>
            <span>${commentsCount}</span>
          </div>
          <div class="reel-action-btn chat-reel-share-btn" title="Share">
            <i class="fa-regular fa-paper-plane"></i>
            <span>${sharesCount}</span>
          </div>
          <div class="reel-action-btn chat-reel-more-btn" title="Options">
            <i class="fa-solid fa-ellipsis"></i>
          </div>
        </div>

        <!-- Independent Per-Card Progress Bar -->
        <div class="reel-card-progress-bar-container" title="Seek video">
          <div class="reel-card-progress-bar-fill"></div>
        </div>
      </div>
    `;

    const video = item.querySelector("video");
    const wrapper = item.querySelector(".reel-video-wrapper");
    const likeBtn = item.querySelector(".chat-reel-like-btn");
    const commentBtn = item.querySelector(".chat-reel-comment-btn");
    const shareBtn = item.querySelector(".chat-reel-share-btn");
    const moreBtn = item.querySelector(".chat-reel-more-btn");
    const followBtn = item.querySelector(`#chatReelFollowBtn_${index}`);
    const progressBar = item.querySelector(".reel-card-progress-bar-container");
    const progressFill = item.querySelector(".reel-card-progress-bar-fill");
    const soundBadge = item.querySelector(".sound-status-badge");

    // Double tap to like & Single tap for sound
    let lastTapTime = 0;
    wrapper.addEventListener("click", (e) => {
      if (e.target.closest(".reels-sidebar") || e.target.closest(".reels-bottom-info") || e.target.closest(".reel-card-progress-bar-container")) {
        return;
      }
      const now = Date.now();
      if (now - lastTapTime < 280) {
        // Double tap -> heart animation
        if (likeBtn) {
          likeBtn.classList.add("liked");
          const heartIcon = likeBtn.querySelector("i");
          if (heartIcon) heartIcon.style.color = "#ff1361";
        }
        if (typeof spawnFloatingHeart === "function") {
          spawnFloatingHeart(e.clientX, e.clientY);
        }
      } else {
        // Single tap -> toggle audio
        if (video) {
          video.muted = !video.muted;
          if (soundBadge) {
            soundBadge.innerHTML = video.muted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
            soundBadge.classList.add("show");
            setTimeout(() => soundBadge.classList.remove("show"), 700);
          }
        }
      }
      lastTapTime = now;
    });

    if (likeBtn) {
      likeBtn.onclick = (e) => {
        e.stopPropagation();
        likeBtn.classList.toggle("liked");
        const heartIcon = likeBtn.querySelector("i");
        if (heartIcon) {
          heartIcon.style.color = likeBtn.classList.contains("liked") ? "#ff1361" : "";
        }
      };
    }

    if (commentBtn) {
      commentBtn.onclick = (e) => {
        e.stopPropagation();
        openReelsCommentsSheet(reel.id, reel);
      };
    }

    if (shareBtn) {
      shareBtn.onclick = (e) => {
        e.stopPropagation();
        openReelsShareSheet(reel);
      };
    }

    if (moreBtn) {
      moreBtn.onclick = (e) => {
        e.stopPropagation();
        openPostOptionsSheet(reel, item);
      };
    }

    if (followBtn) {
      followBtn.onclick = (e) => {
        e.stopPropagation();
        if (isShabnam) {
          if (typeof toggleFollowShabnam === "function") toggleFollowShabnam();
          const isFollNow = typeof isFollowingShabnam === "function" && isFollowingShabnam();
          followBtn.classList.toggle("following", isFollNow);
          followBtn.innerText = isFollNow ? "Following" : "Follow";
        } else {
          followBtn.innerText = followBtn.innerText === "Follow" ? "Following" : "Follow";
        }
      };
    }

    // Video progress update
    if (video && progressFill) {
      video.addEventListener("timeupdate", () => {
        if (video.duration && !isNaN(video.duration)) {
          const percent = (video.currentTime / video.duration) * 100;
          progressFill.style.width = `${percent}%`;
        }
      });
    }

    // Seek on progress bar click
    if (progressBar && video) {
      progressBar.onclick = (e) => {
        e.stopPropagation();
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        if (width > 0 && video.duration) {
          const pos = Math.max(0, Math.min(1, clickX / width));
          video.currentTime = pos * video.duration;
        }
      };
    }

    feed.appendChild(item);
  });

  // Display overlay completely covering the screen
  overlay.style.display = "flex";
  syncChatReelsMuteIcons();

  // Scroll to initialIndex immediately
  const items = feed.querySelectorAll(".chat-reel-item");
  const targetItem = items[initialIndex] || items[0];

  if (targetItem) {
    targetItem.scrollIntoView({ behavior: "auto", block: "start" });
  }

  // Setup Intersection Observer to play visible video and pause others
  activeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const vid = entry.target.querySelector("video");
      if (!vid) return;

      if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
        vid.play().catch(() => {
          vid.muted = true;
          vid.play().catch(() => {});
        });
      } else {
        vid.pause();
      }
    });
  }, {
    root: feed,
    threshold: [0.55]
  });

  items.forEach(it => activeObserver.observe(it));

  // Push state to browser history for seamless back navigation
  try {
    window.history.pushState({ chatReelsViewerActive: true }, "", "/reels/view");
  } catch (_) {}

  window.addEventListener("popstate", handleChatReelsPopState);
}

function handleChatReelsPopState(e) {
  if (chatReelsOverlay && chatReelsOverlay.style.display !== "none") {
    closeChatReelsViewer(false);
  }
}

/**
 * Close dedicated full-screen Reels viewer and return straight to Shabnam AI chat
 */
export function closeChatReelsViewer(shouldGoBackHistory = true) {
  if (!chatReelsOverlay) return;

  // Pause all videos
  const vids = chatReelsOverlay.querySelectorAll("video");
  vids.forEach(v => {
    v.pause();
    v.currentTime = 0;
  });

  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }
  clearInterval(activeProgressInterval);

  chatReelsOverlay.style.display = "none";
  window.removeEventListener("popstate", handleChatReelsPopState);

  // Return to clean URL if active history state was /reels/view
  if (shouldGoBackHistory && window.location.pathname.includes("/reels/view")) {
    try {
      window.history.back();
    } catch (_) {}
  }
}

if (typeof window !== "undefined") {
  window.openChatReelsViewer = openChatReelsViewer;
  window.closeChatReelsViewer = closeChatReelsViewer;
}
