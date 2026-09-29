// ReelsShareSheet Component (Instagram-Style Slide-Up Share Drawer & Clear Mode)
import { SHABNAM_AI_PROFILE } from "../../utils/mockData.js";
import { showInstagramToast } from "../../utils/storage.js";

let currentSharingReel = null;
let selectedRecipients = new Set();
let isClearModeActive = false;

const MOCK_RECIPIENTS = [
  {
    id: "shabnam_ai",
    name: "Shabnam AI",
    username: "shabnam_ai",
    avatar: SHABNAM_AI_PROFILE.avatar,
    isVerified: true
  },
  {
    id: "alex_r",
    name: "Alex Rivera",
    username: "alex_r",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "sophiap",
    name: "Sophia Patel",
    username: "sophiap",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "ethan_c",
    name: "Ethan Cole",
    username: "ethan_c",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "maya_l",
    name: "Maya Lin",
    username: "maya_l",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80"
  }
];

function getSavedReelsList() {
  try {
    const list = localStorage.getItem("flashgram_saved_reels");
    return list ? JSON.parse(list) : [];
  } catch (_) {
    return [];
  }
}

function isReelSaved(reelId) {
  if (!reelId) return false;
  const list = getSavedReelsList();
  return list.includes(String(reelId));
}

function toggleSaveReel(reelId) {
  if (!reelId) return false;
  let list = getSavedReelsList();
  const sid = String(reelId);
  const exists = list.includes(sid);
  if (exists) {
    list = list.filter(id => id !== sid);
  } else {
    list.push(sid);
  }
  localStorage.setItem("flashgram_saved_reels", JSON.stringify(list));
  return !exists;
}

function createShareSheetDOM() {
  let backdrop = document.getElementById("reelsShareSheetBackdrop");
  if (backdrop) return backdrop;

  backdrop = document.createElement("div");
  backdrop.id = "reelsShareSheetBackdrop";
  backdrop.className = "reels-sheet-backdrop reels-share-backdrop";
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeReelsShareSheet();
  };

  backdrop.innerHTML = `
    <div class="reels-share-drawer" onclick="event.stopPropagation()">
      <div class="sheet-drag-handle"></div>
      <div class="share-sheet-header">
        <div class="share-sheet-title">Share</div>
        <button type="button" class="share-sheet-close-btn" id="shareSheetCloseBtn" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="share-sheet-content">
        <!-- Row 1: External Apps -->
        <div>
          <div class="share-section-title">Share To</div>
          <div class="share-apps-row">
            <button type="button" class="share-app-btn" id="shareBtnStory">
              <div class="share-app-icon-circle story">
                <i class="fa-solid fa-plus text-[19px]"></i>
              </div>
              <span class="share-app-label">Your story</span>
            </button>

            <button type="button" class="share-app-btn" id="shareBtnMessenger">
              <div class="share-app-icon-circle messenger">
                <i class="fa-brands fa-facebook-messenger"></i>
              </div>
              <span class="share-app-label">Messenger</span>
            </button>

            <button type="button" class="share-app-btn" id="shareBtnWhatsApp">
              <div class="share-app-icon-circle whatsapp">
                <i class="fa-brands fa-whatsapp"></i>
              </div>
              <span class="share-app-label">WhatsApp</span>
            </button>

            <button type="button" class="share-app-btn" id="shareBtnCopy">
              <div class="share-app-icon-circle">
                <i class="fa-solid fa-link"></i>
              </div>
              <span class="share-app-label">Copy link</span>
            </button>

            <button type="button" class="share-app-btn" id="shareBtnTelegram">
              <div class="share-app-icon-circle telegram">
                <i class="fa-brands fa-telegram"></i>
              </div>
              <span class="share-app-label">Telegram</span>
            </button>

            <button type="button" class="share-app-btn" id="shareBtnMore">
              <div class="share-app-icon-circle">
                <i class="fa-solid fa-ellipsis"></i>
              </div>
              <span class="share-app-label">More</span>
            </button>
          </div>
        </div>

        <!-- Row 2: Followers / Recents -->
        <div>
          <div class="share-section-title">Send to Friends</div>
          <div class="share-recipients-row" id="shareRecipientsRow"></div>
        </div>

        <!-- Sticky Send Action Bar -->
        <div class="share-send-bar" id="shareSendBar">
          <input type="text" class="share-send-input" id="shareSendInput" placeholder="Write a message..." />
          <button type="button" class="share-send-btn" id="shareSendSubmitBtn">Send</button>
        </div>

        <!-- Row 3: Action Controls -->
        <div>
          <div class="share-section-title">Controls</div>
          <div class="share-actions-row">
            <button type="button" class="share-action-pill" id="actionPillInterested">
              <i class="fa-solid fa-star text-amber-400"></i>
              <span>Interested</span>
            </button>

            <button type="button" class="share-action-pill" id="actionPillNotInterested">
              <i class="fa-regular fa-eye-slash"></i>
              <span>Not interested</span>
            </button>

            <button type="button" class="share-action-pill" id="actionPillSave">
              <i class="fa-regular fa-bookmark" id="actionPillSaveIcon"></i>
              <span id="actionPillSaveText">Save</span>
            </button>

            <button type="button" class="share-action-pill" id="actionPillSpeed">
              <i class="fa-solid fa-gauge-high"></i>
              <span id="actionPillSpeedText">1x Speed</span>
            </button>

            <button type="button" class="share-action-pill" id="actionPillClearMode">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
              </svg>
              <span>Clear mode</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  setupShareSheetListeners(backdrop);
  return backdrop;
}

function setupShareSheetListeners(backdrop) {
  const closeBtn = backdrop.querySelector("#shareSheetCloseBtn");
  if (closeBtn) closeBtn.onclick = closeReelsShareSheet;

  // Copy Link
  const copyBtn = backdrop.querySelector("#shareBtnCopy");
  if (copyBtn) {
    copyBtn.onclick = () => {
      const shareUrl = window.location.href;
      try {
        navigator.clipboard.writeText(shareUrl);
        showInstagramToast("Link copied to clipboard! 📋");
      } catch (_) {
        showInstagramToast("Link ready to share! 📋");
      }
      closeReelsShareSheet();
    };
  }

  // Your Story
  const storyBtn = backdrop.querySelector("#shareBtnStory");
  if (storyBtn) {
    storyBtn.onclick = () => {
      showInstagramToast("Added reel to your story! ✨");
      closeReelsShareSheet();
    };
  }

  // Messenger & Telegram
  const messengerBtn = backdrop.querySelector("#shareBtnMessenger");
  if (messengerBtn) {
    messengerBtn.onclick = () => {
      showInstagramToast("Shared via Messenger! 💬");
      closeReelsShareSheet();
    };
  }
  const telegramBtn = backdrop.querySelector("#shareBtnTelegram");
  if (telegramBtn) {
    telegramBtn.onclick = () => {
      showInstagramToast("Shared via Telegram! ✈️");
      closeReelsShareSheet();
    };
  }

  // WhatsApp
  const whatsappBtn = backdrop.querySelector("#shareBtnWhatsApp");
  if (whatsappBtn) {
    whatsappBtn.onclick = () => {
      const text = encodeURIComponent(`Check out this reel on Flashgram: ${window.location.href}`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
      closeReelsShareSheet();
    };
  }

  // More (Web Share API)
  const moreBtn = backdrop.querySelector("#shareBtnMore");
  if (moreBtn) {
    moreBtn.onclick = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Flashgram Reel",
            text: currentSharingReel ? currentSharingReel.caption : "Check out this reel on Flashgram!",
            url: window.location.href
          });
        } catch (_) {}
      } else {
        showInstagramToast("Sharing options ready ✨");
      }
      closeReelsShareSheet();
    };
  }

  // Interested / Not Interested
  const interestedBtn = backdrop.querySelector("#actionPillInterested");
  if (interestedBtn) {
    interestedBtn.onclick = () => {
      showInstagramToast("We'll show you more reels like this ✨");
      closeReelsShareSheet();
    };
  }

  const notInterestedBtn = backdrop.querySelector("#actionPillNotInterested");
  if (notInterestedBtn) {
    notInterestedBtn.onclick = () => {
      showInstagramToast("We won't show you this reel again");
      closeReelsShareSheet();
    };
  }

  // Save / Bookmark
  const saveBtn = backdrop.querySelector("#actionPillSave");
  if (saveBtn) {
    saveBtn.onclick = () => {
      if (!currentSharingReel) return;
      const isSaved = toggleSaveReel(currentSharingReel.id);
      updateSavePillState(isSaved);
      showInstagramToast(isSaved ? "Saved to collection ✨" : "Removed from saved");
    };
  }

  // Playback Speed
  const speedBtn = backdrop.querySelector("#actionPillSpeed");
  if (speedBtn) {
    let currentSpeedIndex = 1;
    const speeds = [0.5, 1.0, 1.25, 1.5, 2.0];
    speedBtn.onclick = () => {
      currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
      const speed = speeds[currentSpeedIndex];
      const activeVideo = document.querySelector("#reelsView .reel-item.active video, #reelsView video");
      if (activeVideo) {
        activeVideo.playbackRate = speed;
      }
      const speedText = backdrop.querySelector("#actionPillSpeedText");
      if (speedText) speedText.textContent = `${speed}x Speed`;
      showInstagramToast(`Playback speed set to ${speed}x`);
    };
  }

  // Clear Mode
  const clearModeBtn = backdrop.querySelector("#actionPillClearMode");
  if (clearModeBtn) {
    clearModeBtn.onclick = () => {
      enableReelsClearMode();
    };
  }

  // Submit Send Bar
  const sendBtn = backdrop.querySelector("#shareSendSubmitBtn");
  if (sendBtn) {
    sendBtn.onclick = () => {
      const names = Array.from(selectedRecipients).map(id => {
        const u = MOCK_RECIPIENTS.find(r => r.id === id);
        return u ? u.name : id;
      });
      showInstagramToast(`Sent to ${names.join(", ")}! 🚀`);
      selectedRecipients.clear();
      closeReelsShareSheet();
    };
  }
}

function updateSavePillState(isSaved) {
  const saveBtn = document.querySelector("#actionPillSave");
  const saveIcon = document.querySelector("#actionPillSaveIcon");
  const saveText = document.querySelector("#actionPillSaveText");
  if (saveBtn) saveBtn.classList.toggle("active", isSaved);
  if (saveIcon) {
    saveIcon.className = isSaved ? "fa-solid fa-bookmark text-sky-400" : "fa-regular fa-bookmark";
  }
  if (saveText) {
    saveText.textContent = isSaved ? "Saved" : "Save";
  }
}

function renderRecipients() {
  const container = document.getElementById("shareRecipientsRow");
  if (!container) return;
  container.innerHTML = "";

  MOCK_RECIPIENTS.forEach(user => {
    const isSelected = selectedRecipients.has(user.id);
    const item = document.createElement("button");
    item.type = "button";
    item.className = `share-recipient-item ${isSelected ? 'selected' : ''}`;
    item.dataset.userId = user.id;

    item.innerHTML = `
      <div class="share-recipient-avatar-wrapper">
        <img src="${user.avatar}" alt="${user.name}" />
        <div class="share-recipient-check">
          <i class="fa-solid fa-check"></i>
        </div>
      </div>
      <span class="share-recipient-name">${user.name}</span>
    `;

    item.onclick = () => {
      if (selectedRecipients.has(user.id)) {
        selectedRecipients.delete(user.id);
      } else {
        selectedRecipients.add(user.id);
      }
      renderRecipients();
      updateSendBar();
    };

    container.appendChild(item);
  });
}

function updateSendBar() {
  const sendBar = document.getElementById("shareSendBar");
  const sendBtn = document.getElementById("shareSendSubmitBtn");
  if (!sendBar) return;

  const count = selectedRecipients.size;
  if (count > 0) {
    sendBar.classList.add("active");
    if (sendBtn) {
      sendBtn.textContent = count > 1 ? `Send separately (${count})` : "Send";
    }
  } else {
    sendBar.classList.remove("active");
  }
}

function openReelsShareSheet(reelData = null) {
  currentSharingReel = reelData;
  const backdrop = createShareSheetDOM();
  selectedRecipients.clear();
  renderRecipients();
  updateSendBar();

  if (currentSharingReel) {
    updateSavePillState(isReelSaved(currentSharingReel.id));
  }

  backdrop.style.display = "flex";
  requestAnimationFrame(() => {
    backdrop.classList.add("active");
  });
}

function closeReelsShareSheet() {
  const backdrop = document.getElementById("reelsShareSheetBackdrop");
  if (!backdrop) return;
  backdrop.classList.remove("active");
  setTimeout(() => {
    backdrop.style.display = "none";
  }, 260);
}

/* =======================================================
   2. Clear Mode (Per-Reel Scoped by Reel ID)
======================================================= */
let activeClearModeReelId = null;

function setActiveClearModeReelId(reelId) {
  // Clear any existing clear mode state and exit buttons across all reel items
  const allReels = document.querySelectorAll("#reelsFeedWrapper .reel-item");
  allReels.forEach(r => {
    r.classList.remove("reel-clear-mode-active");
    const existingExitBtn = r.querySelector(".exit-clear-mode-btn");
    if (existingExitBtn) {
      existingExitBtn.remove();
    }
  });

  const globalExitBtn = document.getElementById("exitClearModeBtn");
  if (globalExitBtn) {
    globalExitBtn.remove();
  }

  const appContainer = document.getElementById("appContainer");
  const reelsView = document.getElementById("reelsView");

  if (!reelId) {
    activeClearModeReelId = null;
    isClearModeActive = false;
    if (appContainer) appContainer.classList.remove("in-reels-clear-mode");
    if (reelsView) reelsView.classList.remove("in-clear-mode");
    return;
  }

  activeClearModeReelId = String(reelId);
  isClearModeActive = true;
  if (appContainer) appContainer.classList.add("in-reels-clear-mode");
  if (reelsView) reelsView.classList.add("in-clear-mode");

  // Find the exact reel item component matching this activeClearModeReelId
  let targetItem = document.querySelector(`.reel-item[data-id="${activeClearModeReelId}"]`);
  if (!targetItem && reelsView) {
    const rRect = reelsView.getBoundingClientRect();
    const rCenter = rRect.top + rRect.height / 2;
    let minD = Infinity;
    allReels.forEach(item => {
      const itRect = item.getBoundingClientRect();
      const itCenter = itRect.top + itRect.height / 2;
      const d = Math.abs(rCenter - itCenter);
      if (d < minD) {
        minD = d;
        targetItem = item;
      }
    });
  }
  if (!targetItem && allReels.length > 0) {
    targetItem = allReels[0];
  }

  if (targetItem) {
    targetItem.classList.add("reel-clear-mode-active");
    const wrapper = targetItem.querySelector(".reel-video-wrapper") || targetItem;

    // Render the minimal exit icon ONLY inside this specific active reel wrapper
    const exitBtn = document.createElement("button");
    exitBtn.type = "button";
    exitBtn.className = "exit-clear-mode-btn";
    exitBtn.setAttribute("title", "Restore controls");
    exitBtn.setAttribute("aria-label", "Restore controls");
    exitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
      </svg>
    `;
    exitBtn.onclick = (e) => {
      e.stopPropagation();
      setActiveClearModeReelId(null);
    };

    wrapper.appendChild(exitBtn);
  }
}

function enableReelsClearMode() {
  closeReelsShareSheet();

  let reelId = null;
  if (currentSharingReel && currentSharingReel.id) {
    reelId = currentSharingReel.id;
  } else {
    const reelsView = document.getElementById("reelsView");
    const allReels = Array.from(document.querySelectorAll("#reelsFeedWrapper .reel-item"));
    if (reelsView && allReels.length > 0) {
      const rRect = reelsView.getBoundingClientRect();
      const rCenter = rRect.top + rRect.height / 2;
      let minD = Infinity;
      let closest = allReels[0];
      allReels.forEach(item => {
        const itRect = item.getBoundingClientRect();
        const itCenter = itRect.top + itRect.height / 2;
        const d = Math.abs(rCenter - itCenter);
        if (d < minD) {
          minD = d;
          closest = item;
        }
      });
      reelId = closest.dataset.id || "current";
    }
  }

  setActiveClearModeReelId(reelId || "current");
  showInstagramToast("Clear mode enabled");
}

function disableReelsClearMode() {
  setActiveClearModeReelId(null);
}

if (typeof window !== "undefined") {
  window.openReelsShareSheet = openReelsShareSheet;
  window.closeReelsShareSheet = closeReelsShareSheet;
  window.enableReelsClearMode = enableReelsClearMode;
  window.disableReelsClearMode = disableReelsClearMode;
  window.setActiveClearModeReelId = setActiveClearModeReelId;
  window.getActiveClearModeReelId = () => activeClearModeReelId;
  window.isClearModeActive = () => activeClearModeReelId !== null;
}

export {
  openReelsShareSheet,
  closeReelsShareSheet,
  enableReelsClearMode,
  disableReelsClearMode,
  setActiveClearModeReelId,
  isClearModeActive
};
