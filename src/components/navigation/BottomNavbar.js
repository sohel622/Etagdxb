// BottomNavbar Component (Modular Bottom Navigation Bar, Active Pill, Tab Switcher & Gestures)
import { DEFAULT_NAV } from "../../utils/mockData.js";
import { UserProfileStore } from "../../utils/storage.js";
import { setupProfileIconLongPress } from "../AccountSwitcher.js";
import { updateChatNavUnreadBadge } from "../../services/chatService.js";
import { updateStatusBar, isAppDarkMode } from "../../services/statusBarService.js";

let currentNav = [...DEFAULT_NAV];
try {
  const savedNav = localStorage.getItem("nav_order");
  if (savedNav) {
    const parsed = JSON.parse(savedNav);
    if (Array.isArray(parsed) && parsed.length >= 4) {
      currentNav = parsed;
    }
  }
} catch (e) {
  console.warn("Could not parse nav_order:", e);
  currentNav = [...DEFAULT_NAV];
}

// Guarantee all 5 essential navigation tabs (home, reels, search, messages, profile) are present
const requiredNavIds = ["home", "reels", "search", "messages", "profile"];
const hasAll = requiredNavIds.every(id => currentNav.some(item => item.id === id));
if (!hasAll || currentNav.length !== 5) {
  currentNav = [...DEFAULT_NAV];
} else {
  currentNav = DEFAULT_NAV.map(d => {
    const match = currentNav.find(item => item.id === d.id);
    return {
      ...d,
      ...(match || {}),
      icon: d.icon,
      name: d.name,
      label: d.label,
      isProfile: d.isProfile
    };
  });
}

let activeNavId = "home";
if (typeof window !== "undefined") {
  window.activeNavId = activeNavId;
}

const navButtonsContainer = document.getElementById("navButtonsContainer");
const bottomNavBar = document.getElementById("bottomNavBar");
const homeView = document.getElementById("homeView");
const reelsView = document.getElementById("reelsView");
const profileView = document.getElementById("profileView");
const appContainer = document.getElementById("appContainer");

let pressTimer = null;
let isLongPressTriggered = false;
let pressStartX = 0;
let pressStartY = 0;

function startNavPressTimer(clientX, clientY) {
  isLongPressTriggered = false;
  pressStartX = clientX;
  pressStartY = clientY;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    isLongPressTriggered = true;
    if (typeof openSettingsModal === "function") {
      openSettingsModal();
    } else if (typeof window !== "undefined" && typeof window.openSettingsModal === "function") {
      window.openSettingsModal();
    }
  }, 550);
}

function cancelNavPressTimer() {
  clearTimeout(pressTimer);
}

function checkNavPressMove(clientX, clientY) {
  const dx = Math.abs(clientX - pressStartX);
  const dy = Math.abs(clientY - pressStartY);
  if (dx > 12 || dy > 12) {
    cancelNavPressTimer();
  }
}

function updateActivePillPosition(btnElement) {
  const activePill = document.getElementById("navActivePill");
  const navBar = document.getElementById("bottomNavBar") || bottomNavBar;
  if (!activePill || !btnElement) return;
  if (!navBar || !navBar.classList.contains("liquid-glass-mode")) {
    activePill.style.opacity = "0";
    return;
  }
  activePill.style.opacity = "1";
  const left = btnElement.offsetLeft + 4;
  const width = Math.max(btnElement.offsetWidth - 8, 36);
  activePill.style.transform = `translateX(${left}px)`;
  activePill.style.width = `${width}px`;
}

function renderNavBtnContent(item, isActive) {
  if (item.isProfile || item.id === "profile") {
    // Icon 5 (Profile): Rounded user avatar matching exact size (24px x 24px) of adjacent icons with a subtle border
    return `
      <div class="profile-nav-circle ${isActive ? 'active-profile' : ''}">
        <img class="current-user-avatar" src="${UserProfileStore.state.avatar}" alt="Profile" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';" />
      </div>
    `;
  }

  if (item.id === "home") {
    // Icon 1 (Home): Clean, crisp Instagram-style solid house silhouette icon (24px x 24px)
    return `
      <svg class="nav-icon home-icon w-[24px] h-[24px] shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.099a1.25 1.25 0 0 0-.82.316L2.94 9.493a1.25 1.25 0 0 0-.44.954V20a1.75 1.75 0 0 0 1.75 1.75h4.5a.75.75 0 0 0 .75-.75v-4.75a1.25 1.25 0 0 1 1.25-1.25h2.5a1.25 1.25 0 0 1 1.25 1.25V21c0 .414.336.75.75.75h4.5A1.75 1.75 0 0 0 21.5 20v-9.553a1.25 1.25 0 0 0-.44-.954l-8.24-7.078a1.25 1.25 0 0 0-.82-.316z"/>
      </svg>
    `;
  }

  if (item.id === "reels") {
    // Icon 2 (Reels): Standard reels play square icon (24px x 24px)
    return `
      <svg class="nav-icon reels-icon w-[24px] h-[24px] shrink-0" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="currentColor"/>
      </svg>
    `;
  }

  if (item.id === "search") {
    // Icon 3 (Search): Minimalist magnifying glass icon (24px x 24px)
    return `
      <svg class="nav-icon search-icon w-[24px] h-[24px] shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="10.5" cy="10.5" r="6.8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15.5 15.5L20.5 20.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  if (item.id === "messages") {
    // Icon 4 (Chat): Crisp messaging speech bubble icon with unread badge
    return `
      <div class="relative flex items-center justify-center">
        <svg class="nav-icon messages-icon w-[24px] h-[24px] shrink-0" viewBox="0 0 24 24" fill="none">
          <path d="M4.5 4.5h15a2.5 2.5 0 0 1 2.5 2.5v7.5a2.5 2.5 0 0 1-2.5 2.5H8.2l-3.8 3.5c-.5.4-1.2.1-1.2-.6v-2.9h-.2A2.5 2.5 0 0 1 2 14.5V7a2.5 2.5 0 0 1 2.5-2.5z" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="7.2" y1="8.8" x2="16.8" y2="8.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="7.2" y1="12.6" x2="16.8" y2="12.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span id="chatNavUnreadBadge" class="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 bg-[#ff3040] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none shadow-xs border-[1.5px] border-white dark:border-black pointer-events-none transition-transform" style="display: none;">0</span>
      </div>
    `;
  }

  return `<i class="${item.icon}"></i>`;
}

function renderNavigation() {
  const container = document.getElementById("navButtonsContainer") || navButtonsContainer;
  if (!container) return;
  container.innerHTML = "";

  currentNav.forEach(item => {
    const isActive = item.id === activeNavId;
    const btn = document.createElement("div");
    btn.className = `nav-btn ${isActive ? 'active' : ''}`;
    btn.dataset.id = item.id;
    btn.setAttribute("title", item.name);
    btn.innerHTML = renderNavBtnContent(item, isActive);
    
    btn.onclick = (e) => {
      if (isLongPressTriggered) {
        e.preventDefault();
        e.stopPropagation();
        setTimeout(() => { isLongPressTriggered = false; }, 80);
        return;
      }
      e.stopPropagation();
      const routeMap = {
        home: "/",
        reels: "/reels",
        messages: "/messages",
        search: "/search",
        profile: "/profile"
      };

      if (item.id === "profile") {
        if (typeof closeUserProfile === "function") {
          closeUserProfile();
        } else if (typeof window !== "undefined" && typeof window.closeUserProfile === "function") {
          window.closeUserProfile();
        }
      }

      if (routeMap[item.id]) {
        navigate(routeMap[item.id]);
      } else {
        switchTab(item.id, btn);
      }
    };

    if (item.id === "profile" || item.isProfile) {
      setupProfileIconLongPress(btn);
    }

    container.appendChild(btn);
  });

  requestAnimationFrame(() => {
    const activeBtn = document.querySelector('.nav-btn.active') || document.querySelector('.nav-btn');
    if (activeBtn) updateActivePillPosition(activeBtn);
    if (typeof updateChatNavUnreadBadge === "function") updateChatNavUnreadBadge();
  });
}

export function setReelsActiveState(isActive) {
  window.__isReelsActive = Boolean(isActive);
  if (isActive) {
    updateStatusBar("reels");
  } else if (activeNavId && activeNavId !== "reels") {
    updateStatusBar(activeNavId);
  }
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("reelsActiveStateChange", { detail: { isActive: Boolean(isActive) } }));
    } catch (_) {}
  }
  if (window.NativeReelsBridge) {
    try {
      if (typeof window.NativeReelsBridge.setStatusBarTheme === "function") {
        window.NativeReelsBridge.setStatusBarTheme(Boolean(isActive), Boolean(isAppDarkMode()));
      }
      if (typeof window.NativeReelsBridge.setReelsActive === "function") {
        window.NativeReelsBridge.setReelsActive(Boolean(isActive));
      }
    } catch (_) {}
  }
}

if (typeof window !== "undefined") {
  window.setReelsActiveState = setReelsActiveState;
}

function navigate(route) {
  try {
    window.history.pushState({ route }, "", route);
  } catch (_) {}

  if (route.startsWith("/reel/") || route.startsWith("/reels/")) {
    setReelsActiveState(true);
    const reelId = route.replace(/^\/reels?\//, '').split('?')[0].split('#')[0];
    if (reelId && typeof window.navigateToReel === "function") {
      window.navigateToReel(reelId);
      return;
    } else {
      switchTab("reels");
      return;
    }
  }

  if (route === "/reels") {
    setReelsActiveState(true);
  } else {
    setReelsActiveState(false);
  }

  if (route === "/" || route === "/home") {
    switchTab("home");
  } else if (route === "/reels") {
    switchTab("reels");
  } else if (route === "/messages") {
    switchTab("messages");
  } else if (route === "/search") {
    switchTab("search");
  } else if (route === "/profile") {
    switchTab("profile");
  }
}

if (typeof window !== "undefined") {
  window.navigate = navigate;
  window.addEventListener("popstate", () => {
    const path = window.location.pathname;
    if (path.startsWith("/reel/") || path.startsWith("/reels/")) {
      setReelsActiveState(true);
      const reelId = path.replace(/^\/reels?\//, '').split('?')[0].split('#')[0];
      if (reelId && typeof window.navigateToReel === "function") {
        window.navigateToReel(reelId);
      } else {
        switchTab("reels");
      }
    } else if (path === "/reels") {
      setReelsActiveState(true);
      switchTab("reels");
    } else {
      setReelsActiveState(false);
      if (path === "/messages") switchTab("messages");
      else if (path === "/search") switchTab("search");
      else if (path === "/profile") switchTab("profile");
      else switchTab("home");
    }
  });
}

function hideStandardNavBar() {
  const navBar = document.getElementById("bottomNavBar") || bottomNavBar;
  if (!navBar || navBar.classList.contains("liquid-glass-mode")) return;
  navBar.classList.remove("translate-y-0");
  navBar.classList.add("nav-hidden", "translate-y-full", "opacity-0");
}

function showStandardNavBar() {
  const navBar = document.getElementById("bottomNavBar") || bottomNavBar;
  if (!navBar) return;
  navBar.classList.remove("nav-hidden", "translate-y-full", "opacity-0");
  navBar.classList.add("translate-y-0");
}

let lastHomeScrollTop = 0;
let homeScrollTicking = false;
const HOME_SCROLL_THRESHOLD = 8;

function handleHomeFeedScroll() {
  const hView = document.getElementById("homeView") || homeView;
  const navBar = document.getElementById("bottomNavBar") || bottomNavBar;
  if (!hView || !hView.classList.contains("active")) return;
  if (navBar && navBar.classList.contains("liquid-glass-mode")) return;

  const currentScrollTop = hView.scrollTop;

  // Always restore navigation bar when near the top of the feed
  if (currentScrollTop <= 15) {
    showStandardNavBar();
    lastHomeScrollTop = Math.max(0, currentScrollTop);
    homeScrollTicking = false;
    return;
  }

  const deltaY = currentScrollTop - lastHomeScrollTop;

  if (Math.abs(deltaY) >= HOME_SCROLL_THRESHOLD) {
    if (deltaY > 0) {
      // Scrolling DOWN: smoothly translate the standard bottom navigation bar downwards off-screen
      hideStandardNavBar();
    } else {
      // Scrolling UP: smoothly slide the bottom navigation bar back up into view
      showStandardNavBar();
    }
    lastHomeScrollTop = currentScrollTop;
  }

  homeScrollTicking = false;
}

if (typeof window !== "undefined") {
  const hView = document.getElementById("homeView");
  if (hView) {
    hView.addEventListener("scroll", () => {
      if (!homeScrollTicking) {
        window.requestAnimationFrame(handleHomeFeedScroll);
        homeScrollTicking = true;
      }
    }, { passive: true });
  }
}

/* Automatic Dark / Light Mode System */
function applyCurrentDynamicTheme() {
  const hView = document.getElementById("homeView") || homeView;
  const pView = document.getElementById("profileView") || profileView;
  const rView = document.getElementById("reelsView") || reelsView;
  const appC = document.getElementById("appContainer") || appContainer;
  const isNightTime = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (isNightTime) {
    if (hView) hView.classList.add("dark");
    if (pView) pView.classList.add("dark");
    if (appC) {
      appC.classList.add("dark");
      appC.classList.add("dark-mode-active");
    }
  } else {
    if (hView) hView.classList.remove("dark");
    if (pView) pView.classList.remove("dark");
    if (appC) {
      appC.classList.remove("dark");
      if (rView && !rView.classList.contains("active")) {
        appC.classList.remove("dark-mode-active");
      }
    }
  }
  if (activeNavId !== "reels") {
    updateStatusBar(activeNavId);
  }
}

if (typeof window !== "undefined") {
  const systemNightModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  if (systemNightModeQuery) {
    if (systemNightModeQuery.addEventListener) {
      systemNightModeQuery.addEventListener("change", applyCurrentDynamicTheme);
    } else if (systemNightModeQuery.addListener) {
      systemNightModeQuery.addListener(applyCurrentDynamicTheme);
    }
  }
  applyCurrentDynamicTheme();
}

function switchTab(tabId, btnElement) {
  activeNavId = tabId;
  if (typeof window !== "undefined") {
    window.activeNavId = tabId;
    window.switchTab = switchTab;
    try {
      window.dispatchEvent(new CustomEvent("routeChange", { detail: { tab: tabId, route: `/${tabId}` } }));
    } catch (_) {}
  }
  updateStatusBar(tabId);
  showStandardNavBar();
  const hView = document.getElementById("homeView") || homeView;
  const rView = document.getElementById("reelsView") || reelsView;
  const pView = document.getElementById("profileView") || profileView;
  const appC = document.getElementById("appContainer") || appContainer;
  const navBar = document.getElementById("bottomNavBar") || bottomNavBar;
  const rProgressBarContainer = document.getElementById("reelsProgressBarContainer");

  lastHomeScrollTop = hView ? hView.scrollTop : 0;
  document.querySelectorAll(".nav-btn").forEach(b => {
    const bId = b.dataset.id;
    const isCurrent = bId === tabId;
    b.classList.toggle("active", isCurrent);
    const match = currentNav.find(item => item.id === bId) || { id: bId };
    b.innerHTML = renderNavBtnContent(match, isCurrent);
  });
  if (!btnElement) {
    btnElement = document.querySelector(`.nav-btn[data-id="${tabId}"]`);
  }
  if (btnElement) {
    btnElement.classList.add("active");
    updateActivePillPosition(btnElement);
  }

  const isViewingOtherUserProfile = tabId === "profile" && Boolean(
    (typeof window !== "undefined" && window.viewingProfileUserId)
  );

  // Hide Bottom Navigation Bar entirely when inside Conversations/Chat view or viewing another user's public profile
  if (tabId === "messages" || isViewingOtherUserProfile) {
    if (navBar) {
      navBar.style.display = "none";
      navBar.classList.add("nav-hidden", "translate-y-full", "opacity-0");
    }
    if (appC && tabId === "messages") {
      appC.classList.add("in-chats-view");
    }
  } else {
    if (appC) {
      appC.classList.remove("in-chats-view");
      appC.classList.remove("in-active-chat");
    }
    if (navBar) {
      navBar.style.display = "";
      navBar.classList.remove("nav-hidden", "translate-y-full", "opacity-0");
      navBar.classList.add("translate-y-0");
    }
  }

  const chatsView = document.getElementById("chatsView");
  if (chatsView && tabId !== "messages") {
    chatsView.classList.remove("active");
    chatsView.style.display = "none";
  }

  if (tabId === "reels") {
    setReelsActiveState(true);
    if (typeof pauseAllHomeVideos === "function") pauseAllHomeVideos();
    if (hView) hView.classList.remove("active");
    if (pView) pView.classList.remove("active");
    if (rView) rView.classList.add("active");
    if (appC) {
      appC.classList.add("dark-mode-active");
      appC.classList.add("reels-active");
    }
    if (rProgressBarContainer) {
      rProgressBarContainer.classList.add("visible");
    }
    if (typeof playCurrentReel === "function") playCurrentReel();
  } else {
    setReelsActiveState(false);
    if (typeof setActiveClearModeReelId === "function") {
      setActiveClearModeReelId(null);
    } else if (typeof disableReelsClearMode === "function") {
      disableReelsClearMode();
    } else if (typeof window !== "undefined" && typeof window.setActiveClearModeReelId === "function") {
      window.setActiveClearModeReelId(null);
    }
    if (typeof closeReelsCommentsSheet === "function") {
      closeReelsCommentsSheet();
    } else if (typeof window !== "undefined" && typeof window.closeReelsCommentsSheet === "function") {
      window.closeReelsCommentsSheet();
    }
    if (appC) appC.classList.remove("reels-active");
    if (rProgressBarContainer) {
      rProgressBarContainer.classList.remove("visible");
    }
    if (typeof pauseAllReels === "function") pauseAllReels();
    if (typeof resetVideoProgressBar === "function") resetVideoProgressBar();

    const chatsView = document.getElementById("chatsView");
    if (chatsView && tabId !== "messages") {
      chatsView.classList.remove("active");
      chatsView.style.display = "none";
    }

    if (tabId === "home") {
      if (rView) rView.classList.remove("active");
      if (pView) pView.classList.remove("active");
      if (hView) hView.classList.add("active");
      applyCurrentDynamicTheme();
      if (typeof setupHomeFeedObserver === "function") {
        setupHomeFeedObserver();
      } else if (typeof window !== "undefined" && typeof window.setupHomeFeedObserver === "function") {
        window.setupHomeFeedObserver();
      }
    } else if (tabId === "profile") {
      if (typeof pauseAllHomeVideos === "function") pauseAllHomeVideos();
      if (hView) hView.classList.remove("active");
      if (rView) rView.classList.remove("active");
      if (pView) pView.classList.add("active");
      applyCurrentDynamicTheme();

      // Requirement 5: Reset any other profile view and strictly sync logged-in user's profile
      if (typeof window.closeUserProfile === "function") {
        window.closeUserProfile();
      }
      if (typeof window.syncCurrentLoggedInUserProfile === "function") {
        window.syncCurrentLoggedInUserProfile();
      } else if (typeof renderProfileGrid === "function") {
        renderProfileGrid();
      }
    } else if (tabId === "messages") {
      if (typeof pauseAllHomeVideos === "function") pauseAllHomeVideos();
      if (hView) hView.classList.remove("active");
      if (rView) rView.classList.remove("active");
      if (pView) pView.classList.remove("active");
      if (chatsView) {
        chatsView.classList.add("active");
        chatsView.style.display = "flex";
        chatsView.style.flexDirection = "column";
        const listC = document.getElementById("chatsListContainer");
        const chatC = document.getElementById("shabnamChatContainer");
        if (listC) listC.style.display = "flex";
        if (chatC) chatC.style.display = "none";
        if (typeof renderChatsList === "function") renderChatsList();
      }
      applyCurrentDynamicTheme();
    } else {
      if (rView) rView.classList.remove("active");
      if (pView) pView.classList.remove("active");
      if (hView) hView.classList.add("active");
      applyCurrentDynamicTheme();
    }
  }
    
  if (tabId === "search") {
    if (typeof showInstagramToast === "function") {
      showInstagramToast("Explore & Search 🔍");
    }
  }
}

/* =======================================================
   ৬. কাস্টমাইজেশন প্যানেল: ড্র্যাগ অ্যান্ড ড্রপ
======================================================= */
function renderDragBox() {
  const dragListBox = document.getElementById("dragListBox");
  if (!dragListBox) return;
  dragListBox.innerHTML = "";

  currentNav.forEach((item, index) => {
    const dragItem = document.createElement("div");
    dragItem.className = "drag-icon-item";
    dragItem.draggable = true;
    dragItem.dataset.index = index;
    dragItem.title = item.label || item.name;

    dragItem.innerHTML = `
      ${item.isProfile ? `<i class="fa-regular fa-circle-user"></i>` : (item.id === "messages" ? `<i class="fa-regular fa-comment-dots"></i>` : `<i class="${item.icon}"></i>`)}
      <span class="drag-item-label">${item.label || item.name}</span>
    `;

    dragItem.ondragstart = (e) => {
      dragItem.classList.add("dragging");
      e.dataTransfer.setData("text/plain", index);
    };

    dragItem.ondragend = () => dragItem.classList.remove("dragging");
    dragItem.ondragover = (e) => e.preventDefault();

    dragItem.ondrop = (e) => {
      e.preventDefault();
      const from = parseInt(e.dataTransfer.getData("text/plain"));
      if (isNaN(from) || from === index) return;
      const moved = currentNav.splice(from, 1)[0];
      currentNav.splice(index, 0, moved);
      localStorage.setItem("nav_order", JSON.stringify(currentNav));
      renderDragBox();
      renderNavigation();
    };

    dragListBox.appendChild(dragItem);
  });
}

if (typeof window !== "undefined") {
  const resetBtn = document.getElementById("resetOrderBtn");
  if (resetBtn) {
    resetBtn.onclick = () => {
      currentNav = [...DEFAULT_NAV];
      localStorage.setItem("nav_order", JSON.stringify(currentNav));
      renderDragBox();
      renderNavigation();
      alert("Navigation order reset to default");
    };
  }
}

/* =======================================================
   ৭. সোয়াইপ জেসচার (Swipe Gestures)
======================================================= */
let touchStartX = 0;
let touchStartY = 0;

if (typeof window !== "undefined") {
  const appC = document.getElementById("appContainer");
  if (appC) {
    appC.addEventListener("touchstart", (e) => {
      if (e.target.closest("#bottomNavBar") || e.target.closest("#settingsOverlay")) return;
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    appC.addEventListener("touchend", (e) => {
      const diffX = e.changedTouches[0].screenX - touchStartX;
      const diffY = e.changedTouches[0].screenY - touchStartY;
      const rView = document.getElementById("reelsView");
      const hView = document.getElementById("homeView");

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 60) {
        if (diffX > 0 && rView && rView.classList.contains("active")) {
          const homeBtn = document.querySelector('.nav-btn[data-id="home"]');
          switchTab("home", homeBtn);
        } else if (diffX < 0 && hView && hView.classList.contains("active")) {
          const reelsBtn = document.querySelector('.nav-btn[data-id="reels"]');
          switchTab("reels", reelsBtn);
        }
      }
    }, { passive: true });
  }
}

if (typeof window !== "undefined") {
  window.renderNavigation = renderNavigation;
  window.updateActivePillPosition = updateActivePillPosition;
  window.switchTab = switchTab;
  window.hideStandardNavBar = hideStandardNavBar;
  window.showStandardNavBar = showStandardNavBar;
  window.handleHomeFeedScroll = handleHomeFeedScroll;
  window.applyCurrentDynamicTheme = applyCurrentDynamicTheme;
  window.renderDragBox = renderDragBox;
  window.startNavPressTimer = startNavPressTimer;
  window.cancelNavPressTimer = cancelNavPressTimer;
  window.checkNavPressMove = checkNavPressMove;
}

export {
  navigate,
  renderNavigation,
  renderNavBtnContent,
  updateActivePillPosition,
  switchTab,
  hideStandardNavBar,
  showStandardNavBar,
  handleHomeFeedScroll,
  applyCurrentDynamicTheme,
  renderDragBox,
  startNavPressTimer,
  cancelNavPressTimer,
  checkNavPressMove,
  activeNavId
};
