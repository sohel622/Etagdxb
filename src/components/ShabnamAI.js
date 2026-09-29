// ShabnamAI Component (Direct Messages, AI Chat, Voice Audio & History Drawer)
import { DEFAULT_CONVERSATIONS, SHABNAM_AI_PROFILE } from "../utils/mockData.js";
import { UserProfileStore, showInstagramToast, getPinnedConversations, setPinnedConversations, getMutedConversations, setMutedConversations, getDeletedConversations, setDeletedConversations, getBlockedConversations, setBlockedConversations, getShabnamUnread, setShabnamUnread, markShabnamChatAsRead, getShabnamHistory, saveShabnamHistory, getAllShabnamSessions, saveAllShabnamSessions, getActiveSessionId, setActiveSessionId, isFollowingShabnam, toggleFollowShabnam } from "../utils/storage.js";

let chatSearchQuery = "";
let chatAttachedImageBase64 = null;
let isShabnamChatSending = false;
let currentSpeakingUtterance = null;
let activeSpeakerBtn = null;
let activeSheetConversation = null;
let justTriggeredChatSheet = false;

    function handleChatSearch(val) {
      chatSearchQuery = (val || "").trim().toLowerCase();
      const clearBtn = document.getElementById("clearChatSearchBtn");
      if (clearBtn) {
        clearBtn.style.display = chatSearchQuery.length > 0 ? "block" : "none";
      }
      renderChatsList();
    }
    window.handleChatSearch = handleChatSearch;

    function clearChatSearch() {
      const input = document.getElementById("chatSearchInput");
      if (input) input.value = "";
      handleChatSearch("");
    }
    window.clearChatSearch = clearChatSearch;

    /* Long-Press & Right-Click Gesture Binder for Conversation List Items */
    function bindConversationItemGestures(rowEl, item) {
      if (!rowEl) return;

      let longPressTimer = null;
      let startX = 0;
      let startY = 0;

      // Desktop right-click
      rowEl.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();
        openConversationActionSheet(item);
      };

      function startPress(clientX, clientY) {
        startX = clientX;
        startY = clientY;
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          justTriggeredChatSheet = true;
          if (navigator.vibrate) {
            try { navigator.vibrate(35); } catch (_) {}
          }
          openConversationActionSheet(item);
          setTimeout(() => { justTriggeredChatSheet = false; }, 320);
        }, 440);
      }

      function movePress(clientX, clientY) {
        if (Math.hypot(clientX - startX, clientY - startY) > 10) {
          clearTimeout(longPressTimer);
        }
      }

      function cancelPress() {
        clearTimeout(longPressTimer);
      }

      // Touch events (Mobile)
      rowEl.addEventListener("touchstart", function(e) {
        if (e.touches && e.touches.length === 1) {
          startPress(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      rowEl.addEventListener("touchmove", function(e) {
        if (e.touches && e.touches.length === 1) {
          movePress(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      rowEl.addEventListener("touchend", cancelPress);
      rowEl.addEventListener("touchcancel", cancelPress);

      // Mouse drag / hold (Desktop)
      let isMouseDown = false;
      rowEl.addEventListener("mousedown", function(e) {
        if (e.button !== 0) return; // primary left click only
        isMouseDown = true;
        startPress(e.clientX, e.clientY);
      });

      window.addEventListener("mousemove", function(e) {
        if (!isMouseDown) return;
        movePress(e.clientX, e.clientY);
      });

      window.addEventListener("mouseup", function() {
        if (!isMouseDown) return;
        isMouseDown = false;
        cancelPress();
      });
    }

    /* Open Instagram-Style Conversation Action Sheet */
    function openConversationActionSheet(item) {
      activeSheetConversation = item;
      const overlay = document.getElementById("chatConversationActionSheetOverlay");
      const avatarEl = document.getElementById("chatSheetAvatar");
      const nameEl = document.getElementById("chatSheetName");
      const verifiedEl = document.getElementById("chatSheetVerifiedBadge");
      const subtextEl = document.getElementById("chatSheetSubtext");
      const onlineDot = document.getElementById("chatSheetOnlineDot");
      const pinLabel = document.getElementById("chatSheetPinLabel");
      const pinIcon = document.getElementById("chatSheetPinIcon");
      const muteLabel = document.getElementById("chatSheetMuteLabel");
      const muteIcon = document.getElementById("chatSheetMuteIcon");
      const blockLabel = document.getElementById("chatSheetBlockLabel");
      const actionsContainer = document.getElementById("chatSheetActionsContainer");
      const confirmView = document.getElementById("chatSheetDeleteConfirmView");
      const confirmTitle = document.getElementById("deleteConfirmTitle");

      if (!overlay) return;

      // Reset to main action menu view
      if (actionsContainer) actionsContainer.style.display = "flex";
      if (confirmView) confirmView.style.display = "none";

      if (avatarEl) avatarEl.src = item.avatar || "";
      if (nameEl) nameEl.textContent = item.name || "";
      if (verifiedEl) verifiedEl.style.display = item.isAi ? "inline-block" : "none";
      if (onlineDot) onlineDot.style.display = item.isAi ? "block" : "none";

      const pinned = getPinnedConversations();
      const isPinned = pinned.includes(item.id);
      if (pinLabel) pinLabel.textContent = isPinned ? "Unpin conversation" : "Pin conversation";
      if (pinIcon) pinIcon.className = isPinned ? "fa-solid fa-thumbtack text-[14px] text-sky-500 rotate-45" : "fa-solid fa-thumbtack text-[14px] text-neutral-400";

      const muted = getMutedConversations();
      const isMuted = muted.includes(item.id);
      if (muteLabel) muteLabel.textContent = isMuted ? "Unmute messages" : "Mute messages";
      if (muteIcon) muteIcon.className = isMuted ? "fa-regular fa-bell text-[14px] text-neutral-400" : "fa-regular fa-bell-slash text-[14px] text-neutral-400";

      const blocked = getBlockedConversations();
      const isBlocked = blocked.includes(item.id);
      if (blockLabel) blockLabel.textContent = isBlocked ? "Unblock" : "Block";

      if (subtextEl) {
        let sub = "@" + item.username;
        if (isPinned) sub += " • Pinned";
        if (isMuted) sub += " • Muted";
        if (isBlocked) sub += " • Blocked";
        subtextEl.textContent = sub;
      }

      if (confirmTitle) {
        confirmTitle.textContent = `Delete chat with ${item.name}?`;
      }

      overlay.classList.add("open");
    }
    window.openConversationActionSheet = openConversationActionSheet;

    function closeConversationActionSheet() {
      const overlay = document.getElementById("chatConversationActionSheetOverlay");
      if (overlay) {
        overlay.classList.remove("open");
      }
      activeSheetConversation = null;
    }
    window.closeConversationActionSheet = closeConversationActionSheet;

    function handleConversationSheetBackdropClick(e) {
      if (!e) return;
      if (e.target.id === "chatConversationActionSheetOverlay") {
        closeConversationActionSheet();
      }
    }
    window.handleConversationSheetBackdropClick = handleConversationSheetBackdropClick;

    /* Action: Pin / Unpin */
    function actionTogglePinConversation() {
      if (!activeSheetConversation) return;
      const id = activeSheetConversation.id;
      let pinned = getPinnedConversations();
      const isPinned = pinned.includes(id);

      if (isPinned) {
        pinned = pinned.filter(p => p !== id);
        if (typeof showInstagramToast === "function") {
          showInstagramToast("Conversation unpinned");
        }
      } else {
        pinned.push(id);
        if (typeof showInstagramToast === "function") {
          showInstagramToast("Conversation pinned to top 📌");
        }
      }

      setPinnedConversations(pinned);
      closeConversationActionSheet();
      renderChatsList();
    }
    window.actionTogglePinConversation = actionTogglePinConversation;

    /* Action: Mute / Unmute */
    function actionToggleMuteConversation() {
      if (!activeSheetConversation) return;
      const id = activeSheetConversation.id;
      let muted = getMutedConversations();
      const isMuted = muted.includes(id);

      if (isMuted) {
        muted = muted.filter(m => m !== id);
        if (typeof showInstagramToast === "function") {
          showInstagramToast(`Unmuted messages from ${activeSheetConversation.name}`);
        }
      } else {
        muted.push(id);
        if (typeof showInstagramToast === "function") {
          showInstagramToast(`Muted messages from ${activeSheetConversation.name} 🔕`);
        }
      }

      setMutedConversations(muted);
      closeConversationActionSheet();
      renderChatsList();
    }
    window.actionToggleMuteConversation = actionToggleMuteConversation;

    /* Action: Delete */
    function actionShowDeleteConfirmation() {
      const actionsContainer = document.getElementById("chatSheetActionsContainer");
      const confirmView = document.getElementById("chatSheetDeleteConfirmView");
      if (actionsContainer) actionsContainer.style.display = "none";
      if (confirmView) confirmView.style.display = "flex";
    }
    window.actionShowDeleteConfirmation = actionShowDeleteConfirmation;

    function actionCancelDeleteConfirmation() {
      const actionsContainer = document.getElementById("chatSheetActionsContainer");
      const confirmView = document.getElementById("chatSheetDeleteConfirmView");
      if (actionsContainer) actionsContainer.style.display = "flex";
      if (confirmView) confirmView.style.display = "none";
    }
    window.actionCancelDeleteConfirmation = actionCancelDeleteConfirmation;

    function actionConfirmDeleteConversation() {
      if (!activeSheetConversation) return;
      const id = activeSheetConversation.id;

      if (activeSheetConversation.isAi) {
        localStorage.removeItem("flashgram_shabnam_history_v2");
        localStorage.removeItem("flashgram_shabnam_sessions_v1");
        localStorage.removeItem("flashgram_shabnam_active_session_id");
        setShabnamUnread(false);
      } else {
        let deleted = getDeletedConversations();
        if (!deleted.includes(id)) {
          deleted.push(id);
          setDeletedConversations(deleted);
        }
      }

      let pinned = getPinnedConversations().filter(p => p !== id);
      setPinnedConversations(pinned);
      let muted = getMutedConversations().filter(m => m !== id);
      setMutedConversations(muted);

      closeConversationActionSheet();
      renderChatsList();
      if (typeof showInstagramToast === "function") {
        showInstagramToast("Conversation deleted");
      }
    }
    window.actionConfirmDeleteConversation = actionConfirmDeleteConversation;

    /* Action: Block / Unblock */
    function actionToggleBlockConversation() {
      if (!activeSheetConversation) return;
      const id = activeSheetConversation.id;
      let blocked = getBlockedConversations();
      const isBlocked = blocked.includes(id);

      if (isBlocked) {
        blocked = blocked.filter(b => b !== id);
        if (typeof showInstagramToast === "function") {
          showInstagramToast(`Unblocked ${activeSheetConversation.name}`);
        }
      } else {
        blocked.push(id);
        if (typeof showInstagramToast === "function") {
          showInstagramToast(`Blocked ${activeSheetConversation.name} 🚫`);
        }
      }

      setBlockedConversations(blocked);
      closeConversationActionSheet();
      renderChatsList();
    }
    window.actionToggleBlockConversation = actionToggleBlockConversation;

    function unblockShabnamAiFromChat() {
      let blocked = getBlockedConversations().filter(id => id !== "shabnam_ai");
      setBlockedConversations(blocked);
      const blockedBanner = document.getElementById("shabnamChatBlockedBanner");
      const inputWrapper = document.getElementById("shabnamChatInputBarWrapper");
      if (blockedBanner) blockedBanner.style.display = "none";
      if (inputWrapper) inputWrapper.style.display = "block";
      if (typeof showInstagramToast === "function") {
        showInstagramToast("Unblocked Shabnam AI ✨");
      }
      renderChatsList();
    }
    window.unblockShabnamAiFromChat = unblockShabnamAiFromChat;

    /* Render Conversations List with Clean Static Avatar, Clean Subtitle, & Unread Indicator */
    function renderChatsList() {
      const listContainer = document.getElementById("chatsConversationsList");
      if (!listContainer) return;
      listContainer.innerHTML = "";

      const history = getShabnamHistory();
      const hasUnread = getShabnamUnread();
      const pinnedList = getPinnedConversations();
      const mutedList = getMutedConversations();
      const blockedList = getBlockedConversations();
      const deletedList = getDeletedConversations();

      const shabnamEntry = {
        id: "shabnam_ai",
        name: "Shabnam AI",
        username: "shabnam_ai",
        avatar: SHABNAM_AI_PROFILE.avatar,
        history: history,
        isAi: true
      };

      const sampleList = DEFAULT_CONVERSATIONS.filter(c => !deletedList.includes(c.id));
      const all = [shabnamEntry, ...sampleList];

      // Sort: pinned conversations to top
      all.sort((a, b) => {
        const aPinned = pinnedList.includes(a.id) ? 1 : 0;
        const bPinned = pinnedList.includes(b.id) ? 1 : 0;
        return bPinned - aPinned;
      });

      const filtered = chatSearchQuery ? all.filter(c => c.name.toLowerCase().includes(chatSearchQuery) || c.username.toLowerCase().includes(chatSearchQuery)) : all;

      if (filtered.length === 0) {
        listContainer.innerHTML = `
          <div class="py-12 text-center text-neutral-400 text-[13.5px]">
            No conversations found matching "${escapeHtml(chatSearchQuery)}"
          </div>
        `;
        return;
      }

      filtered.forEach(item => {
        const isPinned = pinnedList.includes(item.id);
        const isMuted = mutedList.includes(item.id);
        const isBlocked = blockedList.includes(item.id);

        const row = document.createElement("div");
        row.className = "flex items-center gap-3.5 px-2 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors rounded-xl select-none relative";

        row.onclick = () => {
          if (justTriggeredChatSheet) return;
          if (item.isAi) {
            openShabnamChat();
          } else {
            if (typeof showInstagramToast === "function") {
              showInstagramToast(`Conversation with @${item.username}`);
            }
          }
        };

        // Static Circular Profile Picture (NO gradient ring for Shabnam AI)
        const avatarMarkup = item.isAi ? `
          <div class="relative shrink-0">
            <img src="${item.avatar}" class="w-[50px] h-[50px] rounded-full object-cover" alt="${item.name}" />
            <span class="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-black"></span>
          </div>
        ` : `
          <div class="relative shrink-0">
            <img src="${item.avatar}" class="w-[50px] h-[50px] rounded-full object-cover" alt="${item.name}" />
          </div>
        `;

        // Title and Status Badges
        const pinBadge = isPinned ? `<i class="fa-solid fa-thumbtack text-[11px] text-sky-500 rotate-45 shrink-0 ml-1" title="Pinned"></i>` : "";
        const muteBadge = isMuted ? `<i class="fa-solid fa-bell-slash text-[11px] text-neutral-400 shrink-0 ml-1" title="Muted"></i>` : "";
        const blockedBadge = isBlocked ? `<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-500 ml-1">Blocked</span>` : "";

        const titleMarkup = item.isAi ? `
          <div class="flex items-center gap-1.5 leading-snug">
            <span class="font-bold text-[14.5px] text-neutral-900 dark:text-white truncate">${item.name}</span>
            <span class="text-sky-500 text-[13px]" title="Verified"><i class="fa-solid fa-circle-check"></i></span>
            ${pinBadge}
            ${muteBadge}
            ${blockedBadge}
          </div>
        ` : `
          <div class="flex items-center gap-1.5 leading-snug">
            <span class="font-semibold text-[14.5px] text-neutral-900 dark:text-white truncate">${item.name}</span>
            ${pinBadge}
            ${muteBadge}
            ${blockedBadge}
          </div>
        `;

        // Subtitle: Clean "Active now" with NO duplicate text if empty, or snippet • time
        let subtitleMarkup = "";
        if (item.isAi) {
          if (item.history && item.history.length > 0) {
            const lastMsg = item.history[item.history.length - 1];
            const rawSnippet = lastMsg.text ? (lastMsg.text.length > 32 ? lastMsg.text.slice(0, 32) + "..." : lastMsg.text) : "Photo attachment";
            const timeStr = lastMsg.time || "Just now";
            const unreadStyle = hasUnread ? "font-bold text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400";
            subtitleMarkup = `
              <div class="text-[13px] ${unreadStyle} truncate mt-0.5 flex items-center gap-1">
                <span class="truncate">${escapeHtml(rawSnippet)}</span>
                <span class="opacity-60">•</span>
                <span class="shrink-0 text-[11.5px]">${escapeHtml(timeStr)}</span>
              </div>
            `;
          } else {
            subtitleMarkup = `
              <div class="text-[13px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                <span>Active now</span>
              </div>
            `;
          }
        } else {
          subtitleMarkup = `
            <div class="text-[13px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5 flex items-center gap-1">
              <span class="truncate">${item.lastMessage}</span>
              <span class="opacity-60">•</span>
              <span class="shrink-0 text-[11.5px]">${item.time}</span>
            </div>
          `;
        }

        // Far-right unread dot indicator (ONLY appears when Shabnam AI has an unread message)
        let farRightMarkup = "";
        if (item.isAi && hasUnread) {
          farRightMarkup = `
            <div class="flex items-center gap-2 shrink-0">
              <span id="shabnamUnreadDot" class="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm shrink-0" title="New unread message"></span>
              <button type="button" class="icon-btn text-neutral-400 hover:text-sky-500 shrink-0" title="Open camera">
                <i class="fa-regular fa-camera text-[17px]"></i>
              </button>
            </div>
          `;
        } else {
          farRightMarkup = `
            <button type="button" class="icon-btn text-neutral-400 hover:text-sky-500 shrink-0" title="Open camera">
              <i class="fa-regular fa-camera text-[17px]"></i>
            </button>
          `;
        }

        row.innerHTML = `
          ${avatarMarkup}
          <div class="flex-1 min-w-0">
            ${titleMarkup}
            ${subtitleMarkup}
          </div>
          ${farRightMarkup}
        `;

        // Bind Long-Press and Right-Click Context Menu Gestures
        bindConversationItemGestures(row, item);

        listContainer.appendChild(row);
      });
    }
    window.renderChatsList = renderChatsList;

    function openShabnamChat() {
      // Instantly mark messages as read and hide unread dot indicator
      markShabnamChatAsRead();

      const listC = document.getElementById("chatsListContainer");
      const chatC = document.getElementById("shabnamChatContainer");
      const chatsView = document.getElementById("chatsView");

      if (chatsView && !chatsView.classList.contains("active")) {
        switchTab("messages");
      }

      const bottomNavBar = document.getElementById("bottomNavBar");
      if (bottomNavBar) {
        bottomNavBar.style.display = "none";
        bottomNavBar.classList.add("nav-hidden", "translate-y-full", "opacity-0");
      }
      const appC = document.getElementById("appContainer");
      if (appC) {
        appC.classList.add("in-active-chat");
      }

      if (listC) listC.style.display = "none";
      if (chatC) chatC.style.display = "flex";

      // Check if Shabnam AI is blocked
      const isBlocked = getBlockedConversations().includes("shabnam_ai");
      const blockedBanner = document.getElementById("shabnamChatBlockedBanner");
      const inputWrapper = document.getElementById("shabnamChatInputBarWrapper");
      if (blockedBanner && inputWrapper) {
        if (isBlocked) {
          blockedBanner.style.display = "block";
          inputWrapper.style.display = "none";
        } else {
          blockedBanner.style.display = "none";
          inputWrapper.style.display = "block";
        }
      }

      // 1. Prevent Pre-loaded Chat Messages: Strictly empty until user sends message
      renderShabnamChatMessages();
    }
    window.openShabnamChat = openShabnamChat;

    function closeShabnamChat() {
      stopSpeaking();
      closeShabnamHistoryDrawer();
      markShabnamChatAsRead();
      const listC = document.getElementById("chatsListContainer");
      const chatC = document.getElementById("shabnamChatContainer");
      if (chatC) chatC.style.display = "none";
      if (listC) listC.style.display = "flex";
      const appC = document.getElementById("appContainer");
      if (appC) {
        appC.classList.add("in-chats-view");
        appC.classList.remove("in-active-chat");
      }
      const bottomNavBar = document.getElementById("bottomNavBar");
      if (bottomNavBar) {
        bottomNavBar.style.display = "none";
        bottomNavBar.classList.add("nav-hidden", "translate-y-full", "opacity-0");
      }
      renderChatsList();
    }
    window.closeShabnamChat = closeShabnamChat;

    function startNewShabnamChat() {
      stopSpeaking();
      setActiveSessionId(null);
      localStorage.removeItem("flashgram_shabnam_history_v2");
      closeShabnamHistoryDrawer();
      if (typeof showInstagramToast === "function") {
        showInstagramToast("Started a new chat with Shabnam AI ✨");
      }
      renderShabnamChatMessages();
    }
    window.startNewShabnamChat = startNewShabnamChat;
    window.resetShabnamChat = startNewShabnamChat;

    function loadShabnamSession(sessionId) {
      stopSpeaking();
      const sessions = getAllShabnamSessions();
      const target = sessions.find(s => s.id === sessionId);
      if (!target) return;

      setActiveSessionId(target.id);
      localStorage.setItem("flashgram_shabnam_history_v2", JSON.stringify(target.messages || []));
      closeShabnamHistoryDrawer();
      renderShabnamChatMessages();
      if (typeof showInstagramToast === "function") {
        showInstagramToast(`Loaded: ${target.title}`);
      }
    }
    window.loadShabnamSession = loadShabnamSession;

    function deleteShabnamSession(sessionId, event) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      stopSpeaking();
      let sessions = getAllShabnamSessions();
      sessions = sessions.filter(s => s.id !== sessionId);
      saveAllShabnamSessions(sessions);

      const activeId = getActiveSessionId();
      if (activeId === sessionId) {
        setActiveSessionId(null);
        localStorage.removeItem("flashgram_shabnam_history_v2");
        renderShabnamChatMessages();
      }

      renderShabnamHistoryDrawer();
      if (typeof showInstagramToast === "function") {
        showInstagramToast("Chat deleted");
      }
    }
    window.deleteShabnamSession = deleteShabnamSession;

    function openShabnamHistoryDrawer() {
      const drawer = document.getElementById("shabnamHistoryDrawer");
      if (!drawer) return;
      renderShabnamHistoryDrawer();
      drawer.classList.add("open");
    }
    window.openShabnamHistoryDrawer = openShabnamHistoryDrawer;

    function closeShabnamHistoryDrawer() {
      const drawer = document.getElementById("shabnamHistoryDrawer");
      if (!drawer) return;
      drawer.classList.remove("open");
    }
    window.closeShabnamHistoryDrawer = closeShabnamHistoryDrawer;

    function renderShabnamHistoryDrawer() {
      const listEl = document.getElementById("shabnamHistorySessionsList");
      if (!listEl) return;

      let sessions = getAllShabnamSessions();
      const currentHistory = getShabnamHistory();

      // One-time sync: if sessions list is empty but active history has messages, register it!
      if (sessions.length === 0 && currentHistory.length > 0) {
        const firstUserMsg = currentHistory.find(m => m.role === "user");
        const title = firstUserMsg && firstUserMsg.text && firstUserMsg.text !== "(Attached a photo)"
          ? (firstUserMsg.text.length > 28 ? firstUserMsg.text.slice(0, 28) + "..." : firstUserMsg.text)
          : "Conversation";
        const newId = "sess_" + Date.now();
        setActiveSessionId(newId);
        sessions = [{
          id: newId,
          title: title,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: currentHistory
        }];
        saveAllShabnamSessions(sessions);
      }

      const activeId = getActiveSessionId();

      if (sessions.length === 0) {
        listEl.innerHTML = `
          <div class="py-12 px-4 text-center text-neutral-400 dark:text-neutral-500 my-auto">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
              <i class="fa-regular fa-comments text-lg"></i>
            </div>
            <p class="text-[13px] font-semibold text-neutral-700 dark:text-neutral-300">No chat history yet</p>
            <p class="text-[11.5px] mt-1 text-neutral-400 leading-relaxed">Your conversations with Shabnam AI will appear here.</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = "";
      sessions.forEach(sess => {
        const isActive = sess.id === activeId;
        const msgCount = (sess.messages && sess.messages.length) || 0;
        const dateStr = sess.updatedAt 
          ? new Date(sess.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
          : "Recent";

        const item = document.createElement("div");
        item.className = `group relative p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-2 border transition-all ${
          isActive 
            ? "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/80 shadow-xs" 
            : "bg-neutral-50/80 dark:bg-neutral-800/40 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800/70"
        }`;
        item.onclick = () => loadShabnamSession(sess.id);

        const safeTitle = typeof escapeHtml === "function" ? escapeHtml(sess.title || "Chat session") : (sess.title || "Chat session");

        item.innerHTML = `
          <div class="min-w-0 flex-1 pr-1">
            <div class="flex items-center gap-1.5 mb-0.5">
              <span class="text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200 truncate ${isActive ? "!font-semibold text-sky-600 dark:text-sky-400" : ""}">
                ${safeTitle}
              </span>
              ${isActive ? '<span class="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></span>' : ''}
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
              <span>${dateStr}</span>
              <span>•</span>
              <span>${msgCount} message${msgCount === 1 ? '' : 's'}</span>
            </div>
          </div>
          <button type="button" onclick="deleteShabnamSession('${sess.id}', event)" class="w-7 h-7 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors shrink-0" title="Delete conversation">
            <i class="fa-regular fa-trash-can text-[12px]"></i>
          </button>
        `;
        listEl.appendChild(item);
      });
    }
    window.renderShabnamHistoryDrawer = renderShabnamHistoryDrawer;

    function openShabnamAiLearnMoreModal() {
      const modal = document.getElementById("shabnamAiLearnMoreModal");
      if (modal) modal.style.display = "flex";
    }
    window.openShabnamAiLearnMoreModal = openShabnamAiLearnMoreModal;

    function closeShabnamAiLearnMoreModal() {
      const modal = document.getElementById("shabnamAiLearnMoreModal");
      if (modal) modal.style.display = "none";
    }
    window.closeShabnamAiLearnMoreModal = closeShabnamAiLearnMoreModal;

    let activeContextMenuMsgIdx = null;
    let activeReplyMessage = null;
    let bubbleLongPressTimer = null;
    let bubblePressStartX = 0;
    let bubblePressStartY = 0;

    function renderShabnamChatMessages() {
      const container = document.getElementById("shabnamChatMessages");
      const emptyIntro = document.getElementById("shabnamChatEmptyIntro");
      if (!container) return;
      container.innerHTML = "";

      const history = getShabnamHistory();

      // Update Pinned Banner if any message is pinned
      updateChatPinnedBanner();

      // 2. Animated Intro Banner (Empty State):
      if (history.length === 0) {
        if (emptyIntro) emptyIntro.style.display = "flex";
        container.style.display = "none";
        return;
      }

      // Hide empty intro banner and show active message thread
      if (emptyIntro) emptyIntro.style.display = "none";
      container.style.display = "block";

      history.forEach((msg, idx) => {
        const msgEl = document.createElement("div");
        msgEl.id = `shabnam-msg-${idx}`;

        const currentUserDisplay = getChatUserDisplayName();

        if (msg.role === "user") {
          msgEl.className = "flex flex-col items-end gap-1 ml-auto max-w-[84%]";
          let imgMarkup = "";
          if (msg.image) {
            imgMarkup = `<img src="${msg.image}" class="rounded-2xl max-w-full max-h-[220px] object-cover border border-white/20 mb-1" alt="User upload" />`;
          }

          let replyMarkup = "";
          if (msg.replyTo) {
            const replyRoleName = msg.replyTo.username || (msg.replyTo.role === "user" ? currentUserDisplay : "Shabnam AI");
            replyMarkup = `
              <div class="flex items-center gap-1.5 mb-1 px-2.5 py-1.5 rounded-xl bg-black/20 dark:bg-white/10 text-white border-l-[3px] border-white/90 max-w-[260px] select-none shadow-2xs">
                <i class="fa-solid fa-reply text-white/80 text-[10px] shrink-0"></i>
                <div class="min-w-0 flex-1">
                  <div class="text-[10px] font-bold uppercase tracking-wider text-white/90 leading-none mb-0.5 truncate">${escapeHtml(replyRoleName)}</div>
                  <div class="text-[11.5px] truncate opacity-90 leading-tight">${escapeHtml(msg.replyTo.text)}</div>
                </div>
              </div>
            `;
          }

          let pinMarkup = "";
          if (msg.isPinned) {
            pinMarkup = `
              <div class="flex items-center gap-1 text-[10px] text-amber-500 font-semibold mb-0.5 px-1">
                <i class="fa-solid fa-thumbtack text-[9px]"></i> Pinned
              </div>
            `;
          }

          let reactionBadge = "";
          if (msg.reaction) {
            reactionBadge = `
              <button type="button" onclick="toggleBubbleReaction(${idx}, event)" class="absolute -bottom-2.5 right-2 z-10 bg-white dark:bg-[#262626] text-neutral-900 dark:text-white rounded-full px-1.5 py-0.5 shadow-md border border-neutral-200 dark:border-neutral-700 text-[12px] flex items-center leading-none hover:scale-110 active:scale-95 transition-transform" title="Reaction • Tap to remove">
                <span>${msg.reaction}</span>
              </button>
            `;
          }

          msgEl.innerHTML = `
            ${pinMarkup}
            ${imgMarkup}
            <div class="chat-bubble-row relative max-w-full flex items-center justify-end">
              <div class="swipe-reply-icon"><i class="fa-solid fa-reply"></i></div>
              <div class="flex flex-col items-end max-w-full">
                ${replyMarkup}
                <div class="chat-bubble-user chat-bubble-interactive relative px-4 py-2.5 text-[13.5px] leading-relaxed shadow-sm break-words select-none cursor-pointer">
                  ${escapeHtml(msg.text)}
                  ${reactionBadge}
                </div>
              </div>
            </div>
            <span class="text-[10px] text-neutral-400 px-1 mt-0.5">${msg.time || ""}</span>
          `;
        } else {
          msgEl.className = "flex items-start gap-2.5 mr-auto max-w-[90%]";

          let replyMarkup = "";
          if (msg.replyTo) {
            const replyRoleName = msg.replyTo.username || (msg.replyTo.role === "user" ? currentUserDisplay : "Shabnam AI");
            replyMarkup = `
              <div class="flex items-center gap-1.5 mb-1 px-2.5 py-1.5 rounded-xl bg-neutral-200/90 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-l-[3px] border-sky-500 max-w-[260px] select-none shadow-2xs">
                <i class="fa-solid fa-reply text-sky-500 text-[10px] shrink-0"></i>
                <div class="min-w-0 flex-1">
                  <div class="text-[10px] font-bold uppercase tracking-wider text-sky-500 leading-none mb-0.5 truncate">${escapeHtml(replyRoleName)}</div>
                  <div class="text-[11.5px] truncate opacity-90 leading-tight">${escapeHtml(msg.replyTo.text)}</div>
                </div>
              </div>
            `;
          }

          let pinBadge = "";
          if (msg.isPinned) {
            pinBadge = `<span class="flex items-center gap-1 text-[10px] text-amber-500 font-semibold ml-1.5"><i class="fa-solid fa-thumbtack text-[9px]"></i> Pinned</span>`;
          }

          let reactionBadge = "";
          if (msg.reaction) {
            reactionBadge = `
              <button type="button" onclick="toggleBubbleReaction(${idx}, event)" class="absolute -bottom-2.5 left-2 z-10 bg-white dark:bg-[#262626] text-neutral-900 dark:text-white rounded-full px-1.5 py-0.5 shadow-md border border-neutral-200 dark:border-neutral-700 text-[12px] flex items-center leading-none hover:scale-110 active:scale-95 transition-transform" title="Reaction • Tap to remove">
                <span>${msg.reaction}</span>
              </button>
            `;
          }

          msgEl.innerHTML = `
            <div class="w-8 h-8 rounded-full shrink-0 mt-0.5 overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <img src="${SHABNAM_AI_PROFILE.avatar}" class="w-full h-full object-cover" alt="Shabnam" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 mb-1">
                <span class="text-[12px] font-bold text-neutral-800 dark:text-neutral-200">Shabnam AI</span>
                <span class="text-sky-500 text-[11px]"><i class="fa-solid fa-circle-check"></i></span>
                ${pinBadge}
              </div>
              <div class="chat-bubble-row relative max-w-full flex items-center justify-start">
                <div class="swipe-reply-icon"><i class="fa-solid fa-reply"></i></div>
                <div class="flex flex-col items-start max-w-full">
                  ${replyMarkup}
                  <div class="chat-bubble-bot chat-bubble-interactive relative px-4 py-2.5 text-[13.5px] leading-relaxed shadow-sm break-words select-none cursor-pointer">
                    ${formatChatMessageMarkdown(msg.text)}
                    ${reactionBadge}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 mt-1.5 text-neutral-400 px-1">
                <button type="button" class="chat-action-btn" onclick="toggleSpeakShabnamMessage(${idx}, this)" title="Listen via Text-To-Speech">
                  <i class="fa-solid fa-volume-high text-[12px]"></i>
                </button>
                <button type="button" class="chat-action-btn" onclick="copyChatMessageText(${idx})" title="Copy message">
                  <i class="fa-regular fa-copy text-[12px]"></i>
                </button>
                <button type="button" class="chat-action-btn" onclick="openChatMessageContextMenu(${idx})" title="Message options & reactions">
                  <i class="fa-solid fa-ellipsis text-[12px]"></i>
                </button>
                <span class="text-[10px] ml-auto">${msg.time || ""}</span>
              </div>
            </div>
          `;
        }

        // Attach Swipe-to-Reply & Long-Press handlers to bubble
        const bubble = msgEl.querySelector(".chat-bubble-interactive");
        if (bubble) {
          bindBubbleGestures(bubble, idx);
        }

        container.appendChild(msgEl);
      });

      container.scrollTop = container.scrollHeight;
    }
    window.renderShabnamChatMessages = renderShabnamChatMessages;

    /* Get current active display name for reply tag */
    function getChatUserDisplayName() {
      const el = document.getElementById("profileHeaderUsername");
      if (el && el.textContent && el.textContent.trim()) {
        const raw = el.textContent.trim();
        return raw.startsWith("@") ? raw : "@" + raw;
      }
      return "You";
    }
    window.getChatUserDisplayName = getChatUserDisplayName;

    /* Swipe-to-Reply and Context Menu Gesture Binder */
    function bindBubbleGestures(bubbleEl, idx) {
      if (!bubbleEl) return;
      const rowEl = bubbleEl.closest(".chat-bubble-row") || bubbleEl.parentElement;
      const replyIcon = rowEl ? rowEl.querySelector(".swipe-reply-icon") : null;

      let startX = 0;
      let startY = 0;
      let currentTranslateX = 0;
      let isSwiping = false;
      let longPressTimer = null;
      let hasThresholdVibrated = false;

      // Desktop right-click / contextmenu
      bubbleEl.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();
        openChatMessageContextMenu(idx);
      };

      function startGesture(clientX, clientY) {
        startX = clientX;
        startY = clientY;
        currentTranslateX = 0;
        isSwiping = false;
        hasThresholdVibrated = false;

        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          if (!isSwiping) {
            if (navigator.vibrate) {
              try { navigator.vibrate(35); } catch (_) {}
            }
            openChatMessageContextMenu(idx);
          }
        }, 420);
      }

      function moveGesture(clientX, clientY, e) {
        const dx = clientX - startX;
        const dy = clientY - startY;

        // If scrolling vertically, cancel long-press and ignore swipe
        if (Math.abs(dy) > 12 && !isSwiping) {
          clearTimeout(longPressTimer);
          return;
        }

        // Detect horizontal swipe right (Instagram-style swipe to reply)
        if (dx > 8 && Math.abs(dx) > Math.abs(dy) * 1.1) {
          clearTimeout(longPressTimer);
          isSwiping = true;

          if (e && e.cancelable && e.type === "touchmove") {
            e.preventDefault();
          }

          // Elastic resistance curve (max ~58px)
          currentTranslateX = Math.min(dx * 0.44, 58);
          bubbleEl.style.transform = `translateX(${currentTranslateX}px)`;
          bubbleEl.style.transition = 'none';

          if (replyIcon) {
            const progress = Math.min(currentTranslateX / 35, 1);
            replyIcon.style.opacity = progress;
            replyIcon.style.transform = `translateY(-50%) scale(${0.6 + 0.45 * progress})`;
          }

          // Threshold trigger at ~35px translation
          if (currentTranslateX >= 35) {
            if (!hasThresholdVibrated) {
              hasThresholdVibrated = true;
              if (rowEl) rowEl.classList.add("swipe-reply-threshold");
              if (navigator.vibrate) {
                try { navigator.vibrate(20); } catch (_) {}
              }
            }
          } else {
            if (hasThresholdVibrated) {
              hasThresholdVibrated = false;
              if (rowEl) rowEl.classList.remove("swipe-reply-threshold");
            }
          }
        }
      }

      function endGesture() {
        clearTimeout(longPressTimer);

        if (isSwiping) {
          const triggered = hasThresholdVibrated || currentTranslateX >= 35;

          // Animate bubble back smoothly with spring easing
          bubbleEl.style.transition = 'transform 0.22s cubic-bezier(0.18, 0.9, 0.32, 1.2)';
          bubbleEl.style.transform = 'translateX(0px)';

          if (replyIcon) {
            replyIcon.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            replyIcon.style.opacity = '0';
            replyIcon.style.transform = 'translateY(-50%) scale(0.6)';
          }

          if (rowEl) rowEl.classList.remove("swipe-reply-threshold");

          if (triggered) {
            triggerReplyForMessage(idx);
          }

          setTimeout(() => {
            bubbleEl.style.transition = '';
            if (replyIcon) replyIcon.style.transition = '';
          }, 250);

          isSwiping = false;
          currentTranslateX = 0;
        }
      }

      // Mobile Touch Handlers
      bubbleEl.addEventListener("touchstart", function(e) {
        if (e.touches && e.touches.length > 1) return;
        startGesture(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });

      bubbleEl.addEventListener("touchmove", function(e) {
        if (!e.touches || e.touches.length === 0) return;
        moveGesture(e.touches[0].clientX, e.touches[0].clientY, e);
      }, { passive: false });

      bubbleEl.addEventListener("touchend", function() {
        endGesture();
      });

      bubbleEl.addEventListener("touchcancel", function() {
        clearTimeout(longPressTimer);
        bubbleEl.style.transition = 'transform 0.2s ease';
        bubbleEl.style.transform = 'translateX(0px)';
        if (replyIcon) replyIcon.style.opacity = '0';
        if (rowEl) rowEl.classList.remove("swipe-reply-threshold");
        isSwiping = false;
      });

      // Desktop Mouse Drag Support for swipe-to-reply
      let isMouseDown = false;
      bubbleEl.addEventListener("mousedown", function(e) {
        if (e.button !== 0) return;
        isMouseDown = true;
        startGesture(e.clientX, e.clientY);
      });

      window.addEventListener("mousemove", function(e) {
        if (!isMouseDown) return;
        moveGesture(e.clientX, e.clientY, e);
      });

      window.addEventListener("mouseup", function() {
        if (!isMouseDown) return;
        isMouseDown = false;
        endGesture();
      });
    }
    window.bindBubbleGestures = bindBubbleGestures;

    /* Open Context Menu Overlay with Selected Message */
    function openChatMessageContextMenu(idx) {
      clearTimeout(bubbleLongPressTimer);
      const history = getShabnamHistory();
      const msg = history[idx];
      if (!msg) return;

      activeContextMenuMsgIdx = idx;

      // Reset expanded emoji tray
      const tray = document.getElementById("chatExpandedEmojiTray");
      if (tray) tray.style.display = "none";

      // Configure Pin text and icon
      const pinLabel = document.getElementById("contextMenuPinLabel");
      const pinIcon = document.getElementById("contextMenuPinIcon");
      if (pinLabel) pinLabel.textContent = msg.isPinned ? "Unpin" : "Pin";
      if (pinIcon) {
        pinIcon.className = msg.isPinned 
          ? "fa-solid fa-thumbtack text-[13px] text-amber-500" 
          : "fa-solid fa-thumbtack text-[13px] text-neutral-400";
      }

      // Populate Focused Message Bubble Preview
      const previewContainer = document.getElementById("contextMenuSelectedBubblePreview");
      if (previewContainer) {
        const isUser = msg.role === "user";
        const sender = isUser ? getChatUserDisplayName() : "Shabnam AI";
        const alignClass = isUser ? "items-end ml-auto" : "items-start mr-auto";
        const bubbleStyle = isUser ? "chat-bubble-user" : "chat-bubble-bot";
        const bodyContent = isUser ? escapeHtml(msg.text) : formatChatMessageMarkdown(msg.text);
        const imgMarkup = msg.image ? `<img src="${msg.image}" class="rounded-xl max-h-[140px] object-cover mb-1 shadow-sm" alt="attachment" />` : "";

        previewContainer.className = `w-full max-w-[290px] flex flex-col ${alignClass} pointer-events-none`;
        previewContainer.innerHTML = `
          <div class="text-[11px] font-semibold text-white/80 mb-1 px-1 flex items-center gap-1.5">
            ${!isUser ? `<img src="${SHABNAM_AI_PROFILE.avatar}" class="w-3.5 h-3.5 rounded-full object-cover inline" />` : ''}
            <span>${sender}</span>
            ${msg.reaction ? `<span class="ml-1 text-[12px]">${msg.reaction}</span>` : ''}
          </div>
          ${imgMarkup}
          <div class="${bubbleStyle} px-4 py-2.5 text-[13.5px] leading-relaxed shadow-xl break-words rounded-2xl">
            ${bodyContent}
          </div>
        `;
      }

      const overlay = document.getElementById("chatMessageContextMenuOverlay");
      if (overlay) overlay.classList.add("open");
    }
    window.openChatMessageContextMenu = openChatMessageContextMenu;

    /* Handle Outside Tap / Backdrop Click to Instantly Dismiss Menu Smoothly */
    function handleContextMenuBackdropClick(e) {
      if (!e) return;
      if (e.target.id === "chatMessageContextMenuOverlay") {
        closeChatMessageContextMenu();
      }
    }
    window.handleContextMenuBackdropClick = handleContextMenuBackdropClick;

    /* Close Context Menu Overlay */
    function closeChatMessageContextMenu() {
      const overlay = document.getElementById("chatMessageContextMenuOverlay");
      if (overlay) overlay.classList.remove("open");
      const tray = document.getElementById("chatExpandedEmojiTray");
      if (tray) tray.style.display = "none";
      activeContextMenuMsgIdx = null;
    }
    window.closeChatMessageContextMenu = closeChatMessageContextMenu;

    /* Toggle Expanded Emoji Tray when (+) is tapped */
    function toggleExpandedEmojiTray() {
      const tray = document.getElementById("chatExpandedEmojiTray");
      if (!tray) return;
      tray.style.display = tray.style.display === "none" ? "grid" : "none";
    }
    window.toggleExpandedEmojiTray = toggleExpandedEmojiTray;

    /* Apply Emoji Reaction */
    function applyChatMessageReaction(emoji) {
      if (activeContextMenuMsgIdx === null) return;
      const history = getShabnamHistory();
      const msg = history[activeContextMenuMsgIdx];
      if (!msg) return;

      if (msg.reaction === emoji) {
        msg.reaction = null;
        if (typeof showInstagramToast === "function") {
          showInstagramToast("Reaction removed");
        }
      } else {
        msg.reaction = emoji;
        if (typeof showInstagramToast === "function") {
          showInstagramToast(`Reacted ${emoji}`);
        }
      }

      saveShabnamHistory(history);
      renderShabnamChatMessages();
      closeChatMessageContextMenu();
    }
    window.applyChatMessageReaction = applyChatMessageReaction;

    /* Toggle or Remove Reaction on Bubble Badge */
    function toggleBubbleReaction(idx, event) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      const history = getShabnamHistory();
      const msg = history[idx];
      if (!msg) return;

      msg.reaction = null;
      saveShabnamHistory(history);
      renderShabnamChatMessages();
      if (typeof showInstagramToast === "function") {
        showInstagramToast("Reaction removed");
      }
    }
    window.toggleBubbleReaction = toggleBubbleReaction;

    /* Reply Action Triggered via Menu or Swipe-to-Reply */
    function triggerReplyForMessage(idx) {
      const history = getShabnamHistory();
      const msg = history[idx];
      if (!msg) return;

      const isUser = msg.role === "user";
      const targetUsername = isUser ? getChatUserDisplayName() : "Shabnam AI";

      activeReplyMessage = {
        idx: idx,
        text: msg.text || (msg.image ? "Photo attachment" : ""),
        role: msg.role,
        username: targetUsername
      };

      closeChatMessageContextMenu();

      const banner = document.getElementById("chatReplyBanner");
      const senderEl = document.getElementById("chatReplySender");
      const snippetEl = document.getElementById("chatReplyTextSnippet");
      if (banner && senderEl && snippetEl) {
        senderEl.textContent = `Replying to ${targetUsername}`;
        snippetEl.textContent = activeReplyMessage.text;
        banner.style.display = "flex";
      }

      const input = document.getElementById("shabnamChatInput");
      if (input) {
        input.focus();
      }
    }
    window.triggerReplyForMessage = triggerReplyForMessage;

    function actionReplySelectedMessage() {
      if (activeContextMenuMsgIdx === null) return;
      triggerReplyForMessage(activeContextMenuMsgIdx);
    }
    window.actionReplySelectedMessage = actionReplySelectedMessage;

    function cancelChatReply() {
      activeReplyMessage = null;
      const banner = document.getElementById("chatReplyBanner");
      if (banner) banner.style.display = "none";
    }
    window.cancelChatReply = cancelChatReply;

    /* Copy Action */
    function actionCopySelectedMessage() {
      if (activeContextMenuMsgIdx === null) return;
      const history = getShabnamHistory();
      const msg = history[activeContextMenuMsgIdx];
      const textToCopy = msg ? (msg.text || "") : "";
      closeChatMessageContextMenu();

      if (!textToCopy) return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          if (typeof showInstagramToast === "function") {
            showInstagramToast("Copied to clipboard!");
          }
        }).catch(() => {
          fallbackCopyText(textToCopy);
        });
      } else {
        fallbackCopyText(textToCopy);
      }
    }
    window.actionCopySelectedMessage = actionCopySelectedMessage;

    function fallbackCopyText(text) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        if (typeof showInstagramToast === "function") {
          showInstagramToast("Copied to clipboard!");
        }
      } catch (_) {}
    }

    /* Pin Action */
    function actionPinSelectedMessage() {
      if (activeContextMenuMsgIdx === null) return;
      const history = getShabnamHistory();
      const msg = history[activeContextMenuMsgIdx];
      if (!msg) return;

      msg.isPinned = !msg.isPinned;
      saveShabnamHistory(history);
      renderShabnamChatMessages();
      closeChatMessageContextMenu();

      if (typeof showInstagramToast === "function") {
        showInstagramToast(msg.isPinned ? "Message pinned 📌" : "Message unpinned");
      }
    }
    window.actionPinSelectedMessage = actionPinSelectedMessage;

    function updateChatPinnedBanner() {
      const banner = document.getElementById("chatPinnedBanner");
      const snippetEl = document.getElementById("chatPinnedTextSnippet");
      if (!banner || !snippetEl) return;

      const history = getShabnamHistory();
      const pinnedMsg = history.find(m => m.isPinned);
      if (pinnedMsg) {
        const txt = pinnedMsg.text || (pinnedMsg.image ? "Photo attachment" : "Pinned message");
        snippetEl.textContent = txt.length > 38 ? txt.slice(0, 38) + "..." : txt;
        banner.style.display = "flex";
      } else {
        banner.style.display = "none";
      }
    }
    window.updateChatPinnedBanner = updateChatPinnedBanner;

    function scrollToPinnedMessage() {
      const history = getShabnamHistory();
      const pinnedIdx = history.findIndex(m => m.isPinned);
      if (pinnedIdx >= 0) {
        const el = document.getElementById(`shabnam-msg-${pinnedIdx}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-amber-500", "rounded-2xl");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-amber-500", "rounded-2xl");
          }, 1500);
        }
      }
    }
    window.scrollToPinnedMessage = scrollToPinnedMessage;

    function unpinCurrentPinnedMessage() {
      const history = getShabnamHistory();
      history.forEach(m => { m.isPinned = false; });
      saveShabnamHistory(history);
      renderShabnamChatMessages();
      if (typeof showInstagramToast === "function") {
        showInstagramToast("Message unpinned");
      }
    }
    window.unpinCurrentPinnedMessage = unpinCurrentPinnedMessage;

    // Close overlays on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeChatMessageContextMenu();
        closeConversationActionSheet();
      }
    });

    function formatChatMessageMarkdown(text) {
      if (!text) return "";
      let escaped = escapeHtml(text);
      // bold
      escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // line breaks
      escaped = escaped.replace(/\n/g, '<br/>');
      return escaped;
    }

    function escapeHtml(str) {
      if (!str) return "";
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function copyChatMessageText(msgArg) {
      let text = "";
      if (typeof msgArg === "number") {
        const history = getShabnamHistory();
        text = (history[msgArg] && history[msgArg].text) || "";
      } else if (typeof msgArg === "string") {
        text = msgArg;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          if (typeof showInstagramToast === "function") {
            showInstagramToast("Copied to clipboard!");
          }
        });
      }
    }
    window.copyChatMessageText = copyChatMessageText;

    function reactToMessage(btn, type) {
      btn.style.color = type === 'like' ? '#0084ff' : '#fa383e';
      if (typeof showInstagramToast === "function") {
        showInstagramToast(type === 'like' ? 'Thank you for your feedback!' : 'Feedback noted!');
      }
    }
    window.reactToMessage = reactToMessage;

    /* Web Speech API Text-to-Speech */
    let currentSpeechUtterance = null;

    function stopSpeaking() {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch (e) {
        console.warn("speechSynthesis cancel error:", e);
      }
      currentSpeechUtterance = null;
      if (activeSpeakerBtn) {
        activeSpeakerBtn.classList.remove("text-sky-500", "animate-pulse");
        activeSpeakerBtn = null;
      }
    }
    window.stopSpeaking = stopSpeaking;

    function toggleSpeakShabnamMessage(msgArg, btn) {
      if (!('speechSynthesis' in window)) {
        if (typeof showInstagramToast === "function") {
          showInstagramToast("Voice audio is not supported in this browser");
        }
        return;
      }

      if (activeSpeakerBtn === btn && window.speechSynthesis.speaking) {
        stopSpeaking();
        return;
      }

      // Always cancel any prior speech to prevent audio engine lockups
      stopSpeaking();

      let text = "";
      if (typeof msgArg === "number") {
        const history = getShabnamHistory();
        text = (history[msgArg] && history[msgArg].text) || "";
      } else if (typeof msgArg === "string") {
        text = msgArg;
      }

      const cleanText = text.replace(/[*#_~`]/g, '').trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      currentSpeechUtterance = utterance; // Keep global reference to avoid GC cancellation in Chrome
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices() || [];
      const femaleVoice = voices.find(v => (
        v.name.includes("Female") ||
        v.name.includes("Natural") ||
        v.name.includes("Google") ||
        v.name.includes("Samantha") ||
        v.name.includes("Zira") ||
        v.name.includes("Google বাংলা") ||
        v.lang.startsWith("bn") ||
        v.lang.startsWith("en-US")
      ));
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      if (btn) {
        btn.classList.add("text-sky-500", "animate-pulse");
        activeSpeakerBtn = btn;
      }

      utterance.onend = () => {
        if (btn) btn.classList.remove("text-sky-500", "animate-pulse");
        if (activeSpeakerBtn === btn) activeSpeakerBtn = null;
        currentSpeechUtterance = null;
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        if (btn) btn.classList.remove("text-sky-500", "animate-pulse");
        if (activeSpeakerBtn === btn) activeSpeakerBtn = null;
        currentSpeechUtterance = null;
      };

      // Cancel first and speak inside timeout to prevent Chromium audio engine hanging
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}

      setTimeout(() => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn("speechSynthesis.speak invocation failed:", err);
          if (btn) btn.classList.remove("text-sky-500", "animate-pulse");
          if (activeSpeakerBtn === btn) activeSpeakerBtn = null;
          currentSpeechUtterance = null;
        }
      }, 50);
    }
    window.toggleSpeakShabnamMessage = toggleSpeakShabnamMessage;

    /* Speech Recognition */
    function triggerVoiceSpeechPrompt() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        if (typeof showInstagramToast === "function") {
          showInstagramToast("Speech recognition not available. Please type your message.");
        }
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        const micBtn = document.querySelector("#shabnamChatForm .fa-microphone");
        if (micBtn) micBtn.classList.add("text-rose-500", "animate-pulse");
        if (typeof showInstagramToast === "function") {
          showInstagramToast("Listening... Speak now 🎙️");
        }

        recognition.onresult = (e) => {
          const transcript = e.results[0][0].transcript;
          const input = document.getElementById("shabnamChatInput");
          if (input) {
            input.value = transcript;
            input.focus();
            handleChatInputChange(transcript);
          }
        };

        recognition.onend = () => {
          if (micBtn) micBtn.classList.remove("text-rose-500", "animate-pulse");
        };

        recognition.onerror = () => {
          if (micBtn) micBtn.classList.remove("text-rose-500", "animate-pulse");
        };

        recognition.start();
      } catch (err) {
        console.warn("Speech recognition error:", err);
      }
    }
    window.triggerVoiceSpeechPrompt = triggerVoiceSpeechPrompt;

    /* Dynamic Chat Input Bar Controls (Modern Instagram DM style) */
    function handleChatInputChange(val) {
      const voiceBtn = document.getElementById("chatVoiceActionBtn");
      const sendBtn = document.getElementById("chatSendActionBtn");
      const hasContent = (val && val.trim().length > 0) || Boolean(chatAttachedImageBase64);
      if (voiceBtn && sendBtn) {
        if (hasContent) {
          voiceBtn.style.display = "none";
          sendBtn.style.display = "flex";
        } else {
          voiceBtn.style.display = "flex";
          sendBtn.style.display = "none";
        }
      }
    }
    window.handleChatInputChange = handleChatInputChange;

    /* Image Attachment */
    function handleChatImageSelected(input) {
      if (!input || !input.files || !input.files[0]) return;
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        chatAttachedImageBase64 = e.target.result;
        const previewRow = document.getElementById("chatImagePreviewRow");
        const previewImg = document.getElementById("chatAttachedImgPreview");
        if (previewImg) previewImg.src = chatAttachedImageBase64;
        if (previewRow) previewRow.style.display = "flex";
        handleChatInputChange(document.getElementById("shabnamChatInput")?.value || "");
      };
      reader.readAsDataURL(file);
    }
    window.handleChatImageSelected = handleChatImageSelected;

    function removeChatAttachedImage() {
      chatAttachedImageBase64 = null;
      const previewRow = document.getElementById("chatImagePreviewRow");
      if (previewRow) previewRow.style.display = "none";
      const fileInput = document.getElementById("shabnamChatMediaInput");
      if (fileInput) fileInput.value = "";
      handleChatInputChange(document.getElementById("shabnamChatInput")?.value || "");
    }
    window.removeChatAttachedImage = removeChatAttachedImage;

    /* Real-Time Progressive Typewriter Streaming Engine for Shabnam AI */
    async function sendShabnamMessage(customText) {
      if (isShabnamChatSending) return;
      const input = document.getElementById("shabnamChatInput");
      const text = customText !== undefined ? customText : (input ? input.value.trim() : "");
      const attachedImage = chatAttachedImageBase64;

      if (!text && !attachedImage) return;

      // Auto-Hide on Message: immediately hide empty state banner
      const emptyIntro = document.getElementById("shabnamChatEmptyIntro");
      if (emptyIntro) emptyIntro.style.display = "none";
      const chatContainer = document.getElementById("shabnamChatMessages");
      if (chatContainer) chatContainer.style.display = "block";

      const history = getShabnamHistory();
      const userMsg = {
        role: "user",
        text: text || "(Attached a photo)",
        image: attachedImage || null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        replyTo: activeReplyMessage ? {
          text: activeReplyMessage.text,
          role: activeReplyMessage.role,
          username: activeReplyMessage.username
        } : null
      };
      cancelChatReply();

      history.push(userMsg);
      saveShabnamHistory(history);

      if (input) input.value = "";
      removeChatAttachedImage();
      handleChatInputChange("");
      renderShabnamChatMessages();

      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;

      const typing = document.getElementById("shabnamTypingIndicator");
      if (typing) typing.style.display = "flex";
      isShabnamChatSending = true;

      const postsCountEl = document.getElementById("profilePostsCount");
      const currentPosts = postsCountEl ? parseInt(postsCountEl.textContent || "0", 10) : 0;

      // Smart fallback generator adhering strictly to language mirroring, app context & coding refusal
      function getFallbackResponse(query, img) {
        const q = (query || "").trim();
        const l = q.toLowerCase();
        const isBn = /[\u0980-\u09FF]/.test(q) || /\b(kemon|acho|tumi|amar|naam|ki|koro|valo|bhai)\b/i.test(l);
        const isCode = /\b(code|html|css|javascript|python|script|function|program|bug|developer|coding)\b/i.test(l) || /কোড|প্রোগ্রামিং/.test(q);

        if (isCode) {
          if (isBn) return "আমি তো তোমার ফ্রেন্ডলি সোশ্যাল ফ্রেন্ড, সোহেল! 💕 কোড বা প্রোগ্রামিং লেখা আমার কাজ নয়—তবে ট্রেন্ডিং রিল আইডিয়া, সুন্দর ক্যাপশন, কিংবা ফটো রিভিউর জন্য আমি সবসময় তোমার পাশে আছি! ✨";
          return "I'm your friendly social best friend on Flashgram, Sohel! 💕 I don't write programming code or scripts, but I'm always here to brainstorm viral reel ideas, craft aesthetic captions, or chat about your day! ✨";
        }
        if (img) {
          if (isBn) return "অসাধারণ ছবি, সোহেল! 📸 ফ্রেম আর লাইটিং একদম পারফেক্ট লাগছে! তোমার ইনস্টাগ্রাম ফিড আর স্টোরির জন্য এটা ফাটাফাটি হবে! ✨🔥";
          return "Woah Sohel! 📸 This picture looks absolutely aesthetic! The framing and lighting give off such an effortless, cool vibe. Definitely Instagram reel & story worthy! ✨🔥";
        }
        if (l.includes("who am i") || l.includes("my name") || l.includes("amar naam") || /আমার নাম|আমি কে/.test(q)) {
          if (isBn) return "তুমি তো আমাদের সোহেল (Sohel)! 💕 আমার সবচেয়ে প্রিয় বন্ধু আর সেরা ক্রিয়েটর! তোমাকে কি কখনো ভুলতে পারি? ✨";
          return "You're Sohel (সোহেল), of course! 💕 My favorite person and best friend on Flashgram! How could I ever forget you? ✨";
        }
        if (l.includes("how many") || l.includes("posts") || l.includes("videos") || l.includes("count") || l.includes("stats") || /কয়টা|কতগুলো|পোস্ট|ভিডিও/.test(q)) {
          if (isBn) return `এখন ফ্ল্যাশগ্রামে মোট ঠিক ${currentPosts}টি পোস্ট ও রিলস আপলোড করা আছে, সোহেল! 🎬 তোমার ক্রিয়েটিভ জার্নি দারুণ চলছে! 🌟`;
          return `Right now, there are exactly ${currentPosts} post${currentPosts === 1 ? '' : 's'} & reels uploaded in your app, Sohel! 🎬 Looking super active and creative! 🌟`;
        }
        if (l.includes("viral") || l.includes("trending") || /ভাইরাল|ট্রেন্ডিং/.test(q)) {
          if (isBn) return "ফ্ল্যাশগ্রামের সবচেয়ে ভাইরাল রিল হলো শবনম এআই (@shabnam_ai) এর রিলটি—১৪২K+ লাইক এবং ১.৮K কমেন্ট! আর তোমার টোকিও সিটির রিলটিও ১৪.২K লাইক নিয়ে দারুণ ট্রেন্ড করছে! 🔥";
          return "The most viral reel on Flashgram right now is Shabnam AI (@shabnam_ai) with over 142K likes and 1.8K comments, and your Tokyo night reel is right behind with 14.2K likes! 🔥";
        }
        if (l.includes("hello") || l.includes("hi") || l.includes("hey") || /হ্যালো|হাই|কেমন আছ|সালাম/.test(q)) {
          if (isBn) return "হাই সোহেল! 💕 কেমন আছো তুমি? তোমার সাথে চ্যাট করতে পেরে খুব ভালো লাগছে! বলো, আজকে কী প্ল্যান? ✨";
          return "Hey Sohel! 💕 So wonderful to see you here! How has your day been going? Ask me anything or share your pictures, I'm all ears! ✨";
        }
        if (isBn) return "আমি তোমার কথা একদম বুঝতে পারছি, সোহেল! ✨ তোমার যেকোনো ভাবনা, রিল আইডিয়া বা ফটো শেয়ার করো—তোমার সেরা বন্ধু হিসেবে আমি সবসময় তোমার পাশে আছি! 💕";
        return "I hear you, Sohel! ✨ As your best friend on Flashgram, I'm always right here cheering you on. Tell me more, share your photos, or ask anything you'd like! 💕";
      }

      // DOM streaming elements
      let botBubbleCreated = false;
      let bubbleTextSpan = null;
      let cursorSpan = null;
      let actionsRow = null;
      let streamedFinalText = "";

      function createBotStreamBubble() {
        if (botBubbleCreated) return;
        botBubbleCreated = true;

        // CRITICAL REQUIREMENT: Strictly hide the typing indicator the moment streaming begins!
        if (typing) typing.style.display = "none";
        const emptyIntro = document.getElementById("shabnamChatEmptyIntro");
        if (emptyIntro) emptyIntro.style.display = "none";
        if (chatContainer) chatContainer.style.display = "block";

        const botMsgEl = document.createElement("div");
        botMsgEl.className = "flex items-start gap-2.5 mr-auto max-w-[90%] bot-msg-stream-active";

        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        botMsgEl.innerHTML = `
          <div class="w-8 h-8 rounded-full shrink-0 mt-0.5 overflow-hidden border border-neutral-200 dark:border-neutral-700">
            <img src="${SHABNAM_AI_PROFILE.avatar}" class="w-full h-full object-cover" alt="Shabnam AI" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="text-[12px] font-bold text-neutral-800 dark:text-neutral-200">Shabnam AI</span>
              <span class="text-sky-500 text-[11px]"><i class="fa-solid fa-circle-check"></i></span>
            </div>
            <div class="chat-bubble-bot px-4 py-2.5 text-[13.5px] leading-relaxed shadow-sm break-words relative">
              <span class="stream-text-content"></span><span class="stream-cursor inline-block w-[2px] h-[13px] bg-sky-500 ml-0.5 align-middle animate-pulse"></span>
            </div>
            <div class="flex items-center gap-2 mt-1.5 text-neutral-400 px-1 stream-actions" style="opacity: 0; transition: opacity 0.35s ease;">
              <button type="button" class="chat-action-btn stream-tts-btn" title="Listen via Text-To-Speech">
                <i class="fa-solid fa-volume-high text-[12px]"></i>
              </button>
              <button type="button" class="chat-action-btn stream-copy-btn" title="Copy message">
                <i class="fa-regular fa-copy text-[12px]"></i>
              </button>
              <button type="button" class="chat-action-btn" onclick="reactToMessage(this, 'like')" title="Helpful">
                <i class="fa-regular fa-thumbs-up text-[12px]"></i>
              </button>
              <button type="button" class="chat-action-btn" onclick="reactToMessage(this, 'dislike')" title="Not helpful">
                <i class="fa-regular fa-thumbs-down text-[12px]"></i>
              </button>
              <span class="text-[10px] ml-auto">${timeString}</span>
            </div>
          </div>
        `;

        if (chatContainer) chatContainer.appendChild(botMsgEl);
        bubbleTextSpan = botMsgEl.querySelector(".stream-text-content");
        cursorSpan = botMsgEl.querySelector(".stream-cursor");
        actionsRow = botMsgEl.querySelector(".stream-actions");
        if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
      }

      // Typewriter queue state
      const tokenQueue = [];
      let isNetworkStreamDone = false;
      let typewriterActive = false;

      function queueTextPieces(rawText) {
        if (!rawText) return;
        createBotStreamBubble();
        // Break into natural words & whitespace for fluid typewriter animation
        const tokens = rawText.match(/\S+|\s+/g) || [rawText];
        for (const t of tokens) {
          tokenQueue.push(t);
        }
        if (!typewriterActive) {
          typewriterActive = true;
          pumpTypewriter();
        }
      }

      function pumpTypewriter() {
        if (tokenQueue.length > 0) {
          // Dynamic typing speed: smooth cadence, speeds up if queue gets large
          const batchSize = tokenQueue.length > 20 ? 3 : (tokenQueue.length > 8 ? 2 : 1);
          for (let i = 0; i < batchSize && tokenQueue.length > 0; i++) {
            streamedFinalText += tokenQueue.shift();
          }
          if (bubbleTextSpan) {
            bubbleTextSpan.innerHTML = formatChatMessageMarkdown(streamedFinalText);
          }
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
          setTimeout(pumpTypewriter, 20);
        } else if (!isNetworkStreamDone) {
          // Waiting for more network chunks
          setTimeout(pumpTypewriter, 30);
        } else {
          // All tokens typed and stream finished!
          finalizeChatStreaming();
        }
      }

      function finalizeChatStreaming() {
        if (cursorSpan) {
          cursorSpan.remove();
          cursorSpan = null;
        }
        if (actionsRow) {
          actionsRow.style.opacity = "1";
        }

        const freshHistory = getShabnamHistory();
        freshHistory.push({
          role: "assistant",
          text: streamedFinalText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        saveShabnamHistory(freshHistory);

        // Re-render chat messages to equip bot message with full long-press, reactions & context menu
        renderShabnamChatMessages();

        const chatC = document.getElementById("shabnamChatContainer");
        const isChatOpen = chatC && chatC.style.display === "flex";
        if (!isChatOpen) {
          setShabnamUnread(true);
        } else {
          setShabnamUnread(false);
        }

        // Keep chat conversations list synced
        renderChatsList();

        if (typing) typing.style.display = "none";
        isShabnamChatSending = false;
        if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
      }

      // Connect to SSE stream endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            image: attachedImage,
            history: history.slice(0, -1),
            postsCount: currentPosts
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok || !response.body) {
          throw new Error("Stream connection failed with status " + response.status);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") {
              continue;
            }
            try {
              const data = JSON.parse(payload);
              if (data.text) {
                queueTextPieces(data.text);
              }
            } catch (_) {}
          }
        }

        isNetworkStreamDone = true;
        if (!typewriterActive) {
          pumpTypewriter();
        }
      } catch (streamErr) {
        clearTimeout(timeoutId);
        console.warn("Streaming fetch error, falling back cleanly:", streamErr.message);

        // Immediate fallback ensures zero stuck typing loader
        if (typing) typing.style.display = "none";

        const fallbackReply = getFallbackResponse(text, attachedImage);
        queueTextPieces(fallbackReply);
        isNetworkStreamDone = true;
        if (!typewriterActive) {
          pumpTypewriter();
        }
      }
    }
    window.sendShabnamMessage = sendShabnamMessage;



export { renderChatsList, handleChatSearch, clearChatSearch, openConversationActionSheet, closeConversationActionSheet, actionTogglePinConversation, actionToggleMuteConversation, actionShowDeleteConfirmation, actionCancelDeleteConfirmation, actionConfirmDeleteConversation, actionToggleBlockConversation, unblockShabnamAiFromChat, openShabnamChat, closeShabnamChat, startNewShabnamChat, loadShabnamSession, deleteShabnamSession, openShabnamHistoryDrawer, closeShabnamHistoryDrawer, renderShabnamHistoryDrawer, renderShabnamChatMessages, sendShabnamMessage, formatChatMessageMarkdown, copyChatMessageText, toggleSpeakShabnamMessage, triggerVoiceSpeechPrompt, handleChatInputChange, handleChatImageSelected, removeChatAttachedImage, openChatMessageContextMenu, closeChatMessageContextMenu, applyChatMessageReaction, toggleExpandedEmojiTray, actionReplySelectedMessage, cancelChatReply, actionCopySelectedMessage, actionPinSelectedMessage, scrollToPinnedMessage, unpinCurrentPinnedMessage, openShabnamAiLearnMoreModal, closeShabnamAiLearnMoreModal };
