// Direct Messaging & Supabase Realtime Chat Service
import { supabase } from "../supabaseClient.js";
import { getCurrentUserId, getUniqueUserAvatar } from "./avatarService.js";
import { UserProfileStore } from "../utils/storage.js";

const STORAGE_KEY_CONVERSATIONS = "flashgram_dm_conversations";
const STORAGE_KEY_MESSAGES = "flashgram_dm_messages";

let realtimeChannel = null;
let activeDirectChatConversationId = null;

/**
 * Get deterministic conversation ID between two user IDs
 */
export function getConversationIdForUsers(uid1, uid2) {
  if (!uid1 || !uid2) return `conv_${Date.now()}`;
  const sorted = [String(uid1), String(uid2)].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
}

/**
 * Retrieve saved conversations from local cache
 */
export function getSavedConversations() {
  const currentUserId = getCurrentUserId();
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_CONVERSATIONS}_${currentUserId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

/**
 * Save conversations to local cache
 */
export function saveConversations(list) {
  const currentUserId = getCurrentUserId();
  try {
    localStorage.setItem(`${STORAGE_KEY_CONVERSATIONS}_${currentUserId}`, JSON.stringify(list));
  } catch (_) {}
}

/**
 * Get messages for a conversation
 */
export function getConversationMessages(conversationId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_MESSAGES}_${conversationId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

/**
 * Save messages for a conversation
 */
export function saveConversationMessages(conversationId, messages) {
  try {
    localStorage.setItem(`${STORAGE_KEY_MESSAGES}_${conversationId}`, JSON.stringify(messages));
  } catch (_) {}
}

/**
 * Calculate total unread messages count for active user
 */
export function getUnreadMessagesCount() {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return 0;

  const conversations = getSavedConversations();
  let totalUnread = 0;

  conversations.forEach(conv => {
    const messages = getConversationMessages(conv.id);
    const unreadInConv = messages.filter(m => 
      String(m.recipient_id) === String(currentUserId) && !m.is_read
    ).length;
    totalUnread += unreadInConv;
  });

  return totalUnread;
}

/**
 * Update Bottom Nav Chat icon unread badge
 */
export function updateChatNavUnreadBadge() {
  const badge = document.getElementById("chatNavUnreadBadge");
  if (!badge) return;

  const unreadCount = getUnreadMessagesCount();
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

/**
 * Mark messages in a conversation as read
 */
export async function markConversationAsRead(conversationId) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId || !conversationId) return;

  const messages = getConversationMessages(conversationId);
  let changed = false;

  const updatedMessages = messages.map(m => {
    if (String(m.recipient_id) === String(currentUserId) && !m.is_read) {
      changed = true;
      return { ...m, is_read: true };
    }
    return m;
  });

  if (changed) {
    saveConversationMessages(conversationId, updatedMessages);
    updateChatNavUnreadBadge();

    // Sync to Supabase
    if (supabase) {
      try {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .eq("recipient_id", currentUserId);
      } catch (err) {
        console.warn("Notice updating is_read in Supabase:", err);
      }
    }
  }
}

/**
 * Send a direct message to a user
 */
export async function sendDirectMessage(recipient, text) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId || !recipient || !text.trim()) return null;

  const convId = getConversationIdForUsers(currentUserId, recipient.id);
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  const newMsg = {
    id: msgId,
    conversation_id: convId,
    sender_id: currentUserId,
    recipient_id: String(recipient.id),
    text: text.trim(),
    is_read: false,
    created_at: timestamp
  };

  // 1. Optimistically append message to local messages store
  const existingMsgs = getConversationMessages(convId);
  existingMsgs.push(newMsg);
  saveConversationMessages(convId, existingMsgs);

  // 2. Update conversation summary
  const conversations = getSavedConversations();
  const existingConvIdx = conversations.findIndex(c => c.id === convId);
  const convObj = {
    id: convId,
    user_id: recipient.id,
    name: recipient.name || recipient.username || "Creator",
    username: recipient.username || "creator",
    avatar: recipient.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
    lastMessage: text.trim(),
    time: "Just now",
    updated_at: timestamp
  };

  if (existingConvIdx >= 0) {
    conversations[existingConvIdx] = { ...conversations[existingConvIdx], ...convObj };
  } else {
    conversations.unshift(convObj);
  }
  saveConversations(conversations);

  // 3. Broadcast via Supabase Realtime channel 'public:messages'
  if (!realtimeChannel && supabase) {
    initRealtimeMessagesListener();
  }

  const channelToUse = realtimeChannel || (supabase ? supabase.channel("public:messages") : null);
  if (channelToUse) {
    try {
      channelToUse.send({
        type: "broadcast",
        event: "new_message",
        payload: newMsg
      });
      channelToUse.send({
        type: "broadcast",
        event: "message",
        payload: newMsg
      });
    } catch (bcErr) {
      console.warn("Realtime broadcast notice:", bcErr);
    }
  }

  // Cross-tab broadcast receiver support
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("flashgram_public_messages");
      bc.postMessage(newMsg);
      bc.close();
    }
  } catch (_) {}

  // 4. Insert into Supabase messages table if available
  if (supabase) {
    try {
      await supabase.from("messages").insert(newMsg);
    } catch (err) {
      // Postgres table optional; realtime broadcast channel delivers messages instantly
    }
  }

  return newMsg;
}

/**
 * Handle incoming message payload from Supabase Realtime
 */
export function handleIncomingMessage(msg) {
  if (!msg || !msg.id || !msg.conversation_id) return;

  const currentUserId = getCurrentUserId();
  const isForMe = String(msg.recipient_id).toLowerCase() === String(currentUserId).toLowerCase();
  const isFromMe = String(msg.sender_id).toLowerCase() === String(currentUserId).toLowerCase();

  const activeUser = (typeof window !== "undefined" && window.activeDirectChatUser) || null;
  const isChattingWithParty = activeUser && (
    String(activeUser.id).toLowerCase() === String(msg.sender_id).toLowerCase() ||
    String(activeUser.id).toLowerCase() === String(msg.recipient_id).toLowerCase() ||
    String(activeUser.username).toLowerCase() === String(msg.sender_id).toLowerCase()
  );

  if (!isForMe && !isFromMe && !isChattingWithParty) return;

  // Append if not already in conversation messages
  const messages = getConversationMessages(msg.conversation_id);
  const exists = messages.some(m => m.id === msg.id);
  if (!exists) {
    messages.push(msg);
    saveConversationMessages(msg.conversation_id, messages);
  }

  // Update conversation entry in saved conversations
  const conversations = getSavedConversations();
  const convIdx = conversations.findIndex(c => c.id === msg.conversation_id);
  if (convIdx >= 0) {
    conversations[convIdx].lastMessage = msg.text;
    conversations[convIdx].time = "Just now";
    conversations[convIdx].updated_at = msg.created_at || new Date().toISOString();
    saveConversations(conversations);
  }

  // If chat is currently open and active for this conversation, mark read and re-render messages immediately
  if (activeDirectChatConversationId === msg.conversation_id || isChattingWithParty) {
    markConversationAsRead(msg.conversation_id);
    if (typeof window.renderActiveDirectChatMessages === "function") {
      window.renderActiveDirectChatMessages();
    }
  } else if (isForMe && !msg.is_read) {
    updateChatNavUnreadBadge();
  }

  // Refresh chats conversations list
  if (typeof window.renderChatsList === "function") {
    window.renderChatsList();
  }
}

/**
 * Set active open conversation ID
 */
export function setActiveDirectChatConversationId(convId) {
  activeDirectChatConversationId = convId;
  if (convId) {
    markConversationAsRead(convId);
  }
}

/**
 * Format raw user profile row
 */
function formatProfileUser(u) {
  const emailPart = u.email ? u.email.split('@')[0] : '';
  const handle = u.username || emailPart || (u.display_name ? u.display_name.toLowerCase().replace(/\s+/g, '_') : "creator");
  const displayName = u.display_name || u.full_name || (emailPart ? emailPart.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : handle);
  const avatar = u.avatar_url || getUniqueUserAvatar(u.id, handle);
  return {
    id: u.id,
    username: handle,
    name: displayName,
    avatar: avatar,
    bio: u.bio,
    email: u.email
  };
}

/**
 * Live query Supabase profiles by name, username, or email for instant search results
 */
export async function searchSupabaseUsers(query) {
  if (!query || !query.trim()) return [];
  const clean = query.trim().replace(/^@/, "");

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, full_name, avatar_url, bio, email")
      .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%,full_name.ilike.%${clean}%,email.ilike.%${clean}%`)
      .limit(20);

    if (error) {
      console.warn("Supabase user search error:", error.message);
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, full_name, avatar_url, bio, email")
        .limit(50);
      if (allProfiles) {
        return allProfiles
          .filter(u => 
            (u.username && u.username.toLowerCase().includes(clean.toLowerCase())) ||
            (u.display_name && u.display_name.toLowerCase().includes(clean.toLowerCase())) ||
            (u.full_name && u.full_name.toLowerCase().includes(clean.toLowerCase())) ||
            (u.email && u.email.toLowerCase().includes(clean.toLowerCase()))
          )
          .map(u => formatProfileUser(u));
      }
      return [];
    }

    return (data || []).map(u => formatProfileUser(u));
  } catch (err) {
    console.warn("Error querying Supabase profiles:", err);
    return [];
  }
}

/**
 * Initialize Supabase Realtime Direct Messaging Listener (supabase.channel('public:messages'))
 */
export function initRealtimeMessagesListener() {
  if (!supabase) return;

  try {
    if (realtimeChannel) {
      try { supabase.removeChannel(realtimeChannel); } catch (_) {}
    }

    // Subscribe strictly to supabase.channel('public:messages')
    realtimeChannel = supabase
      .channel("public:messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if (payload && payload.new) {
          handleIncomingMessage(payload.new);
        }
      })
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        if (payload) {
          handleIncomingMessage(payload);
        }
      })
      .on("broadcast", { event: "message" }, ({ payload }) => {
        if (payload) {
          handleIncomingMessage(payload);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("⚡ Supabase Realtime Messages channel subscribed: 'public:messages'");
        }
      });
  } catch (err) {
    console.warn("Supabase Realtime messages channel init notice:", err);
  }

  // Cross-tab broadcast listener
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("flashgram_public_messages");
      bc.onmessage = (event) => {
        if (event.data) {
          handleIncomingMessage(event.data);
        }
      };
    }
  } catch (_) {}

  // Initial badge update
  updateChatNavUnreadBadge();
}

if (typeof window !== "undefined") {
  window.sendDirectMessage = sendDirectMessage;
  window.updateChatNavUnreadBadge = updateChatNavUnreadBadge;
  window.markConversationAsRead = markConversationAsRead;
  window.searchSupabaseUsers = searchSupabaseUsers;
  window.initRealtimeMessagesListener = initRealtimeMessagesListener;
}
