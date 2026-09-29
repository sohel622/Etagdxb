// Navbar Component (Top Bar & Sound State)
import { switchTab } from "./BottomNavigation.js";

/* =======================================================
   ১.১ গ্লোবাল অডিও স্টেট
======================================================= */
let isGlobalAudioMuted = true;

function toggleGlobalAudio() {
  isGlobalAudioMuted = !isGlobalAudioMuted;
  document.querySelectorAll("video").forEach(vid => {
    vid.muted = isGlobalAudioMuted;
  });
  showGlobalSoundBadge();
}

function showGlobalSoundBadge() {
  document.querySelectorAll(".sound-status-badge").forEach(badge => {
    badge.innerHTML = isGlobalAudioMuted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
    badge.style.opacity = '1';
    setTimeout(() => badge.style.opacity = '0', 1000);
  });
}

/* =======================================================
   ১.২ টপ ন্যাভবার হ্যান্ডলার ও কম্পোনেন্ট
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
  // Clear notification dot indicator on heart
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

function renderTopNavbar() {
  const homeView = document.getElementById("homeView");
  if (!homeView) return;

  let topBar = homeView.querySelector(".top-bar");
  if (!topBar) {
    topBar = document.createElement("header");
    topBar.className = "top-bar bg-white dark:bg-black text-neutral-900 dark:text-white transition-colors duration-200";
    homeView.insertBefore(topBar, homeView.firstChild);
  }

  topBar.id = "topNavbarHeader";
  topBar.innerHTML = `
    <div class="logo" id="topNavLogo" title="Instagram" role="button" tabindex="0">Instagram</div>
    <div class="top-bar-actions">
      <button type="button" class="icon-btn top-nav-btn" id="topNavNotificationsBtn" title="Notifications" aria-label="Notifications">
        <i class="fa-regular fa-heart"></i>
      </button>
    </div>
  `;

  const logoElem = topBar.querySelector("#topNavLogo");
  if (logoElem) {
    logoElem.onclick = handleLogoClick;
  }

  const notifBtn = topBar.querySelector("#topNavNotificationsBtn");
  if (notifBtn) {
    notifBtn.onclick = handleNotificationsClick;
  }
}

function initTopNavbar() {
  renderTopNavbar();
}

if (typeof window !== "undefined") {
  window.handleLogoClick = handleLogoClick;
  window.handleDirectMessagesClick = handleDirectMessagesClick;
  window.handleNotificationsClick = handleNotificationsClick;
  window.closeNotificationsModal = closeNotificationsModal;
  window.renderTopNavbar = renderTopNavbar;
  window.initTopNavbar = initTopNavbar;
}

export {
  renderTopNavbar,
  initTopNavbar,
  handleLogoClick,
  handleNotificationsClick,
  handleDirectMessagesClick,
  closeNotificationsModal,
  toggleGlobalAudio,
  showGlobalSoundBadge,
  isGlobalAudioMuted
};

