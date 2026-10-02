// Flashgram External Share Sheet Modal
import { showInstagramToast } from "../utils/storage.js";
import { openShabnamChat } from "./ShabnamAI.js";
import { openReelsShareSheet } from "./reels/index.js";

let currentSharedPayload = null;

function createShareModalDOM() {
  let modal = document.getElementById("flashgramShareModalBackdrop");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "flashgramShareModalBackdrop";
  modal.className = "fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center transition-opacity duration-300 opacity-0 pointer-events-none";
  modal.onclick = (e) => {
    if (e.target === modal) closeFlashgramShareModal();
  };

  modal.innerHTML = `
    <div class="w-full max-w-[420px] bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-neutral-200/80 dark:border-neutral-800 transform translate-y-6 sm:translate-y-0 transition-transform duration-300 mx-auto" onclick="event.stopPropagation()">
      <!-- Drag handle for mobile -->
      <div class="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mb-4 sm:hidden"></div>

      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-[#0095F6] flex items-center justify-center text-white text-[13px] shadow-sm">
            <i class="fa-solid fa-arrow-up-from-bracket"></i>
          </div>
          <span class="font-bold text-[16px] text-neutral-900 dark:text-white">Share to Flashgram</span>
        </div>
        <button type="button" onclick="closeFlashgramShareModal()" class="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer">
          <i class="fa-solid fa-xmark text-[16px]"></i>
        </button>
      </div>

      <!-- Content Preview Card -->
      <div class="mt-4 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60 flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center text-[18px] shrink-0">
          <i class="fa-solid fa-link"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[12px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-0.5">External Content</div>
          <p id="flashgramSharePreviewText" class="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200 line-clamp-2 break-all"></p>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-4 space-y-2">
        <!-- Action 1: Ask Shabnam AI -->
        <button type="button" id="shareActionShabnam" class="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 via-[#0095F6] to-indigo-600 hover:opacity-95 active:scale-[0.99] text-white font-semibold text-[14px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer">
          <i class="fa-solid fa-wand-magic-sparkles text-[15px]"></i>
          <span>Ask Shabnam AI about this</span>
        </button>

        <!-- Action 2: Send in Direct Message -->
        <button type="button" id="shareActionDM" class="w-full py-3 px-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-[0.99] text-neutral-800 dark:text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer">
          <i class="fa-regular fa-paper-plane text-[15px]"></i>
          <span>Send in Direct Message</span>
        </button>

        <!-- Action 3: Copy Link -->
        <button type="button" id="shareActionCopy" class="w-full py-2.5 px-4 rounded-2xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
          <i class="fa-regular fa-copy text-[14px]"></i>
          <span>Copy link</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Wire buttons
  const shabnamBtn = modal.querySelector("#shareActionShabnam");
  if (shabnamBtn) {
    shabnamBtn.onclick = () => {
      const textToShare = currentSharedPayload ? (currentSharedPayload.url || currentSharedPayload.text || "") : "";
      closeFlashgramShareModal();
      openShabnamWithPrefilledLink(textToShare);
    };
  }

  const dmBtn = modal.querySelector("#shareActionDM");
  if (dmBtn) {
    dmBtn.onclick = () => {
      const payload = currentSharedPayload;
      closeFlashgramShareModal();
      openReelsShareSheet({
        id: "external_share_" + Date.now(),
        isExternalShare: true,
        caption: payload ? (payload.text || payload.url) : "",
        url: payload ? (payload.url || payload.text) : ""
      });
    };
  }

  const copyBtn = modal.querySelector("#shareActionCopy");
  if (copyBtn) {
    copyBtn.onclick = async () => {
      const text = currentSharedPayload ? (currentSharedPayload.url || currentSharedPayload.text || "") : "";
      if (text && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(text);
          showInstagramToast("Link copied to clipboard 📋");
        } catch (_) {}
      }
      closeFlashgramShareModal();
    };
  }

  return modal;
}

export function openFlashgramShareModal(sharedPayload) {
  currentSharedPayload = sharedPayload || {};
  const modal = createShareModalDOM();
  const textEl = modal.querySelector("#flashgramSharePreviewText");
  const displayContent = currentSharedPayload.url || currentSharedPayload.text || currentSharedPayload.title || "Shared link";

  if (textEl) {
    textEl.textContent = displayContent;
  }

  modal.classList.remove("pointer-events-none", "opacity-0");
  modal.classList.add("opacity-100");
  const innerCard = modal.querySelector("div");
  if (innerCard) {
    innerCard.classList.remove("translate-y-6");
    innerCard.classList.add("translate-y-0");
  }
}

export function closeFlashgramShareModal() {
  const modal = document.getElementById("flashgramShareModalBackdrop");
  if (!modal) return;

  modal.classList.remove("opacity-100");
  modal.classList.add("opacity-0", "pointer-events-none");
  const innerCard = modal.querySelector("div");
  if (innerCard) {
    innerCard.classList.add("translate-y-6");
  }
}

export function openShabnamWithPrefilledLink(content) {
  if (typeof openShabnamChat === "function") {
    openShabnamChat();
  } else if (typeof window !== "undefined" && typeof window.openShabnamChat === "function") {
    window.openShabnamChat();
  }

  setTimeout(() => {
    const input = document.getElementById("shabnamChatInput");
    if (input && content) {
      input.value = content;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
      if (typeof window.handleChatInputChange === "function") {
        window.handleChatInputChange(content);
      }
    }
  }, 220);
}

if (typeof window !== "undefined") {
  window.openFlashgramShareModal = openFlashgramShareModal;
  window.closeFlashgramShareModal = closeFlashgramShareModal;
  window.openShabnamWithPrefilledLink = openShabnamWithPrefilledLink;
}
