// AccountSwitcher Component (Instagram Multi-Account Bottom Sheet & Switcher)
import { UserProfileStore, showInstagramToast } from "../utils/storage.js";
import { getCurrentUserId } from "../services/avatarService.js";
import { renderProfileGrid, updateProfilePostsCount } from "./Profile.js";
import { renderHomeFeed } from "./Feed.js";
import { loadReels } from "./ReelsViewer.js";

const STORAGE_KEY_SAVED_ACCOUNTS = "flashgram_saved_accounts";
const STORAGE_KEY_ACTIVE_ACCOUNT = "flashgram_active_account_id";

/**
 * Get all saved accounts from localStorage, seeded with active user if empty
 */
export function getSavedAccounts() {
  let accounts = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_ACCOUNTS);
    if (raw) {
      accounts = JSON.parse(raw);
    }
  } catch (_) {
    accounts = [];
  }

  const currentUid = getCurrentUserId();
  const currentUsername = UserProfileStore.state.username || "sohel_077";
  const currentName = UserProfileStore.state.name || "Sohel ✨";
  const currentAvatar = UserProfileStore.state.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400";
  const currentEmail = UserProfileStore.state.email || "";

  // Ensure current user is in saved accounts list
  const existingIdx = accounts.findIndex(a => a.id === currentUid || a.username === currentUsername);
  if (existingIdx === -1) {
    accounts.unshift({
      id: currentUid,
      username: currentUsername,
      name: currentName,
      avatar: currentAvatar,
      email: currentEmail,
      lastActive: Date.now()
    });
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(accounts));
    } catch (_) {}
  } else {
    // Keep current account details up to date
    accounts[existingIdx] = {
      ...accounts[existingIdx],
      username: currentUsername,
      name: currentName,
      avatar: currentAvatar,
      email: currentEmail || accounts[existingIdx].email,
      lastActive: Date.now()
    };
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(accounts));
    } catch (_) {}
  }

  return accounts;
}

/**
 * Add or update an account in multi-account storage
 */
export function addOrUpdateSavedAccount(account) {
  if (!account || (!account.id && !account.username)) return;
  const accounts = getSavedAccounts();
  const uid = account.id || ("user_" + account.username);
  const idx = accounts.findIndex(a => a.id === uid || a.username === account.username);

  const accObj = {
    id: uid,
    username: account.username || UserProfileStore.state.username || "user",
    name: account.name || account.displayName || UserProfileStore.state.name || "User",
    avatar: account.avatar || account.photoURL || UserProfileStore.state.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
    email: account.email || "",
    lastActive: Date.now()
  };

  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...accObj };
  } else {
    accounts.push(accObj);
  }

  try {
    localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(accounts));
    localStorage.setItem(STORAGE_KEY_ACTIVE_ACCOUNT, uid);
  } catch (_) {}

  return accObj;
}

/**
 * Switch active account immediately without full page reload
 */
export async function switchActiveAccount(targetAccountId) {
  const accounts = getSavedAccounts();
  const target = accounts.find(a => a.id === targetAccountId || a.username === targetAccountId);
  if (!target) return;

  // 1. Update localStorage active user & session
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ACCOUNT, target.id);
    localStorage.setItem("flashgram_authenticated", "true");
    localStorage.setItem("flashgram_user_session", JSON.stringify({
      uid: target.id,
      id: target.id,
      username: target.username,
      displayName: target.name,
      photoURL: target.avatar,
      email: target.email || "",
      loggedInAt: Date.now()
    }));
    localStorage.setItem("user_custom_avatar_data", target.avatar);
  } catch (_) {}

  // 2. Update UserProfileStore
  UserProfileStore.setState({
    username: target.username,
    name: target.name,
    avatar: target.avatar,
    email: target.email || ""
  });
  if (UserProfileStore.syncDOM) {
    UserProfileStore.syncDOM();
  }

  // 3. Update DOM avatars & text
  const navAvatar = document.querySelector(".nav-btn[data-id='profile'] img");
  if (navAvatar) navAvatar.src = target.avatar;

  const storyAvatar = document.getElementById("myStoryAvatarImg");
  if (storyAvatar) storyAvatar.src = target.avatar;

  const profileMainAvatar = document.getElementById("mainProfileAvatarImg");
  if (profileMainAvatar) profileMainAvatar.src = target.avatar;

  const profileHeaderUser = document.getElementById("profileHeaderUsername");
  if (profileHeaderUser) profileHeaderUser.textContent = target.username;

  const profileDisplayName = document.getElementById("profileDisplayName");
  if (profileDisplayName) profileDisplayName.textContent = target.name;

  const profileHandle = document.getElementById("profileHandleText");
  if (profileHandle) profileHandle.textContent = `@${target.username}`;

  // 4. Close the bottom sheet
  closeMultiAccountBottomSheet();

  // 5. Refresh profile grid & posts count strictly for new active user
  await renderProfileGrid();
  await updateProfilePostsCount();

  // 6. Refresh home feed & reels
  await renderHomeFeed();
  await loadReels();

  showInstagramToast(`Switched to @${target.username} ✨`);
}

/**
 * Slide up Multi-Account Bottom Sheet
 */
export function openMultiAccountBottomSheet() {
  let overlay = document.getElementById("multiAccountBottomSheetOverlay");
  if (!overlay) {
    overlay = createMultiAccountBottomSheetDOM();
    document.body.appendChild(overlay);
  }

  renderAccountsListInBottomSheet();

  overlay.style.display = "flex";
  // Force layout before adding animation classes
  requestAnimationFrame(() => {
    overlay.classList.add("active");
    const sheet = overlay.querySelector(".multi-account-sheet");
    if (sheet) {
      sheet.classList.remove("translate-y-full");
      sheet.classList.add("translate-y-0");
    }
  });
}

/**
 * Close Multi-Account Bottom Sheet
 */
export function closeMultiAccountBottomSheet() {
  const overlay = document.getElementById("multiAccountBottomSheetOverlay");
  if (!overlay) return;

  const sheet = overlay.querySelector(".multi-account-sheet");
  if (sheet) {
    sheet.classList.remove("translate-y-0");
    sheet.classList.add("translate-y-full");
  }
  overlay.classList.remove("active");

  setTimeout(() => {
    overlay.style.display = "none";
  }, 280);
}

/**
 * Action: Add Flashgram Account
 * Preserves current session and opens onboarding Sign-Up / Register modal
 */
export function openAddAccountFlow() {
  closeMultiAccountBottomSheet();

  // Flag that an account is being added so existing credentials aren't wiped
  try {
    sessionStorage.setItem("flashgram_adding_account", "true");
  } catch (_) {}

  if (typeof window.openAuthOnboardingFlow === "function") {
    window.openAuthOnboardingFlow(1);
  } else {
    const authOverlay = document.getElementById("authOnboardingOverlay");
    if (authOverlay) {
      authOverlay.classList.add("open");
    }
  }
}

/**
 * Render accounts list inside bottom sheet
 */
function renderAccountsListInBottomSheet() {
  const container = document.getElementById("multiAccountListContainer");
  if (!container) return;

  const accounts = getSavedAccounts();
  const currentUid = getCurrentUserId();
  const currentUsername = UserProfileStore.state.username || "sohel_077";

  container.innerHTML = accounts.map(account => {
    const isActive = account.id === currentUid || account.username === currentUsername;
    return `
      <div 
        class="multi-account-item flex items-center justify-between py-3 px-3 rounded-xl hover:bg-neutral-800/60 active:bg-neutral-800 transition-colors cursor-pointer select-none"
        onclick="switchActiveAccount('${account.id}')"
      >
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border border-neutral-700 bg-neutral-800">
            <img 
              src="${account.avatar}" 
              class="w-full h-full object-cover" 
              alt="${account.username}"
              crossorigin="anonymous"
              onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120';"
            />
          </div>
          <div class="min-w-0 text-left">
            <div class="font-semibold text-[15px] text-white truncate">${account.username}</div>
            <div class="text-[12px] text-neutral-400 truncate">${account.name || account.email || 'Flashgram Account'}</div>
          </div>
        </div>

        ${isActive ? `
          <div class="w-6 h-6 rounded-full bg-[#0095f6] flex items-center justify-center text-white text-[11px] shrink-0 ml-3 shadow-sm">
            <i class="fa-solid fa-check"></i>
          </div>
        ` : `
          <div class="w-6 h-6 rounded-full border border-neutral-600 flex items-center justify-center shrink-0 ml-3">
          </div>
        `}
      </div>
    `;
  }).join("");
}

/**
 * Create bottom sheet DOM elements
 */
function createMultiAccountBottomSheetDOM() {
  const overlay = document.createElement("div");
  overlay.id = "multiAccountBottomSheetOverlay";
  overlay.className = "fixed inset-0 z-[9999] flex flex-col justify-end bg-black/60 opacity-0 transition-opacity duration-300 pointer-events-none";
  overlay.style.display = "none";

  overlay.innerHTML = `
    <!-- Backdrop dismiss area -->
    <div class="flex-1 w-full" id="multiAccountBackdropDismiss"></div>

    <!-- Slide-up Modal Panel (Instagram dark theme) -->
    <div class="multi-account-sheet w-full max-w-[500px] mx-auto bg-[#1c1c1e] text-white rounded-t-[22px] px-4 pt-3 pb-8 shadow-2xl border-t border-neutral-800/80 transform translate-y-full transition-transform duration-300 ease-out select-none flex flex-col">
      <!-- Drag handle bar -->
      <div class="w-9 h-1 rounded-full bg-neutral-600 mx-auto mb-3.5 shrink-0"></div>

      <!-- Accounts List -->
      <div class="space-y-1 mb-2 max-h-[45vh] overflow-y-auto" id="multiAccountListContainer">
        <!-- Rendered dynamically -->
      </div>

      <!-- Divider line -->
      <div class="h-px bg-neutral-800/90 my-2 w-full"></div>

      <!-- Add Account Button (Instagram style) -->
      <button 
        type="button" 
        id="multiAccountAddBtn"
        onclick="openAddAccountFlow()"
        class="w-full flex items-center gap-3.5 py-3 px-3 rounded-xl hover:bg-neutral-800/60 active:bg-neutral-800 text-left transition-colors cursor-pointer"
      >
        <div class="w-10 h-10 rounded-full border border-neutral-700 bg-neutral-800/90 flex items-center justify-center text-neutral-200 shrink-0">
          <i class="fa-solid fa-plus text-sm"></i>
        </div>
        <span class="font-medium text-[15px] text-neutral-100">Add Flashgram account</span>
      </button>
    </div>
  `;

  // Attach backdrop dismiss
  overlay.addEventListener("click", (e) => {
    if (e.target.id === "multiAccountBackdropDismiss" || e.target === overlay) {
      closeMultiAccountBottomSheet();
    }
  });

  return overlay;
}

/**
 * Setup Profile Icon Long-Press trigger on Bottom Nav Bar
 */
export function setupProfileIconLongPress(profileBtn) {
  if (!profileBtn) return;

  let longPressTimer = null;
  let isLongPress = false;
  let startX = 0;
  let startY = 0;

  const startTimer = (e) => {
    isLongPress = false;
    const touch = e.touches ? e.touches[0] : e;
    startX = touch.clientX;
    startY = touch.clientY;

    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      isLongPress = true;
      if (navigator.vibrate) {
        try { navigator.vibrate(40); } catch (_) {}
      }
      openMultiAccountBottomSheet();
    }, 500);
  };

  const cancelTimer = () => {
    clearTimeout(longPressTimer);
  };

  const handleMove = (e) => {
    const touch = e.touches ? e.touches[0] : e;
    const dx = Math.abs(touch.clientX - startX);
    const dy = Math.abs(touch.clientY - startY);
    if (dx > 10 || dy > 10) {
      cancelTimer();
    }
  };

  // Touch Events
  profileBtn.addEventListener("touchstart", startTimer, { passive: true });
  profileBtn.addEventListener("touchmove", handleMove, { passive: true });
  profileBtn.addEventListener("touchend", cancelTimer, { passive: true });
  profileBtn.addEventListener("touchcancel", cancelTimer, { passive: true });

  // Mouse Events
  profileBtn.addEventListener("mousedown", startTimer);
  profileBtn.addEventListener("mousemove", handleMove);
  profileBtn.addEventListener("mouseup", cancelTimer);
  profileBtn.addEventListener("mouseleave", cancelTimer);

  // Prevent browser context menu on profile button & trigger bottom sheet
  profileBtn.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openMultiAccountBottomSheet();
  });

  // Intercept click: If long-press was triggered, prevent standard navigation
  const originalClick = profileBtn.onclick;
  profileBtn.onclick = (e) => {
    if (isLongPress) {
      e.preventDefault();
      e.stopPropagation();
      isLongPress = false;
      return;
    }
    if (typeof originalClick === "function") {
      originalClick.call(profileBtn, e);
    }
  };
}

/**
 * Initialize Account Switcher module and inject CSS
 */
export function initAccountSwitcher() {
  // Inject CSS rules for the bottom sheet
  if (!document.getElementById("multiAccountSheetStyles")) {
    const style = document.createElement("style");
    style.id = "multiAccountSheetStyles";
    style.textContent = `
      #multiAccountBottomSheetOverlay.active {
        opacity: 1 !important;
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Pre-seed accounts list
  getSavedAccounts();

  // Bind to bottom navbar profile icon
  const attachToProfileBtn = () => {
    const profileBtn = document.querySelector(".nav-btn[data-id='profile']");
    if (profileBtn) {
      setupProfileIconLongPress(profileBtn);
    }
  };

  attachToProfileBtn();
  setTimeout(attachToProfileBtn, 150);
  setTimeout(attachToProfileBtn, 600);
}

// Global exposure
if (typeof window !== "undefined") {
  window.openMultiAccountBottomSheet = openMultiAccountBottomSheet;
  window.closeMultiAccountBottomSheet = closeMultiAccountBottomSheet;
  window.switchActiveAccount = switchActiveAccount;
  window.openAddAccountFlow = openAddAccountFlow;
  window.getSavedAccounts = getSavedAccounts;
  window.addOrUpdateSavedAccount = addOrUpdateSavedAccount;
  window.setupProfileIconLongPress = setupProfileIconLongPress;
}
