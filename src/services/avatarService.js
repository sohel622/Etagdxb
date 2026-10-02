// Avatar Storage & Live Real-Time Synchronization Service with Supabase
import { supabase } from "../supabaseClient.js";
import { UserProfileStore, showInstagramToast } from "../utils/storage.js";

let realtimeAvatarChannel = null;

/**
 * Get current user identifier from Supabase session or localStorage
 */
export function getCurrentUserId() {
  try {
    if (supabase && supabase.auth) {
      const user = (supabase.auth.getUser && typeof supabase.auth.getUser === "function") 
        ? null 
        : (supabase.auth.user ? supabase.auth.user() : null);
      if (user && user.id) return user.id;
    }
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

  return "user_" + (UserProfileStore.state.username || "sohel_077");
}

/**
 * Upload profile photo to Supabase Storage bucket ('avatars')
 * Path: ${userId}/${Date.now()}.jpg
 * Upsert into 'profiles' table with avatar_url: publicUrl
 */
export async function uploadUserAvatar(fileOrBlob, customUserId = null) {
  if (!fileOrBlob || !supabase) return null;

  const userId = customUserId || getCurrentUserId();
  const filePath = `${userId}/${Date.now()}.jpg`;

  try {
    // 1. Upload to Supabase Storage 'avatars' bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, fileOrBlob, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: true
      });

    if (uploadError) {
      console.warn("Supabase avatar upload notice:", uploadError.message);
      // If error might be bucket structure, attempt fallback without directory prefix
      const fallbackPath = `${userId}_${Date.now()}.jpg`;
      const { error: fallbackError } = await supabase.storage
        .from("avatars")
        .upload(fallbackPath, fileOrBlob, {
          contentType: "image/jpeg",
          upsert: true
        });
      if (fallbackError) {
        console.warn("Fallback upload notice:", fallbackError.message);
      }
    }

    // 2. Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData && publicUrlData.publicUrl ? publicUrlData.publicUrl : null;
    if (!publicUrl) return null;

    // 3. Upsert into Supabase 'profiles' table
    try {
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          avatar_url: publicUrl,
          username: UserProfileStore.state.username,
          full_name: UserProfileStore.state.name,
          updated_at: new Date().toISOString()
        }, { onConflict: "id" });

      if (upsertError) {
        console.warn("Profiles upsert note:", upsertError.message);
      }
    } catch (e) {
      console.warn("Profiles upsert exception:", e);
    }

    // 4. Update local state & trigger instant DOM synchronization
    UserProfileStore.setState({ avatar: publicUrl });

    // Update localStorage user session with permanent avatar
    try {
      const savedSession = localStorage.getItem("flashgram_user_session");
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        parsed.photoURL = publicUrl;
        localStorage.setItem("flashgram_user_session", JSON.stringify(parsed));
      }
    } catch (_) {}

    return publicUrl;
  } catch (err) {
    console.error("uploadUserAvatar exception:", err);
    return null;
  }
}

/**
 * Handle Real-Time Profile Updates
 */
function updateUserProfileState(newProfile) {
  if (!newProfile) return;

  const updates = {};
  if (newProfile.avatar_url && newProfile.avatar_url !== UserProfileStore.state.avatar) {
    updates.avatar = newProfile.avatar_url;
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
    UserProfileStore.setState(updates);
    if (typeof showInstagramToast === "function") {
      showInstagramToast("Profile avatar synced in real-time ⚡");
    }
  }
}

/**
 * Live Real-Time Avatar Synchronization Across App
 * Subscribes to postgres_changes on the 'profiles' table
 */
export function initAvatarRealtimeSync(userId = null) {
  if (!supabase) return;

  const currentUserId = userId || getCurrentUserId();
  if (!currentUserId) return;

  // Clean up any existing channel
  if (realtimeAvatarChannel) {
    try {
      supabase.removeChannel(realtimeAvatarChannel);
    } catch (_) {}
    realtimeAvatarChannel = null;
  }

  try {
    // Exact requested channel pattern:
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
}
