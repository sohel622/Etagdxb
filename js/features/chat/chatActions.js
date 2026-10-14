// js/features/chat/chatActions.js - Reply, Copy, Pin, and Message Sending Logic
import { showInstagramToast } from "../../utils/storage.js";

export function initChatActions() {
  const replyCloseBtn = document.querySelector("#chatReplyBanner button");
  if (replyCloseBtn) {
    replyCloseBtn.addEventListener("click", cancelReply);
  }

  const pinnedCloseBtn = document.querySelector("#chatPinnedBanner button");
  if (pinnedCloseBtn) {
    pinnedCloseBtn.addEventListener("click", unpinMessage);
  }
}

export function setReplyMessage(senderName, snippet) {
  const banner = document.getElementById("chatReplyBanner");
  const senderEl = document.getElementById("chatReplySender");
  const snippetEl = document.getElementById("chatReplyTextSnippet");

  if (senderEl) senderEl.textContent = `Replying to ${senderName || 'message'}`;
  if (snippetEl) snippetEl.textContent = snippet || '';
  if (banner) banner.style.display = "flex";

  document.getElementById("shabnamChatInput")?.focus();
}

export function cancelReply() {
  const banner = document.getElementById("chatReplyBanner");
  if (banner) banner.style.display = "none";
}

export function pinMessage(text) {
  const banner = document.getElementById("chatPinnedBanner");
  const snippet = document.getElementById("chatPinnedTextSnippet");
  if (snippet) snippet.textContent = text ? (text.length > 36 ? text.slice(0, 36) + "..." : text) : "Pinned message";
  if (banner) banner.style.display = "flex";
  showInstagramToast("Message pinned 📌");
}

export function unpinMessage() {
  const banner = document.getElementById("chatPinnedBanner");
  if (banner) banner.style.display = "none";
  showInstagramToast("Message unpinned");
}

export function copyMessage(text) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showInstagramToast("Copied to clipboard"))
      .catch(() => showInstagramToast("Copied"));
  } else {
    showInstagramToast("Copied");
  }
}

export function sendMessage() {
  if (typeof window.sendShabnamMessage === "function") {
    window.sendShabnamMessage();
  }
}
