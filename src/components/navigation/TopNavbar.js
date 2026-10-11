// TopNavbar Component (Modular Top Header & Audio State Controller)
import { switchTab } from "./BottomNavbar.js";
import { setupHeaderLogoEasterEgg } from "../AppIconChangerModal.js";

/* =======================================================
   ১.১ গ্লোবাল অডিও স্টেট (Global Audio State & Status Badge)
======================================================= */
let isGlobalAudioMuted = false;

function toggleGlobalAudio() {
  isGlobalAudioMuted = !isGlobalAudioMuted;
  document.querySelectorAll("video").forEach(vid => {
    vid.muted = isGlobalAudioMuted;
  });
  showGlobalSoundBadge();
}

function showGlobalSoundBadge() {
  document.querySelectorAll(".sound-status-badge").forEach(badge => {
    badge.innerHTML = isGlobalAudioMuted
      ? '<i class="fa-solid fa-volume-xmark"></i>'
      : '<i class="fa-solid fa-volume-high"></i>';
    badge.style.opacity = '1';
    setTimeout(() => badge.style.opacity = '0', 1000);
  });
}

/* =======================================================
   ১.২ টপ হেডার ইন্টারেকশন ও ইভেন্ট হ্যান্ডলার
======================================================= */
function handleLogoClick() {
  const homeView = document.getElementById("homeView");
  if (homeView) {
    homeView.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function handleDirectMessagesClick() {
  if (typeof switchTab === "function") {
    switchTab("messages");
  } else if (typeof window !== "undefined" && typeof window.switchTab === "function") {
    window.switchTab("messages");
  }
}

function handleNotificationsClick() {
  openNotificationsModal();
}

function openNotificationsModal() {
  let modal = document.getElementById("notificationsModal");
  if (!modal) {
    modal = createNotificationsModal();
  }
  // Clear any notification dot indicators
  const dot = document.getElementById("topNavNotificationDot");
  if (dot) dot.style.display = "none";

  modal.style.display = "flex";
  requestAnimationFrame(() => {
    modal.classList.add("active");
    const sheet = modal.querySelector(".notifications-sheet");
    if (sheet) sheet.classList.add("show");
  });
}

function closeNotificationsModal() {
  const modal = document.getElementById("notificationsModal");
  if (!modal) return;
  modal.classList.remove("active");
  const sheet = modal.querySelector(".notifications-sheet");
  if (sheet) sheet.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
  }, 250);
}

function createNotificationsModal() {
  const modal = document.createElement("div");
  modal.id = "notificationsModal";
  modal.className = "notifications-modal-overlay";
  modal.onclick = (e) => {
    if (e.target === modal) closeNotificationsModal();
  };

  modal.innerHTML = `
    <div class="notifications-sheet" onclick="event.stopPropagation()">
      <div class="notifications-header">
        <div class="notifications-title">Notifications</div>
        <button type="button" class="notifications-close-btn" onclick="closeNotificationsModal()" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="notifications-list">
        <div class="notifications-section-label">Today</div>
        
        <div class="notification-item" onclick="closeNotificationsModal(); if (typeof openProfile === 'function') openProfile('shabnam_ai');">
          <div class="notification-avatar">
            <img src="https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/IMG_20260921_164350.png" alt="Shabnam AI" />
            <span class="notification-badge-icon heart"><i class="fa-solid fa-heart"></i></span>
          </div>
          <div class="notification-content">
            <p><span class="font-bold">shabnam_ai</span> liked your reel. <span class="notification-time">1h</span></p>
          </div>
          <div class="notification-action">
            <div class="notification-thumb"><i class="fa-solid fa-play"></i></div>
          </div>
        </div>

        <div class="notification-item" onclick="closeNotificationsModal(); handleDirectMessagesClick();">
          <div class="notification-avatar">
            <img src="https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/IMG_20260921_164350.png" alt="Shabnam AI" />
            <span class="notification-badge-icon dm"><i class="fa-solid fa-paper-plane"></i></span>
          </div>
          <div class="notification-content">
            <p><span class="font-bold">shabnam_ai</span> sent you a message: "Hey! ✨" <span class="notification-time">3h</span></p>
          </div>
          <div class="notification-action">
            <button class="notif-pill-btn">Reply</button>
          </div>
        </div>

        <div class="notification-item">
          <div class="notification-avatar">
            <img src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80" alt="Alex" />
            <span class="notification-badge-icon follow"><i class="fa-solid fa-user-plus"></i></span>
          </div>
          <div class="notification-content">
            <p><span class="font-bold">alex_r</span> started following you. <span class="notification-time">5h</span></p>
          </div>
          <div class="notification-action">
            <button class="notif-pill-btn" onclick="this.textContent = this.textContent === 'Follow' ? 'Following' : 'Follow'; this.classList.toggle('following');">Follow</button>
          </div>
        </div>

        <div class="notifications-section-label">Earlier</div>

        <div class="notification-item">
          <div class="notification-avatar">
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80" alt="Sophia" />
            <span class="notification-badge-icon heart"><i class="fa-solid fa-heart"></i></span>
          </div>
          <div class="notification-content">
            <p><span class="font-bold">sophiap</span> liked your photo. <span class="notification-time">1d</span></p>
          </div>
          <div class="notification-action">
            <div class="notification-thumb"><i class="fa-solid fa-image"></i></div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  return modal;
}

/* =======================================================
   ১.৩ টপ হেডার রেন্ডারিং ও ইনিশিয়ালাইজেশন
======================================================= */
function renderTopNavbar() {
  const homeView = document.getElementById("homeView");
  if (!homeView) return;

  let topBar = homeView.querySelector(".top-bar");
  if (!topBar) {
    topBar = document.createElement("header");
    topBar.id = "topNavbarHeader";
    homeView.insertBefore(topBar, homeView.firstChild);
  }

  topBar.id = "topNavbarHeader";
  topBar.className = "top-bar app-header sticky top-0 left-0 right-0 z-50 transition-colors duration-200 border-b border-black/[0.06] dark:border-white/[0.08] select-none";
  topBar.style.backgroundColor = "var(--bg-header, inherit)";
  topBar.style.paddingTop = "var(--safe-area-top, env(safe-area-inset-top, 32px))";

  topBar.innerHTML = `
    <div class="flex items-center justify-between px-4 h-12 w-full">
      <!-- Flashgram Logo -->
      <h1 class="logo font-bold text-2xl tracking-tight select-none cursor-pointer" id="topNavLogo" title="Flashgram">Flashgram</h1>
      <!-- Right Action Icons (Notifications / Messages) -->
      <div class="top-bar-actions flex items-center space-x-4">
        <button type="button" class="icon-btn top-nav-btn cursor-pointer" id="topNavNotificationsBtn" title="Notifications" aria-label="Notifications">
          <i class="fa-regular fa-heart text-2xl"></i>
        </button>
        <button type="button" class="icon-btn top-nav-btn cursor-pointer" id="topNavDirectBtn" title="Messages" aria-label="Direct Messages">
          <i class="fa-regular fa-paper-plane text-2xl"></i>
        </button>
      </div>
    </div>
  `;

  const logoElem = topBar.querySelector("#topNavLogo");
  if (logoElem) {
    logoElem.onclick = handleLogoClick;
    setupHeaderLogoEasterEgg();
  }

  const notifBtn = topBar.querySelector("#topNavNotificationsBtn");
  if (notifBtn) {
    notifBtn.onclick = handleNotificationsClick;
  }

  const directBtn = topBar.querySelector("#topNavDirectBtn");
  if (directBtn) {
    directBtn.onclick = handleDirectMessagesClick;
  }
}

function initTopNavbar() {
  renderTopNavbar();
  setupHeaderLogoEasterEgg();
}

if (typeof window !== "undefined") {
  window.handleLogoClick = handleLogoClick;
  window.handleDirectMessagesClick = handleDirectMessagesClick;
  window.handleNotificationsClick = handleNotificationsClick;
  window.closeNotificationsModal = closeNotificationsModal;
  window.openNotificationsModal = openNotificationsModal;
  window.renderTopNavbar = renderTopNavbar;
  window.initTopNavbar = initTopNavbar;
  window.toggleGlobalAudio = toggleGlobalAudio;
  window.showGlobalSoundBadge = showGlobalSoundBadge;
}

export {
  renderTopNavbar,
  initTopNavbar,
  handleLogoClick,
  handleNotificationsClick,
  handleDirectMessagesClick,
  openNotificationsModal,
  closeNotificationsModal,
  toggleGlobalAudio,
  showGlobalSoundBadge,
  isGlobalAudioMuted
};
