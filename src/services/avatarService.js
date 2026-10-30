// Avatar Storage & Live Real-Time Synchronization Service with Supabase
import { supabase } from "../supabaseClient.js";
import { UserProfileStore, showInstagramToast } from "../utils/storage.js";

let realtimeAvatarChannel = null;

export const AUTHENTIC_USER_UUID = "5611f2e8-0005-482f-9929-69d2efab41df";

// Dynamic Profile Cache across feed, reels, and profiles
export const userProfileCache = new Map();

/**
 * Deterministically generate a unique, colorful profile logo/avatar for any user ID or username
 * Ensures each user profile displays their own unique profile logo/avatar dynamically
 */
export function getUniqueUserAvatar(userId, username) {
  const seed = encodeURIComponent(String(username || userId || 'flashgram_user').trim().toLowerCase());
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

/**
 * Retrieve user display name and avatar dynamically from Supabase profiles table
 */
export async function fetchUserProfile(userId, fallbackData = {}) {
  if (!userId) return null;
  const key = String(userId);
  if (userProfileCache.has(key)) {
    return userProfileCache.get(key);
  }

  let profile = null;
  if (supabase) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name, avatar_url, email, is_verified, bio, link, website')
        .eq('id', userId)
        .maybeSingle();
      if (data) profile = data;

      if (!profile && fallbackData.email) {
        const { data: byEmail } = await supabase
          .from('profiles')
          .select('id, username, display_name, full_name, avatar_url, email, is_verified, bio, link, website')
          .eq('email', fallbackData.email)
          .maybeSingle();
        if (byEmail) profile = byEmail;
      }
    } catch (_) {}
  }

  const emailName = fallbackData.email ? fallbackData.email.split('@')[0] : '';
  const username = profile?.username || fallbackData.username || emailName || profile?.display_name || "creator";
  const displayName = profile?.display_name || profile?.full_name || fallbackData.display_name || fallbackData.name || (emailName ? emailName.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : username);
  const uniqueAvatar = getUniqueUserAvatar(userId, username);
  const avatarUrl = (profile?.avatar_url && profile.avatar_url.trim()) ? profile.avatar_url : (fallbackData.avatar_url || fallbackData.avatar || uniqueAvatar);

  const result = {
    id: userId,
    username,
    display_name: displayName,
    full_name: displayName,
    avatar_url: avatarUrl,
    avatar: avatarUrl,
    email: profile?.email || fallbackData.email || "",
    is_verified: Boolean(profile?.is_verified)
  };

  userProfileCache.set(key, result);
  return result;
}

/**
 * Batch fetch profiles from Supabase for all user IDs appearing in reels or feed posts
 */
export async function batchFetchUserProfiles(userIds = []) {
  const uniqueIds = [...new Set(userIds.filter(Boolean).map(id => String(id)))];
  const missingIds = uniqueIds.filter(id => !userProfileCache.has(id));

  if (supabase && missingIds.length > 0) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name, avatar_url, email, is_verified')
        .in('id', missingIds);

      if (Array.isArray(data)) {
        data.forEach(p => {
          if (p && p.id) {
            const uId = String(p.id);
            const emailPart = p.email ? p.email.split('@')[0] : '';
            const username = p.username || emailPart || p.display_name || "creator";
            const displayName = p.display_name || p.full_name || (emailPart ? emailPart.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : username);
            const avatarUrl = (p.avatar_url && p.avatar_url.trim()) ? p.avatar_url : getUniqueUserAvatar(uId, username);
            userProfileCache.set(uId, {
              ...p,
              username,
              display_name: displayName,
              avatar_url: avatarUrl,
              avatar: avatarUrl
            });
          }
        });
      }
    } catch (e) {
      console.warn("Notice batch fetching profiles:", e);
    }
  }

  const result = {};
  uniqueIds.forEach(id => {
    result[id] = userProfileCache.get(id) || {
      id,
      username: "creator",
      display_name: "Creator",
      avatar_url: getUniqueUserAvatar(id, "creator")
    };
  });
  return result;
}

/**
 * Deterministically convert any user ID (numeric, string, or UUID) into a valid UUID
 */
export function toValidUUID(rawId) {
  if (!rawId) return null;
  const str = String(rawId).trim();

  // Explicitly associate sohelmommy_077 or numeric ID 1 with the authentic user UUID
  if (str === "sohelmommy_077" || str === "1" || str.toLowerCase() === "sohelmommy") {
    return AUTHENTIC_USER_UUID;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str.toLowerCase();

  // Deterministically hash non-UUID strings into standard UUID format (8-4-4-4-12)
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  const part1 = ((h1 ^ (h1 >>> 16)) >>> 0).toString(16).padStart(8, '0');
  const part2 = ((h2 ^ (h2 >>> 16)) >>> 0).toString(16).padStart(8, '0');
  const part3 = ((Math.imul(parseInt(part1, 16) || 1, 31) >>> 0).toString(16) + '00000000').slice(0, 8);
  const part4 = ((Math.imul(parseInt(part2, 16) || 1, 37) >>> 0).toString(16) + '00000000').slice(0, 8);

  const hex32 = (part1 + part2 + part3 + part4).slice(0, 32);
  return `${hex32.slice(0, 8)}-${hex32.slice(8, 12)}-4${hex32.slice(13, 16)}-a${hex32.slice(17, 20)}-${hex32.slice(20, 32)}`.toLowerCase();
}

/**
 * Get current user identifier from active account, Supabase session, or localStorage
 */
export function getCurrentUserId() {
  // 1. Check cached active user UUID from Supabase Auth
  try {
    const cachedUuid = localStorage.getItem("flashgram_active_user_uuid");
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (cachedUuid && uuidRegex.test(cachedUuid)) return cachedUuid;
  } catch (_) {}

  // 2. Synchronously check Supabase token stored in localStorage (sb-*-auth-token)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const uid = parsed?.user?.id || parsed?.currentSession?.user?.id;
          if (uid) return String(uid).trim();
        }
      }
    }
  } catch (_) {}

  // 3. Check active account ID
  try {
    const activeAccId = localStorage.getItem("flashgram_active_account_id");
    if (activeAccId && activeAccId.trim()) {
      const trimmed = activeAccId.trim();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(trimmed)) return trimmed;
      return (trimmed === "1" || trimmed === "sohelmommy_077") ? AUTHENTIC_USER_UUID : trimmed;
    }
  } catch (_) {}

  // 4. Check user session
  try {
    const sessionStr = localStorage.getItem("flashgram_user_session");
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      const uid = parsed?.uid || parsed?.id;
      if (uid) {
        const trimmed = String(uid).trim();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(trimmed)) return trimmed;
        return (trimmed === "1" || trimmed === "sohelmommy_077") ? AUTHENTIC_USER_UUID : trimmed;
      }
    }
  } catch (_) {}

  try {
    if (supabase && supabase.auth) {
      if (typeof supabase.auth.user === "function") {
        const sessionUser = supabase.auth.user();
        if (sessionUser && sessionUser.id) return String(sessionUser.id).trim();
      }
    }
  } catch (_) {}

  if (UserProfileStore?.state?.id) {
    const uid = String(UserProfileStore.state.id).trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(uid)) return uid;
    return (uid === "1" || uid === "sohelmommy_077") ? AUTHENTIC_USER_UUID : uid;
  }

  return null;
}

/**
 * Resolve authentic user UUID from Supabase Auth or persistent session
 */
export async function resolveCurrentUserId() {
  // 1. Strictly prioritize live Supabase Auth getUser() call to get active logged-in user's authentic UUID
  if (supabase && supabase.auth) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        try {
          localStorage.setItem("flashgram_active_user_uuid", data.user.id);
        } catch (_) {}
        return data.user.id;
      }
    } catch (_) {}
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        try {
          localStorage.setItem("flashgram_active_user_uuid", data.session.user.id);
        } catch (_) {}
        return data.session.user.id;
      }
    } catch (_) {}
  }

  // 2. Check cached UUID from Supabase Auth
  try {
    const cachedUuid = localStorage.getItem("flashgram_active_user_uuid");
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (cachedUuid && uuidRegex.test(cachedUuid)) {
      return cachedUuid;
    }
  } catch (_) {}

  // 3. Check Supabase token stored in localStorage (sb-*-auth-token)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const uid = parsed?.user?.id || parsed?.currentSession?.user?.id;
          if (uid) return String(uid).trim();
        }
      }
    }
  } catch (_) {}

  // 4. Check active account ID only if it's a valid UUID
  try {
    const activeAccId = localStorage.getItem("flashgram_active_account_id");
    if (activeAccId && activeAccId.trim()) {
      const trimmed = activeAccId.trim();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(trimmed)) return trimmed;
    }
  } catch (_) {}

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

  // 1. Try updating by email first (safest and avoids 42P10 constraint error)
  const currentEmail = UserProfileStore.state.email || "";
  const isNumeric = /^\d+$/.test(String(uid));

  const payload = {
    username: userUsername,
    full_name: userFullName,
    display_name: userFullName || userUsername,
    avatar_url: userAvatar,
    updated_at: new Date().toISOString()
  };
  if (currentEmail) payload.email = currentEmail;
  if (isNumeric) payload.id = Number(uid);

  if (currentEmail) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('email', currentEmail)
        .select();
      if (!error && data && data[0]) {
        return data[0];
      }
    } catch (_) {}
  }

  // 2. Try update by numeric ID
  if (isNumeric) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', Number(uid))
        .select();
      if (!error && data && data[0]) {
        return data[0];
      }
    } catch (_) {}
  }

  // 3. Fallback upsert without onConflict: 'id'
  try {
    const { data } = await supabase
      .from('profiles')
      .upsert(payload)
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

  // 3. Live Sync all Home Feed post cards authored strictly by this user
  const postCards = document.querySelectorAll(".post-card");
  const validCurrentUUID = toValidUUID(currentUserId);
  postCards.forEach(card => {
    const cardUserId = card.dataset.userId;
    const isCurrentUserPost = card.dataset.currentUserPost === "true" ||
      (cardUserId && (
        String(cardUserId).toLowerCase() === String(currentUserId).toLowerCase() ||
        (validCurrentUUID && String(cardUserId).toLowerCase() === String(validCurrentUUID).toLowerCase())
      ));

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

  // 4. Live Sync all Reels cards authored strictly by this user
  const reelItems = document.querySelectorAll(".reel-item");
  reelItems.forEach(item => {
    const reelUserId = item.dataset.userId;
    const isCurrentUserReel = item.dataset.isCurrentUser === "true" ||
      (reelUserId && (
        String(reelUserId).toLowerCase() === String(currentUserId).toLowerCase() ||
        (validCurrentUUID && String(reelUserId).toLowerCase() === String(validCurrentUUID).toLowerCase())
      ));

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

  const profileAvatar = document.getElementById("profileMainAvatarImg") || document.getElementById("mainProfileAvatarImg");
  if (profileAvatar && newAvatar) profileAvatar.src = newAvatar;

  const profileTopUsername = document.getElementById("profileTopBarUsername") || document.getElementById("profileHeaderUsername");
  if (profileTopUsername && newUsername) profileTopUsername.textContent = newUsername;

  const profileFullName = document.getElementById("profileFullNameText") || document.getElementById("profileDisplayName");
  if (profileFullName && newName) profileFullName.textContent = newName;

  const navUserAvatar = document.querySelector(".nav-btn[data-id='profile'] img");
  if (navUserAvatar && newAvatar) navUserAvatar.src = newAvatar;

  document.querySelectorAll(".profile-nav-circle img").forEach(img => {
    if (newAvatar) img.src = newAvatar;
  });

  // 6. Broadcast custom event
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("flashgram:profile-updated", {
      detail: { userId: currentUserId, username: newUsername, avatarUrl: newAvatar, name: newName }
    }));
  }
}

/**
 * Upload profile photo to Supabase Storage bucket ('avatars') under filename ${currentUser.id}/avatar_${Date.now()}.png
 * and immediately update the 'profiles' table.
 */
export async function uploadUserAvatar(fileOrBlob, customUserId = null) {
  if (!fileOrBlob || !supabase) return null;

  let currentAuthUser = null;
  if (supabase.auth) {
    try {
      const { data } = await supabase.auth.getUser();
      currentAuthUser = data?.user;
    } catch (_) {}
    if (!currentAuthUser) {
      try {
        const { data: sessData } = await supabase.auth.getSession();
        currentAuthUser = sessData?.session?.user;
      } catch (_) {}
    }
  }

  const userId = customUserId || currentAuthUser?.id || (await resolveCurrentUserId());
  const fileName = `${userId}/avatar_${Date.now()}.png`;

  let publicUrl = null;

  // 1. Upload image to Supabase Storage bucket 'avatars' under filename ${currentUser.id}/avatar_${Date.now()}.png
  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, fileOrBlob, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: true
      });

    if (!uploadError && uploadData) {
      // 2. Retrieve the public URL via supabase.storage.from('avatars').getPublicUrl(fileName)
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      publicUrl = publicUrlData?.publicUrl;
      console.log("✅ Avatar uploaded to Supabase Storage:", publicUrl);
    } else if (uploadError) {
      console.warn("Supabase Storage bucket upload error:", uploadError.message);
    }
  } catch (storageErr) {
    console.warn("Supabase Storage exception:", storageErr);
  }

  // Fallback to Cloudinary or base64 data URL if storage upload failed
  if (!publicUrl) {
    try {
      const formData = new FormData();
      formData.append("file", fileOrBlob, "avatar.png");
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

  // 3. Immediately update the profiles table:
  // await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
  try {
    const currentEmail = UserProfileStore.state.email || "";
    const isNum = /^\d+$/.test(String(userId));
    let updated = false;

    if (currentEmail) {
      const { data: byEmail, error: errEmail } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('email', currentEmail)
        .select();
      if (!errEmail && byEmail && byEmail.length > 0) updated = true;
    }

    if (!updated && isNum) {
      const { data: byId, error: errId } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', Number(userId))
        .select();
      if (!errId && byId && byId.length > 0) updated = true;
    }

    if (!updated) {
      const upsertData = {
        avatar_url: publicUrl,
        username: UserProfileStore.state.username || "creator",
        display_name: UserProfileStore.state.name || "User",
        updated_at: new Date().toISOString()
      };
      if (currentEmail) upsertData.email = currentEmail;
      if (isNum) upsertData.id = Number(userId);

      await supabase.from('profiles').upsert(upsertData);
    }
  } catch (dbErr) {
    console.warn("Notice updating profiles table with avatar_url:", dbErr);
  }

  // 4. Update active auth/profile state across the app so the new avatar renders immediately
  // in the profile tab, bottom navigation icon, and Home/Reels feeds without reverting on page reload
  localStorage.setItem("user_custom_avatar_data", publicUrl);
  try {
    const sessionStr = localStorage.getItem("flashgram_user_session");
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      parsed.photoURL = publicUrl;
      parsed.avatar = publicUrl;
      localStorage.setItem("flashgram_user_session", JSON.stringify(parsed));
    }
  } catch (_) {}

  try {
    const saved = localStorage.getItem("flashgram_saved_accounts");
    if (saved) {
      const accounts = JSON.parse(saved);
      if (Array.isArray(accounts)) {
        const acc = accounts.find(a => String(a.id) === String(userId));
        if (acc) {
          acc.avatar = publicUrl;
          localStorage.setItem("flashgram_saved_accounts", JSON.stringify(accounts));
        }
      }
    }
  } catch (_) {}

  UserProfileStore.setState({ avatar: publicUrl });
  if (UserProfileStore.syncDOM) {
    UserProfileStore.syncDOM();
  }

  const mainAvatar = document.getElementById("mainProfileAvatarImg");
  if (mainAvatar) mainAvatar.src = publicUrl;

  const previewAvatar = document.getElementById("editProfileAvatarPreview");
  if (previewAvatar) previewAvatar.src = publicUrl;

  const navAvatar = document.querySelector(".nav-btn[data-id='profile'] img");
  if (navAvatar) navAvatar.src = publicUrl;

  const profileCircleImg = document.querySelector(".profile-nav-circle img");
  if (profileCircleImg) profileCircleImg.src = publicUrl;

  const storyAvatar = document.getElementById("myStoryAvatarImg");
  if (storyAvatar) storyAvatar.src = publicUrl;

  liveSyncUserProfile(userId, {
    avatarUrl: publicUrl
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
  window.resolveCurrentUserId = resolveCurrentUserId;
  window.toValidUUID = toValidUUID;
  window.updateUserProfileState = updateUserProfileState;
  window.syncProfileToSupabase = syncProfileToSupabase;
  window.liveSyncUserProfile = liveSyncUserProfile;
  window.fetchUserProfile = fetchUserProfile;
  window.batchFetchUserProfiles = batchFetchUserProfiles;
  window.userProfileCache = userProfileCache;
  window.getUniqueUserAvatar = getUniqueUserAvatar;
}

