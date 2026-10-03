// Follow System Controller (Supabase & Local Real-time Persistence)
import { supabase } from "../supabaseClient.js";
import { getCurrentUserId } from "./avatarService.js";
import { showInstagramToast, UserProfileStore } from "../utils/storage.js";

const STORAGE_KEY_FOLLOWS = "flashgram_user_follows";

/**
 * Get the set of user IDs that the current user is following
 */
export function getFollowingList() {
  const currentUserId = getCurrentUserId();
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_FOLLOWS}_${currentUserId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

/**
 * Check if the current user is following a target user ID
 */
export function isFollowingUser(targetUserId) {
  if (!targetUserId) return false;
  if (targetUserId === "shabnam_ai") {
    try {
      return localStorage.getItem("flashgram_following_shabnam") === "true";
    } catch (_) {
      return false;
    }
  }
  const followingList = getFollowingList();
  return followingList.includes(String(targetUserId));
}

/**
 * Toggle follow / unfollow for a target user ID
 */
export async function toggleFollowUser(targetUserId, targetUsername = "user") {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    if (typeof showInstagramToast === "function") {
      showInstagramToast("Please log in to follow users");
    }
    return false;
  }

  if (String(currentUserId) === String(targetUserId)) {
    return false;
  }

  // Shabnam AI special case
  if (targetUserId === "shabnam_ai") {
    const currentState = localStorage.getItem("flashgram_following_shabnam") === "true";
    const newState = !currentState;
    localStorage.setItem("flashgram_following_shabnam", String(newState));
    showInstagramToast(newState ? "Following @shabnam_ai ✨" : "Unfollowed @shabnam_ai");
    return newState;
  }

  let list = getFollowingList();
  const isCurrentlyFollowing = list.includes(String(targetUserId));
  let isNowFollowing = false;

  if (isCurrentlyFollowing) {
    list = list.filter(id => id !== String(targetUserId));
    isNowFollowing = false;
    showInstagramToast(`Unfollowed @${targetUsername}`);
  } else {
    list.push(String(targetUserId));
    isNowFollowing = true;
    showInstagramToast(`Following @${targetUsername} ✨`);
  }

  // 1. Save locally for instant reactivity
  try {
    localStorage.setItem(`${STORAGE_KEY_FOLLOWS}_${currentUserId}`, JSON.stringify(list));
  } catch (_) {}

  // 2. Update UserProfileStore following count
  try {
    UserProfileStore.setFollowingCount(list.length);
  } catch (_) {}

  // 3. Persist to Supabase follows table
  if (supabase) {
    try {
      if (isNowFollowing) {
        await supabase
          .from("follows")
          .insert({
            follower_id: currentUserId,
            following_id: targetUserId,
            created_at: new Date().toISOString()
          });
      } else {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);
      }
    } catch (sbErr) {
      console.warn("Notice updating Supabase follows table:", sbErr);
    }
  }

  // 4. Update all follow buttons in DOM matching this user
  updateFollowButtonsInDOM(targetUserId, isNowFollowing);

  return isNowFollowing;
}

/**
 * Update all follow buttons across the app for this user
 */
export function updateFollowButtonsInDOM(userId, isFollowing) {
  document.querySelectorAll(`[data-follow-user-id="${userId}"]`).forEach(btn => {
    btn.dataset.isFollowing = String(isFollowing);
    if (btn.classList.contains("post-feed-follow-btn")) {
      btn.textContent = isFollowing ? "• Following" : "• Follow";
      btn.className = isFollowing 
        ? "post-feed-follow-btn text-[12px] font-semibold text-neutral-400 hover:text-neutral-500 ml-1.5 cursor-pointer"
        : "post-feed-follow-btn text-[12px] font-semibold text-sky-500 hover:text-sky-600 ml-1.5 cursor-pointer";
    } else if (btn.classList.contains("profile-follow-btn")) {
      btn.textContent = isFollowing ? "Following" : "Follow";
      btn.className = isFollowing
        ? "profile-follow-btn yt-full-pill-btn following"
        : "profile-follow-btn yt-full-pill-btn yt-follow-btn";
    }
  });
}

/**
 * Sync initial following list from Supabase
 */
export async function syncFollowingFromSupabase() {
  const currentUserId = getCurrentUserId();
  if (!currentUserId || !supabase) return;

  try {
    const { data, error } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUserId);

    if (!error && Array.isArray(data)) {
      const ids = data.map(item => String(item.following_id));
      localStorage.setItem(`${STORAGE_KEY_FOLLOWS}_${currentUserId}`, JSON.stringify(ids));
      UserProfileStore.setFollowingCount(ids.length);
    }
  } catch (_) {}
}

if (typeof window !== "undefined") {
  window.isFollowingUser = isFollowingUser;
  window.toggleFollowUser = toggleFollowUser;
  window.getFollowingList = getFollowingList;
}
