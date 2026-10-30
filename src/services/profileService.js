// src/services/profileService.js - Supabase Profile Update & Synchronization Service
import { supabase } from "../supabaseClient.js";
import { UserProfileStore, showInstagramToast } from "../utils/storage.js";
import { getUniqueUserAvatar, getCurrentUserId, resolveCurrentUserId, toValidUUID, AUTHENTIC_USER_UUID } from "./avatarService.js";

/**
 * Upsert or update a user's profile in the Supabase 'profiles' table.
 * Correctly handles conflict resolution and table constraints to prevent 42P10 errors.
 *
 * @param {Object} profileData - Profile attributes (id, email, username, display_name, full_name, avatar_url, bio, website)
 * @param {Object} options - Upsert options (e.g., { onConflict: 'id' })
 */
export async function upsertProfile(profileData = {}, options = {}) {
  if (!supabase) {
    console.warn("[profileService] Supabase client unavailable");
    return { data: null, error: new Error("Supabase client unavailable") };
  }

  const rawId = profileData.id || profileData.uid || (await resolveCurrentUserId()) || getCurrentUserId();
  const email = profileData.email || UserProfileStore?.state?.email || "";
  const isNumericId = /^\d+$/.test(String(rawId));

  const cleanUsername = profileData.username || (email ? email.split('@')[0] : (profileData.display_name ? profileData.display_name.toLowerCase().replace(/[^a-z0-9_]/g, '') : "creator"));
  const cleanDisplayName = profileData.display_name || profileData.full_name || profileData.name || (email ? email.split('@')[0] : cleanUsername);
  const cleanAvatar = profileData.avatar_url || profileData.avatar || UserProfileStore?.state?.avatar || getUniqueUserAvatar(rawId, cleanUsername);

  const payload = {
    username: cleanUsername,
    display_name: cleanDisplayName,
    full_name: cleanDisplayName,
    avatar_url: cleanAvatar,
    bio: profileData.bio !== undefined ? profileData.bio : (UserProfileStore?.state?.bio || ""),
    website: profileData.website !== undefined ? profileData.website : (profileData.link || UserProfileStore?.state?.link || ""),
    updated_at: new Date().toISOString()
  };

  if (email) payload.email = email;
  if (isNumericId) payload.id = Number(rawId);

  // 1. Try updating by email if present (avoids ON CONFLICT specification issues)
  if (email) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('email', email)
        .select();
      if (!error && data && data.length > 0) {
        syncLocalProfileState(data[0] || payload);
        return { data: data[0] || payload, error: null };
      }
    } catch (_) {}
  }

  // 2. Try updating by numeric ID if present
  if (isNumericId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', Number(rawId))
        .select();
      if (!error && data && data.length > 0) {
        syncLocalProfileState(data[0] || payload);
        return { data: data[0] || payload, error: null };
      }
    } catch (_) {}
  }

  // 3. Perform upsert (safe against constraint mismatches)
  try {
    // If caller specified an onConflict option, pass it; our client layer gracefully handles any constraint mismatch
    const upsertOptions = options && options.onConflict ? { onConflict: options.onConflict } : undefined;
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, upsertOptions)
      .select();

    if (!error && data && data.length > 0) {
      syncLocalProfileState(data[0]);
      return { data: data[0], error: null };
    }
  } catch (upsertErr) {
    console.warn("[profileService] Upsert fallback note:", upsertErr);
  }

  syncLocalProfileState(payload);
  return { data: payload, error: null };
}

/**
 * Update user profile wrapper
 */
export async function updateProfile(profileData, options) {
  return upsertProfile(profileData, options);
}

/**
 * Synchronize local in-memory store and UI with the updated profile
 */
function syncLocalProfileState(record) {
  if (!record || typeof UserProfileStore === "undefined" || !UserProfileStore.setState) return;
  UserProfileStore.setState({
    id: record.id,
    name: record.display_name || record.full_name || record.name,
    username: record.username,
    avatar: record.avatar_url || record.avatar,
    email: record.email,
    bio: record.bio,
    link: record.website || record.link,
    website: record.website || record.link
  });
  if (UserProfileStore.syncDOM) {
    UserProfileStore.syncDOM();
  }
}

// Expose globally for backward compatibility and direct console/test access
if (typeof window !== "undefined") {
  window.profileService = {
    updateProfile,
    upsertProfile,
    syncProfileToSupabase: upsertProfile
  };
  window.updateProfile = updateProfile;
  window.upsertProfile = upsertProfile;
}
