// js/features/chat/chatReactions.js - Emoji Reaction Tray & Context Menu Component
import { showInstagramToast } from "../../utils/storage.js";

/**
 * Initializes and dynamically injects the Context Menu & Reaction Overlay into the DOM if absent
 */
export function initChatReactions(parentContainer = null) {
  let overlay = document.getElementById("chatMessageContextMenuOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "chatMessageContextMenuOverlay";
    overlay.className = "absolute inset-0 z-40 flex flex-col items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-200 opacity-0 pointer-events-none cursor-pointer";
    overlay.innerHTML = `
      <div class="w-full max-w-[320px] flex flex-col items-center gap-3 select-none cursor-default" id="chatContextMenuCard">
        <!-- 1. Reaction Bar -->
        <div class="relative flex flex-col items-center z-10">
          <!-- Expanded Emoji Tray -->
          <div id="chatExpandedEmojiTray" class="mb-2 p-2 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 grid grid-cols-6 gap-1 text-[20px] reaction-pill-pop" style="display: none;">
            <button type="button" data-emoji="🥰" class="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform active:scale-95">🥰</button>
            <button type="button" data-emoji="🥺" class="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform active:scale-95">🥺</button>
            <button type="button" data-emoji="🙌" class="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform active:scale-95">🙌</button>
            <button type="button" data-emoji="💯" class="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform active:scale-95">💯</button>
            <button type="button" data-emoji="🎉" class="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform active:scale-95">🎉</button>
            <button type="button" data-emoji="✨" class="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform active:scale-95">✨</button>
            <button type="button" data-emoji="😍" class="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform active:scale-95">😍</button>
            <button type="button" data-emoji="😭" class="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform active:scale-95">😭</button>
            <button type="button" data-emoji="👍" class="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform active:scale-95">👍</button>
            <button type="button" data-emoji="🙏" class="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform active:scale-95">🙏</button>
            <button type="button" data-emoji="⚡" class="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform active:scale-95">⚡</button>
            <button type="button" data-emoji="😎" class="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform active:scale-95">😎</button>
          </div>

          <!-- Floating Horizontal Pill Bar with Standard Emojis -->
          <div class="bg-white dark:bg-[#262626] rounded-full shadow-2xl px-3 py-1.5 flex items-center gap-2.5 border border-neutral-200/80 dark:border-neutral-700/80 reaction-pill-pop" id="chatStandardEmojiPill">
            <button type="button" data-emoji="❤️" class="text-[23px] hover:scale-125 active:scale-90 transition-transform select-none" title="Love">❤️</button>
            <button type="button" data-emoji="😂" class="text-[23px] hover:scale-125 active:scale-90 transition-transform select-none" title="Haha">😂</button>
            <button type="button" data-emoji="😮" class="text-[23px] hover:scale-125 active:scale-90 transition-transform select-none" title="Wow">😮</button>
            <button type="button" data-emoji="😢" class="text-[23px] hover:scale-125 active:scale-90 transition-transform select-none" title="Sad">😢</button>
            <button type="button" data-emoji="👏" class="text-[23px] hover:scale-125 active:scale-90 transition-transform select-none" title="Clap">👏</button>
            <button type="button" data-emoji="🔥" class="text-[23px] hover:scale-125 active:scale-90 transition-transform select-none" title="Fire">🔥</button>
            <button type="button" id="btnToggleExpandedEmojiTray" class="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 flex items-center justify-center text-[12px] active:scale-90 transition-all ml-0.5 shadow-xs" title="Pick more emojis">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
        </div>

        <!-- 2. Highlighted Message Preview -->
        <div id="contextMenuSelectedBubblePreview" class="w-full max-w-[290px] p-1 flex flex-col pointer-events-none transition-transform"></div>

        <!-- 3. Actions Cluster -->
        <div class="bg-white dark:bg-[#262626] rounded-2xl shadow-2xl border border-neutral-200/80 dark:border-neutral-700/80 overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800 w-[220px] context-menu-pop-in" id="chatContextMenuActions">
          <button type="button" id="actionMenuReplyBtn" class="w-full px-4 py-2.5 flex items-center justify-between text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors">
            <span>Reply</span>
            <i class="fa-solid fa-reply text-[13px] text-neutral-400"></i>
          </button>
          <button type="button" id="actionMenuCopyBtn" class="w-full px-4 py-2.5 flex items-center justify-between text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors">
            <span>Copy</span>
            <i class="fa-regular fa-copy text-[13px] text-neutral-400"></i>
          </button>
          <button type="button" id="actionMenuPinBtn" class="w-full px-4 py-2.5 flex items-center justify-between text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors">
            <span id="contextMenuPinLabel">Pin</span>
            <i class="fa-solid fa-thumbtack text-[13px] text-neutral-400" id="contextMenuPinIcon"></i>
          </button>
        </div>
      </div>
    `;

    const host = parentContainer || document.getElementById("shabnamChatContainer") || document.body;
    host.appendChild(overlay);

    // Event listeners
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeContextMenu();
    });

    overlay.querySelector("#chatContextMenuCard")?.addEventListener("click", (e) => e.stopPropagation());

    // Emoji button delegation
    overlay.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-emoji]");
      if (btn) {
        const emoji = btn.dataset.emoji;
        if (typeof window.applyChatMessageReaction === "function") {
          window.applyChatMessageReaction(emoji);
        }
        closeContextMenu();
      }
    });

    overlay.querySelector("#btnToggleExpandedEmojiTray")?.addEventListener("click", toggleExpandedTray);

    overlay.querySelector("#actionMenuReplyBtn")?.addEventListener("click", () => {
      if (typeof window.actionReplySelectedMessage === "function") {
        window.actionReplySelectedMessage();
      }
      closeContextMenu();
    });

    overlay.querySelector("#actionMenuCopyBtn")?.addEventListener("click", () => {
      if (typeof window.actionCopySelectedMessage === "function") {
        window.actionCopySelectedMessage();
      }
      closeContextMenu();
    });

    overlay.querySelector("#actionMenuPinBtn")?.addEventListener("click", () => {
      if (typeof window.actionPinSelectedMessage === "function") {
        window.actionPinSelectedMessage();
      }
      closeContextMenu();
    });
  }
}

export function openContextMenu() {
  initChatReactions();
  const overlay = document.getElementById("chatMessageContextMenuOverlay");
  if (overlay) overlay.classList.add("open");
}

export function closeContextMenu() {
  const overlay = document.getElementById("chatMessageContextMenuOverlay");
  if (overlay) overlay.classList.remove("open");
  const tray = document.getElementById("chatExpandedEmojiTray");
  if (tray) tray.style.display = "none";
}

export function toggleExpandedTray() {
  const tray = document.getElementById("chatExpandedEmojiTray");
  if (!tray) return;
  tray.style.display = tray.style.display === "none" ? "grid" : "none";
}
