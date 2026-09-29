// BottomNavigation Component (Navigation Bar, Active Pill, Tab Switcher & Customizer)
import { DEFAULT_NAV } from "../utils/mockData.js";
import { UserProfileStore } from "../utils/storage.js";

    let currentNav = [...DEFAULT_NAV];
    try {
      const savedNav = localStorage.getItem("nav_order");
      if (savedNav) {
        const parsed = JSON.parse(savedNav);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentNav = parsed;
        }
      }
    } catch (e) {
      console.warn("Could not parse nav_order:", e);
      currentNav = [...DEFAULT_NAV];
    }
    // Normalize labels in case old saved data didn't have label property
    currentNav = currentNav.map(item => {
      const match = DEFAULT_NAV.find(d => d.id === item.id);
      return {
        ...item,
        label: item.label || (match ? match.label : item.name)
      };
    });
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
        openSettingsModal();
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
      if (!activePill || !btnElement) return;
      if (!bottomNavBar.classList.contains("liquid-glass-mode")) {
        activePill.style.opacity = "0";
        return;
      }
      activePill.style.opacity = "1";
      const left = btnElement.offsetLeft + 4;
      const width = Math.max(btnElement.offsetWidth - 8, 36);
      activePill.style.transform = `translateX(${left}px)`;
      activePill.style.width = `${width}px`;
    }

    function renderNavigation() {
      navButtonsContainer.innerHTML = "";
      currentNav.forEach(item => {
        const btn = document.createElement("div");
        btn.className = `nav-btn ${item.id === activeNavId ? 'active' : ''}`;
        btn.dataset.id = item.id;
        btn.setAttribute("title", item.name);
        
        if (item.isProfile) {
          btn.innerHTML = `
            <div class="profile-nav-circle">
              <img class="current-user-avatar" src="${UserProfileStore.state.avatar}" alt="Profile" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
              <i class="fa-solid fa-user user-icon" style="display:none;"></i>
            </div>
          `;
        } else {
          btn.innerHTML = `<i class="${item.icon}"></i>`;
        }
        
        btn.onclick = (e) => {
          if (isLongPressTriggered) {
            e.preventDefault();
            e.stopPropagation();
            setTimeout(() => { isLongPressTriggered = false; }, 80);
            return;
          }
          e.stopPropagation();
          if (item.id === "profile") {
            closeUserProfile();
            try {
              window.history.pushState({ tab: "profile" }, "", "/profile");
            } catch (_) {}
          }
          switchTab(item.id, btn);
        };

        navButtonsContainer.appendChild(btn);
      });

      requestAnimationFrame(() => {
        const activeBtn = document.querySelector('.nav-btn.active') || document.querySelector('.nav-btn');
        if (activeBtn) updateActivePillPosition(activeBtn);
      });
    }

    function hideStandardNavBar() {
      if (!bottomNavBar || bottomNavBar.classList.contains("liquid-glass-mode")) return;
      bottomNavBar.classList.remove("translate-y-0");
      bottomNavBar.classList.add("nav-hidden", "translate-y-full", "opacity-0");
    }

    function showStandardNavBar() {
      if (!bottomNavBar) return;
      bottomNavBar.classList.remove("nav-hidden", "translate-y-full", "opacity-0");
      bottomNavBar.classList.add("translate-y-0");
    }

    let lastHomeScrollTop = 0;
    let homeScrollTicking = false;
    const HOME_SCROLL_THRESHOLD = 8;

    function handleHomeFeedScroll() {
      if (!homeView || !homeView.classList.contains("active")) return;
      if (bottomNavBar.classList.contains("liquid-glass-mode")) return;

      const currentScrollTop = homeView.scrollTop;

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

    if (homeView) {
      homeView.addEventListener("scroll", () => {
        if (!homeScrollTicking) {
          window.requestAnimationFrame(handleHomeFeedScroll);
          homeScrollTicking = true;
        }
      }, { passive: true });
    }

    /* Automatic Dark / Light Mode System (No Manual Toggle Button) */
    function applyCurrentDynamicTheme() {
      const isNight = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (isNight) {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
        if (appContainer) {
          appContainer.classList.add("dark", "dark-mode-active");
        }
      } else {
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("dark");
        if (appContainer) {
          appContainer.classList.remove("dark");
          // If not currently watching reels (which has its own native dark video player), remove dark-mode-active
          if (!reelsView || !reelsView.classList.contains("active")) {
            appContainer.classList.remove("dark-mode-active");
          }
        }
      }
    }

    const systemNightModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    if (systemNightModeQuery) {
      if (systemNightModeQuery.addEventListener) {
        systemNightModeQuery.addEventListener("change", applyCurrentDynamicTheme);
      } else if (systemNightModeQuery.addListener) {
        systemNightModeQuery.addListener(applyCurrentDynamicTheme);
      }
    }
    // Apply dynamic theme immediately on startup
    applyCurrentDynamicTheme();

    function switchTab(tabId, btnElement) {
      activeNavId = tabId;
      if (typeof window !== "undefined") {
        window.activeNavId = tabId;
        window.switchTab = switchTab;
      }
      showStandardNavBar();
      lastHomeScrollTop = homeView ? homeView.scrollTop : 0;
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      if (!btnElement) {
        btnElement = document.querySelector(`.nav-btn[data-id="${tabId}"]`);
      }
      if (btnElement) {
        btnElement.classList.add("active");
        updateActivePillPosition(btnElement);
      }

      if (tabId === "messages") {
        if (bottomNavBar) {
          bottomNavBar.style.display = "none";
          bottomNavBar.classList.add("nav-hidden", "translate-y-full", "opacity-0");
        }
        if (appContainer) {
          appContainer.classList.add("in-chats-view");
        }
      } else {
        if (appContainer) {
          appContainer.classList.remove("in-chats-view");
        }
        if (bottomNavBar) {
          bottomNavBar.style.display = "";
          bottomNavBar.classList.remove("nav-hidden", "translate-y-full", "opacity-0");
        }
      }

      if (tabId === "reels") {
        pauseAllHomeVideos();
        homeView.classList.remove("active");
        if (profileView) profileView.classList.remove("active");
        reelsView.classList.add("active");
        appContainer.classList.add("dark-mode-active");
        appContainer.classList.add("reels-active");
        if (reelsProgressBarContainer) {
          reelsProgressBarContainer.classList.add("visible");
        }
        playCurrentReel();
      } else {
        appContainer.classList.remove("reels-active");
        if (reelsProgressBarContainer) {
          reelsProgressBarContainer.classList.remove("visible");
        }
        pauseAllReels();
        resetVideoProgressBar();

        const chatsView = document.getElementById("chatsView");
        if (chatsView && tabId !== "messages") {
          chatsView.classList.remove("active");
          chatsView.style.display = "none";
        }

        if (tabId === "home") {
          reelsView.classList.remove("active");
          if (profileView) profileView.classList.remove("active");
          homeView.classList.add("active");
          applyCurrentDynamicTheme();
          // Resume visible home video
          const visibleHomeVid = homeView.querySelector(".feed-post-card video");
          if (visibleHomeVid) {
            visibleHomeVid.play().catch(() => {});
          }
        } else if (tabId === "profile") {
          pauseAllHomeVideos();
          homeView.classList.remove("active");
          reelsView.classList.remove("active");
          if (profileView) profileView.classList.add("active");
          applyCurrentDynamicTheme();
          renderProfileGrid();
        } else if (tabId === "messages") {
          pauseAllHomeVideos();
          homeView.classList.remove("active");
          reelsView.classList.remove("active");
          if (profileView) profileView.classList.remove("active");
          if (chatsView) {
            chatsView.classList.add("active");
            chatsView.style.display = "flex";
            chatsView.style.flexDirection = "column";
            renderChatsList();
          }
          applyCurrentDynamicTheme();
        } else {
          reelsView.classList.remove("active");
          if (profileView) profileView.classList.remove("active");
          homeView.classList.add("active");
          applyCurrentDynamicTheme();
        }
      }
        
      const labelMap = {
        search: "Explore & Search"
      };
      if (labelMap[tabId]) {
        alert(labelMap[tabId]);
      }
    }



    /* =======================================================
       ৪. ড্র্যাগ অ্যান্ড ড্রপ
    ======================================================= */
    const dragListBox = document.getElementById("dragListBox");

    function renderDragBox() {
      dragListBox.innerHTML = "";
      currentNav.forEach((item, index) => {
        const dragItem = document.createElement("div");
        dragItem.className = "drag-icon-item";
        dragItem.draggable = true;
        dragItem.dataset.index = index;
        dragItem.title = item.label || item.name;

        dragItem.innerHTML = `
          ${item.isProfile ? `<i class="fa-regular fa-circle-user"></i>` : `<i class="${item.icon}"></i>`}
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

    document.getElementById("resetOrderBtn").onclick = () => {
      currentNav = [...DEFAULT_NAV];
      localStorage.setItem("nav_order", JSON.stringify(currentNav));
      renderDragBox();
      renderNavigation();
      alert("Navigation order reset to default");
    };



    /* =======================================================
       ৭. সোয়াইপ জেসচার
    ======================================================= */
    let touchStartX = 0;
    let touchStartY = 0;

    appContainer.addEventListener("touchstart", (e) => {
      if (e.target.closest("#bottomNavBar") || e.target.closest("#settingsOverlay")) return;
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    appContainer.addEventListener("touchend", (e) => {
      const diffX = e.changedTouches[0].screenX - touchStartX;
      const diffY = e.changedTouches[0].screenY - touchStartY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 60) {
        if (diffX > 0 && reelsView.classList.contains("active")) {
          const homeBtn = document.querySelector('.nav-btn[data-id="home"]');
          switchTab("home", homeBtn);
        } else if (diffX < 0 && homeView.classList.contains("active")) {
          const reelsBtn = document.querySelector('.nav-btn[data-id="reels"]');
          switchTab("reels", reelsBtn);
        }
      }
    }, { passive: true });



export { renderNavigation, updateActivePillPosition, switchTab, hideStandardNavBar, showStandardNavBar, handleHomeFeedScroll, applyCurrentDynamicTheme, renderDragBox, startNavPressTimer, cancelNavPressTimer, checkNavPressMove, activeNavId };
