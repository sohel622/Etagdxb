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
 * Path: ${userId}/avatar_${Date.now()}.jpg
 * Update 'profiles' table with avatar_url: publicUrl
 */
export async function uploadUserAvatar(fileOrBlob, customUserId = null) {
  if (!fileOrBlob || !supabase) return null;

  const userId = customUserId || getCurrentUserId();
  const filePath = `${userId}/avatar_${Date.now()}.jpg`;

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
      console.error(
        "%c🚨 Supabase Storage Error (check RLS / bucket permissions):",
        "background: #ef4444; color: white; font-weight: bold; padding: 2px 6px; border-radius: 4px;",
        uploadError.message || uploadError
      );
      if (uploadError.statusCode) {
        console.error("HTTP Status Code:", uploadError.statusCode);
      }
      throw uploadError;
    }

    // 2. Fetch Public URL
    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData && publicUrlData.publicUrl ? publicUrlData.publicUrl : null;
    if (!publicUrl) {
      throw new Error("Could not resolve public URL from Supabase Storage");
    }

    // 3. Immediately update the 'profiles' table
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) {
        console.warn("Profiles update notice, running upsert fallback:", updateError.message);
        await supabase
          .from("profiles")
          .upsert({
            id: userId,
            avatar_url: publicUrl,
            username: UserProfileStore.state.username,
            full_name: UserProfileStore.state.name,
            updated_at: new Date().toISOString()
          }, { onConflict: "id" });
      }
    } catch (e) {
      console.error("Profiles table update error:", e);
    }

    // 4. Refresh the global auth/user state so the new logo displays across the entire app without page reload
    UserProfileStore.setState({ avatar: publicUrl });

    // Update localStorage user session with permanent Supabase URL (NOT raw base64 data)
    try {
      const savedSession = localStorage.getItem("flashgram_user_session");
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        parsed.photoURL = publicUrl;
        localStorage.setItem("flashgram_user_session", JSON.stringify(parsed));
      }
      localStorage.setItem("user_custom_avatar_data", publicUrl);
    } catch (_) {}

    return publicUrl;
  } catch (err) {
    console.error("uploadUserAvatar exception:", err);
    throw err;
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
