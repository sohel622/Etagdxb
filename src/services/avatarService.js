// Avatar Storage & Live Real-Time Synchronization Service with Supabase
import { supabase } from "../supabaseClient.js";
import { UserProfileStore, showInstagramToast } from "../utils/storage.js";

let realtimeAvatarChannel = null;

/**
 * Get current user identifier from Supabase session or localStorage
 */
export function getCurrentUserId() {
  try {
    const activeAccId = localStorage.getItem("flashgram_active_account_id");
    if (activeAccId && activeAccId.trim()) return activeAccId.trim();
  } catch (_) {}

  try {
    const sessionStr = localStorage.getItem("flashgram_user_session");
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed && (parsed.uid || parsed.id)) {
        return parsed.uid || parsed.id;
      }
    }
  } catch (_) {}

  try {
    if (supabase && supabase.auth) {
      if (typeof supabase.auth.user === "function") {
        const sessionUser = supabase.auth.user();
        if (sessionUser && sessionUser.id) return sessionUser.id;
      }
    }
  } catch (_) {}

  return UserProfileStore.state.username ? "user_" + UserProfileStore.state.username : "5611f2e8-0005-482f-9929-69d2efab41df";
}

/**
 * Resolve authentic user UUID from Supabase Auth
 */
export async function resolveCurrentUserId() {
  try {
    const activeAccId = localStorage.getItem("flashgram_active_account_id");
    if (activeAccId && activeAccId.trim()) return activeAccId.trim();
  } catch (_) {}

  if (supabase && supabase.auth) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) return data.user.id;
    } catch (_) {}
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) return data.session.user.id;
    } catch (_) {}
  }
  return getCurrentUserId();
}

/**
 * Upsert profile data in Supabase 'profiles' table
 */
export async function syncProfileToSupabase({ id, username, full_name, avatar_url }) {
  if (!supabase) return null;
  const uid = id || (await resolveCurrentUserId());
  const userUsername = username || UserProfileStore.state.username || "sohel_077";
  const userFullName = full_name || UserProfileStore.state.name || "Sohel";
  const userAvatar = avatar_url || UserProfileStore.state.avatar || "";

  // 1. Primary requested upsert: { id, username, full_name, avatar_url }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: uid,
        username: userUsername,
        full_name: userFullName,
        avatar_url: userAvatar
      }, { onConflict: 'id' })
      .select();

    if (!error && data) {
      console.log("✅ Profile successfully upserted to Supabase 'profiles':", data);
      return data[0];
    }
  } catch (_) {}

  // 2. Fallback upsert for schema using display_name
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: uid,
        display_name: userUsername || userFullName,
        avatar_url: userAvatar
      }, { onConflict: 'id' })
      .select();

    if (!error && data) {
      console.log("✅ Profile upserted with display_name:", data);
      return data[0];
    }
  } catch (_) {}

  // 3. Fallback direct update
  try {
    const { data } = await supabase
      .from('profiles')
      .update({
        display_name: userUsername,
        avatar_url: userAvatar
      })
      .eq('id', uid)
      .select();

    if (data && data[0]) return data[0];
  } catch (_) {}

  return null;
}

/**
 * Live Sync user avatar & username across all views, post cards, and reels in the app
 */
export function liveSyncUserProfile(userId, { username, avatarUrl, name } = {}) {
  const currentUserId = userId || getCurrentUserId();
  const newUsername = username || UserProfileStore.state.username;
  const newAvatar = avatarUrl || UserProfileStore.state.avatar;
  const newName = name || UserProfileStore.state.name;

  // 1. Update global store
  UserProfileStore.setState({
    ...(username ? { username: newUsername } : {}),
    ...(avatarUrl ? { avatar: newAvatar } : {}),
    ...(name ? { name: newName } : {})
  });
  if (UserProfileStore.syncDOM) {
    UserProfileStore.syncDOM();
  }

  // 2. Update persistent session
  try {
    const savedSession = localStorage.getItem("flashgram_user_session");
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      if (newAvatar) parsed.photoURL = newAvatar;
      if (newUsername) parsed.username = newUsername;
      if (newName) parsed.displayName = newName;
      localStorage.setItem("flashgram_user_session", JSON.stringify(parsed));
    }
    if (newAvatar) localStorage.setItem("user_custom_avatar_data", newAvatar);
  } catch (_) {}

  // 3. Live Sync all Home Feed post cards authored by this user
  const postCards = document.querySelectorAll(".post-card");
  postCards.forEach(card => {
    const cardUserId = card.dataset.userId;
    const isCurrentUserPost = card.dataset.currentUserPost === "true" ||
      (cardUserId && (cardUserId === String(currentUserId) || cardUserId.includes("sohel") || cardUserId.includes(newUsername)));

    if (isCurrentUserPost) {
      if (newUsername) {
        const usernameEl = card.querySelector(".post-username");
        if (usernameEl) usernameEl.textContent = newUsername;
        const captionUserEl = card.querySelector(".caption-user");
        if (captionUserEl) captionUserEl.textContent = newUsername;
      }
      if (newAvatar) {
        const avatarImg = card.querySelector(".post-avatar img");
        if (avatarImg) avatarImg.src = newAvatar;
      }
    }
  });

  // 4. Live Sync all Reels cards authored by this user
  const reelItems = document.querySelectorAll(".reel-item");
  reelItems.forEach(item => {
    const reelUserId = item.dataset.userId;
    const isCurrentUserReel = item.dataset.isCurrentUser === "true" ||
      (reelUserId && (reelUserId === String(currentUserId) || reelUserId.includes("sohel") || reelUserId.includes(newUsername)));

    if (isCurrentUserReel) {
      if (newUsername) {
        const rUsername = item.querySelector(".reels-username");
        if (rUsername) rUsername.textContent = newUsername;
      }
      if (newAvatar) {
        const rAvatar = item.querySelector(".reels-user-avatar");
        if (rAvatar) rAvatar.src = newAvatar;
      }
    }
  });

  // 5. Update Story avatar & Profile header & Bottom navbar avatar
  const storyAvatar = document.getElementById("myStoryAvatarImg");
  if (storyAvatar && newAvatar) storyAvatar.src = newAvatar;

  const profileAvatar = document.getElementById("profileMainAvatarImg");
  if (profileAvatar && newAvatar) profileAvatar.src = newAvatar;

  const profileTopUsername = document.getElementById("profileTopBarUsername");
  if (profileTopUsername && newUsername) profileTopUsername.textContent = newUsername;

  const profileFullName = document.getElementById("profileFullNameText");
  if (profileFullName && newName) profileFullName.textContent = newName;

  const navUserAvatar = document.querySelector(".nav-btn[data-id='profile'] img");
  if (navUserAvatar && newAvatar) navUserAvatar.src = newAvatar;

  // 6. Broadcast custom event
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("flashgram:profile-updated", {
      detail: { userId: currentUserId, username: newUsername, avatarUrl: newAvatar, name: newName }
    }));
  }
}

/**
 * Upload profile photo to Supabase Storage bucket ('avatars') or directly update 'profiles'
 */
export async function uploadUserAvatar(fileOrBlob, customUserId = null) {
  if (!fileOrBlob || !supabase) return null;

  const userId = customUserId || (await resolveCurrentUserId());
  const filePath = `${userId}/avatar_${Date.now()}.jpg`;

  let publicUrl = null;

  // 1. Attempt upload to Supabase Storage 'avatars' bucket
  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, fileOrBlob, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: true
      });

    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      publicUrl = publicUrlData?.publicUrl;
    } else if (uploadError) {
      console.warn("Supabase Storage bucket upload note:", uploadError.message);
    }
  } catch (storageErr) {
    console.warn("Supabase Storage note:", storageErr);
  }

  // 2. If storage upload encountered an RLS policy issue, fall back to Cloudinary upload or direct image URL
  if (!publicUrl) {
    try {
      const formData = new FormData();
      formData.append("file", fileOrBlob, "avatar.jpg");
      formData.append("upload_preset", "flashgram_videos");
      formData.append("resource_type", "image");

      const response = await fetch("https://api.cloudinary.com/v1_1/yrfaotod/image/upload", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const cldJson = await response.json();
        if (cldJson && cldJson.secure_url) {
          publicUrl = cldJson.secure_url;
        }
      }
    } catch (cldErr) {
      console.warn("Cloudinary avatar fallback note:", cldErr);
    }

    // Direct data URL fallback if remote storage network fails
    if (!publicUrl && fileOrBlob instanceof Blob) {
      publicUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(fileOrBlob);
      });
    }
  }

  if (!publicUrl) {
    throw new Error("Could not process avatar image");
  }

  // 3. Upsert profile data into Supabase 'profiles' table
  const userUsername = UserProfileStore.state.username || "sohel_077";
  const userFullName = UserProfileStore.state.name || "Sohel";
  await syncProfileToSupabase({
    id: userId,
    username: userUsername,
    full_name: userFullName,
    avatar_url: publicUrl
  });

  // 4. Live sync across all views immediately
  liveSyncUserProfile(userId, {
    avatarUrl: publicUrl,
    username: userUsername,
    name: userFullName
  });

  return publicUrl;
}

/**
 * Handle Real-Time Profile Updates from Postgres changes
 */
function updateUserProfileState(newProfile) {
  if (!newProfile) return;

  const updates = {};
  if (newProfile.avatar_url && newProfile.avatar_url !== UserProfileStore.state.avatar) {
    updates.avatarUrl = newProfile.avatar_url;
  }
  if (newProfile.full_name && newProfile.full_name !== UserProfileStore.state.name) {
    updates.name = newProfile.full_name;
  }
  if (newProfile.display_name && newProfile.display_name !== UserProfileStore.state.name) {
    updates.name = newProfile.display_name;
  }
  if (newProfile.username && newProfile.username !== UserProfileStore.state.username) {
    updates.username = newProfile.username;
  }

  if (Object.keys(updates).length > 0) {
    liveSyncUserProfile(newProfile.id, updates);
    if (typeof showInstagramToast === "function") {
      showInstagramToast("Profile avatar synced in real-time ⚡");
    }
  }
}

/**
 * Live Real-Time Avatar Synchronization Across App
 */
export function initAvatarRealtimeSync(userId = null) {
  if (!supabase) return;

  const currentUserId = userId || getCurrentUserId();
  if (!currentUserId) return;

  if (realtimeAvatarChannel) {
    try {
      supabase.removeChannel(realtimeAvatarChannel);
    } catch (_) {}
    realtimeAvatarChannel = null;
  }

  try {
    realtimeAvatarChannel = supabase
      .channel(`public:profiles:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${currentUserId}`
        },
        (payload) => {
          if (payload && payload.new) {
            updateUserProfileState(payload.new);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${currentUserId}`
        },
        (payload) => {
          if (payload && payload.new) {
            updateUserProfileState(payload.new);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Supabase Realtime subscribed for user profile:", currentUserId);
        }
      });
  } catch (err) {
    console.warn("Realtime subscription note:", err);
  }
}

if (typeof window !== "undefined") {
  window.uploadUserAvatar = uploadUserAvatar;
  window.initAvatarRealtimeSync = initAvatarRealtimeSync;
  window.getCurrentUserId = getCurrentUserId;
  window.updateUserProfileState = updateUserProfileState;
  window.syncProfileToSupabase = syncProfileToSupabase;
  window.liveSyncUserProfile = liveSyncUserProfile;
}

