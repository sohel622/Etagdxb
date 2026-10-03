// DirectChat Component (User-to-User Instagram Direct Messages)
import { 
  getConversationIdForUsers, 
  getConversationMessages, 
  sendDirectMessage, 
  setActiveDirectChatConversationId, 
  markConversationAsRead, 
  getSavedConversations 
} from "../services/chatService.js";
import { getCurrentUserId } from "../services/avatarService.js";
import { UserProfileStore } from "../utils/storage.js";
import { switchTab } from "./BottomNavigation.js";

let activeDirectChatUser = null;

/**
 * Open Direct Chat with a specific user
 */
export function openDirectChatWithUser(user) {
  if (!user || !user.id) return;
  activeDirectChatUser = user;

  const currentUserId = getCurrentUserId();
  const convId = getConversationIdForUsers(currentUserId, user.id);
  setActiveDirectChatConversationId(convId);

  // 1. Ensure tab is switched to messages
  if (typeof switchTab === "function") {
    switchTab("messages");
  }

  // 2. Hide other chat views and show Direct Chat view
  const chatsListContainer = document.getElementById("chatsListContainer");
  const shabnamChatContainer = document.getElementById("shabnamChatContainer");
  let directChatContainer = document.getElementById("directUserChatContainer");

  if (chatsListContainer) chatsListContainer.style.display = "none";
  if (shabnamChatContainer) shabnamChatContainer.style.display = "none";

  if (!directChatContainer) {
    directChatContainer = createDirectChatContainerDOM();
    const chatsView = document.getElementById("chatsView");
    if (chatsView) chatsView.appendChild(directChatContainer);
  }

  directChatContainer.style.display = "flex";

  // 3. Update header info
  const avatarImg = document.getElementById("directChatHeaderAvatar");
  const nameEl = document.getElementById("directChatHeaderName");
  const userEl = document.getElementById("directChatHeaderUsername");

  if (avatarImg) avatarImg.src = user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";
  if (nameEl) nameEl.textContent = user.name || user.username || "Flashgram User";
  if (userEl) userEl.textContent = user.username || "user";

  // 4. Render messages
  renderActiveDirectChatMessages();

  // 5. Mark as read
  markConversationAsRead(convId);
}

/**
 * Close Direct Chat and return to conversations list
 */
export function closeDirectChat() {
  setActiveDirectChatConversationId(null);
  activeDirectChatUser = null;

  const directChatContainer = document.getElementById("directUserChatContainer");
  const chatsListContainer = document.getElementById("chatsListContainer");

  if (directChatContainer) directChatContainer.style.display = "none";
  if (chatsListContainer) {
    chatsListContainer.style.display = "flex";
  }

  // Refresh conversations list in chats view
  if (typeof window.renderChatsList === "function") {
    window.renderChatsList();
  }
}

/**
 * Render messages in the active Direct Chat thread
 */
export function renderActiveDirectChatMessages() {
  const container = document.getElementById("directChatMessagesList");
  if (!container || !activeDirectChatUser) return;

  const currentUserId = getCurrentUserId();
  const convId = getConversationIdForUsers(currentUserId, activeDirectChatUser.id);
  const messages = getConversationMessages(convId);

  if (messages.length === 0) {
    container.innerHTML = `
      <div class="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center select-none my-auto">
        <div class="w-16 h-16 rounded-full overflow-hidden mb-3 border-2 border-neutral-700 bg-neutral-800 shrink-0">
          <img src="${activeDirectChatUser.avatar}" class="w-full h-full object-cover" alt="" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';" />
        </div>
        <h4 class="font-bold text-[16px] text-neutral-900 dark:text-white">${activeDirectChatUser.name || activeDirectChatUser.username}</h4>
        <p class="text-[12px] text-neutral-400 mt-0.5">@${activeDirectChatUser.username}</p>
        <p class="text-[12.5px] text-neutral-500 dark:text-neutral-400 max-w-[240px] mt-4">
          Direct message thread. Say hi and start your conversation! ✨
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = messages.map(msg => {
    const isMe = String(msg.sender_id) === String(currentUserId);
    const timeFormatted = formatMessageTime(msg.created_at);

    if (isMe) {
      return `
        <div class="flex flex-col items-end my-1 px-2 select-text">
          <div class="max-w-[75%] px-3.5 py-2 rounded-2xl rounded-tr-xs bg-[#0095f6] text-white text-[14px] leading-relaxed shadow-xs break-words">
            ${escapeHtml(msg.text)}
          </div>
          <span class="text-[10px] text-neutral-400 mt-1 mr-1">${timeFormatted}</span>
        </div>
      `;
    } else {
      return `
        <div class="flex items-end gap-2 my-1 px-2 select-text">
          <img src="${activeDirectChatUser.avatar}" class="w-7 h-7 rounded-full object-cover shrink-0 mb-4" alt="" />
          <div class="flex flex-col items-start max-w-[75%]">
            <div class="px-3.5 py-2 rounded-2xl rounded-tl-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white text-[14px] leading-relaxed break-words shadow-xs">
              ${escapeHtml(msg.text)}
            </div>
            <span class="text-[10px] text-neutral-400 mt-1 ml-1">${timeFormatted}</span>
          </div>
        </div>
      `;
    }
  }).join("");

  // Scroll to bottom
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

/**
 * Send message from direct chat input
 */
export async function handleSendDirectMessageSubmit() {
  const input = document.getElementById("directChatTextInput");
  if (!input || !activeDirectChatUser) return;

  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  await sendDirectMessage(activeDirectChatUser, text);
  renderActiveDirectChatMessages();
}

/**
 * Format message ISO string to friendly time
 */
function formatMessageTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return "";
  }
}

/**
 * Helper to escape HTML safely
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Create Direct Chat container DOM
 */
function createDirectChatContainerDOM() {
  const container = document.createElement("div");
  container.id = "directUserChatContainer";
  container.className = "relative flex flex-col h-full overflow-hidden bg-white dark:bg-black text-neutral-900 dark:text-white";
  container.style.display = "none";

  container.innerHTML = `
    <!-- Top Header -->
    <header class="flex items-center justify-between px-3 h-[54px] border-b border-neutral-100 dark:border-neutral-800 shrink-0 bg-white/95 dark:bg-black/95 backdrop-blur-md z-10">
      <div class="flex items-center gap-2.5 min-w-0">
        <button type="button" class="icon-btn shrink-0" onclick="closeDirectChat()" title="Back to chats">
          <i class="fa-solid fa-arrow-left text-[17px]"></i>
        </button>
        <div class="relative cursor-pointer shrink-0">
          <img id="directChatHeaderAvatar" src="" class="w-9 h-9 rounded-full object-cover border border-neutral-200 dark:border-neutral-700" alt="" />
          <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-black"></span>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1 leading-tight">
            <span id="directChatHeaderName" class="font-bold text-[14.5px] text-neutral-900 dark:text-white truncate">User</span>
          </div>
          <div class="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
            @<span id="directChatHeaderUsername">user</span> • Active now
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0 text-neutral-600 dark:text-neutral-300">
        <button type="button" class="icon-btn" onclick="showInstagramToast('Starting audio call...')">
          <i class="fa-solid fa-phone text-[15px]"></i>
        </button>
        <button type="button" class="icon-btn" onclick="showInstagramToast('Starting video call...')">
          <i class="fa-solid fa-video text-[16px]"></i>
        </button>
      </div>
    </header>

    <!-- Messages Container -->
    <div class="flex-1 overflow-y-auto px-2 py-3 space-y-2" id="directChatMessagesList">
      <!-- Dynamically populated -->
    </div>

    <!-- Bottom Input Bar -->
    <div class="p-2.5 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black shrink-0 flex items-center gap-2">
      <button type="button" class="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0" onclick="showInstagramToast('Photo sharing')">
        <i class="fa-solid fa-camera text-[14px]"></i>
      </button>

      <div class="flex-1 flex items-center bg-neutral-100 dark:bg-neutral-900 rounded-full px-3.5 py-1.5 border border-neutral-200/80 dark:border-neutral-800">
        <input 
          type="text" 
          id="directChatTextInput" 
          placeholder="Message..." 
          class="w-full bg-transparent border-none outline-none text-[14px] text-neutral-900 dark:text-white placeholder:text-neutral-400"
          onkeydown="if(event.key === 'Enter') handleSendDirectMessageSubmit()"
        />
      </div>

      <button 
        type="button" 
        id="directChatSendBtn" 
        onclick="handleSendDirectMessageSubmit()" 
        class="text-sky-500 hover:text-sky-600 font-bold text-[14px] px-2.5 py-1.5 cursor-pointer shrink-0"
      >
        Send
      </button>
    </div>
  `;

  return container;
}

if (typeof window !== "undefined") {
  window.openDirectChatWithUser = openDirectChatWithUser;
  window.closeDirectChat = closeDirectChat;
  window.renderActiveDirectChatMessages = renderActiveDirectChatMessages;
  window.handleSendDirectMessageSubmit = handleSendDirectMessageSubmit;
}
