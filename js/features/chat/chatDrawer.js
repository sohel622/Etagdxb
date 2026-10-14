// js/features/chat/chatDrawer.js - Chat History & Session Drawer Component
import { showInstagramToast } from "../../utils/storage.js";

/**
 * Initializes and dynamically injects the Chat History Drawer into the DOM if absent
 */
export function initChatDrawer(parentContainer = null) {
  let drawer = document.getElementById("shabnamHistoryDrawer");
  if (!drawer) {
    drawer = document.createElement("div");
    drawer.id = "shabnamHistoryDrawer";
    drawer.className = "absolute inset-0 z-30 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity duration-300 opacity-0 pointer-events-none";
    drawer.innerHTML = `
      <div id="shabnamHistoryDrawerPanel" class="w-[85%] max-w-[320px] h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col shadow-2xl transform translate-x-full transition-transform duration-300 ease-out">
        <!-- Drawer Header -->
        <div class="px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-clock-rotate-left text-sky-500 text-[15px]"></i>
            <h4 class="font-bold text-[14.5px] text-neutral-900 dark:text-white">Chat History</h4>
          </div>
          <button type="button" id="closeDrawerBtn" class="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" title="Close">
            <i class="fa-solid fa-xmark text-[14px]"></i>
          </button>
        </div>

        <!-- "New Chat" button prominently at top -->
        <div class="p-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <button type="button" id="startNewChatBtn" class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white text-[13.5px] font-semibold transition-all shadow-sm">
            <i class="fa-solid fa-plus text-[13px]"></i>
            <span>New Chat</span>
          </button>
        </div>

        <!-- Sessions List -->
        <div id="shabnamHistorySessionsList" class="flex-1 overflow-y-auto p-2.5 space-y-1.5"></div>

        <!-- Drawer Footer -->
        <div class="p-3 border-t border-neutral-100 dark:border-neutral-800 text-center bg-neutral-50/50 dark:bg-neutral-900/50 shrink-0">
          <p class="text-[11px] text-neutral-400 dark:text-neutral-500">Chats are saved privately on this device</p>
        </div>
      </div>
    `;

    const host = parentContainer || document.getElementById("shabnamChatContainer") || document.body;
    host.appendChild(drawer);

    // Event listeners
    drawer.addEventListener("click", (e) => {
      if (e.target === drawer) closeChatDrawer();
    });
    drawer.querySelector("#closeDrawerBtn")?.addEventListener("click", closeChatDrawer);
    drawer.querySelector("#startNewChatBtn")?.addEventListener("click", () => {
      if (typeof window.startNewShabnamChat === "function") {
        window.startNewShabnamChat();
      }
      closeChatDrawer();
    });
  }
}

export function openChatDrawer() {
  initChatDrawer();
  const drawer = document.getElementById("shabnamHistoryDrawer");
  if (!drawer) return;
  if (typeof window.renderShabnamHistoryDrawer === "function") {
    window.renderShabnamHistoryDrawer();
  }
  drawer.classList.add("open");
}

export function closeChatDrawer() {
  const drawer = document.getElementById("shabnamHistoryDrawer");
  if (drawer) {
    drawer.classList.remove("open");
  }
}

export function startNewChat() {
  if (typeof window.startNewShabnamChat === "function") {
    window.startNewShabnamChat();
  }
  closeChatDrawer();
  showInstagramToast("Started new chat ✨");
}
