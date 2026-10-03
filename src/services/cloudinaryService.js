// Cloudinary Direct Upload Service for Flashgram
import { supabase } from "../supabaseClient.js";
import { showInstagramToast } from "../utils/storage.js";

export const CLOUD_NAME = 
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) || 
  (typeof process !== "undefined" && process.env && process.env.VITE_CLOUDINARY_CLOUD_NAME) || 
  (typeof window !== "undefined" && window.CLOUDINARY_CLOUD_NAME) || 
  'yrfaotod';

export const UPLOAD_PRESET = 
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET) || 
  (typeof process !== "undefined" && process.env && process.env.VITE_CLOUDINARY_UPLOAD_PRESET) || 
  (typeof window !== "undefined" && window.CLOUDINARY_UPLOAD_PRESET) || 
  'flashgram_videos';

export const API_KEY = 
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_CLOUDINARY_API_KEY) || 
  (typeof process !== "undefined" && process.env && process.env.VITE_CLOUDINARY_API_KEY) || 
  (typeof window !== "undefined" && window.CLOUDINARY_API_KEY) || 
  '414958444676865';

export const CLOUDINARY_VIDEO_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

/**
 * Derive high-quality poster frame URL from Cloudinary video URL
 * Replaces video extension (.mp4, .webm, etc.) with .jpg
 */
export function deriveCloudinaryThumbnailUrl(secureUrl) {
  if (!secureUrl || typeof secureUrl !== "string") return "";
  // Ensure we get a crisp first-frame JPG snapshot
  return secureUrl.replace(/\.[^/.]+$/, ".jpg");
}

/**
 * Upload video directly to Cloudinary (unsigned preset)
 * @param {File|Blob} file - The raw video File object or recorded Blob
 * @param {Function} [onProgress] - Optional upload progress callback (percent 0-100)
 * @returns {Promise<{ secure_url: string, thumbnail_url: string, public_id: string }>}
 */
export async function uploadVideoToCloudinary(file, onProgress) {
  const formData = new FormData();
  if (file instanceof Blob && !(file instanceof File)) {
    formData.append("file", file, "recorded_reel.webm");
  } else {
    formData.append("file", file);
  }
  formData.append("upload_preset", UPLOAD_PRESET || "flashgram_videos");
  formData.append("resource_type", "video");
  if (API_KEY) {
    formData.append("api_key", API_KEY);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME || 'yrfaotod'}/video/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);

    if (xhr.upload && typeof onProgress === "function") {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      // Must receive HTTP 200 / 201 before proceeding
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const data = JSON.parse(xhr.responseText);
          const secure_url = data.secure_url || data.url;
          if (!secure_url) {
            reject(new Error("Cloudinary response missing secure_url"));
            return;
          }
          const thumbnail_url = deriveCloudinaryThumbnailUrl(secure_url);
          resolve({
            ...data,
            secure_url,
            thumbnail_url,
            public_id: data.public_id
          });
        } catch (err) {
          reject(new Error("Failed to parse Cloudinary response: " + err.message));
        }
      } else {
        let errMsg = "Cloudinary upload failed";
        try {
          const errData = JSON.parse(xhr.responseText);
          errMsg = errData.error?.message || errMsg;
        } catch (_) {}
        reject(new Error(`${errMsg} (status: ${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during Cloudinary video upload"));
    };

    xhr.send(formData);
  });
}

/**
 * Retrieve authenticated user ID using supabase.auth.getUser()
 */
export async function getAuthenticatedUserId() {
  if (supabase && supabase.auth) {
    try {
      if (typeof supabase.auth.getUser === "function") {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data && data.user && data.user.id) {
          return data.user.id;
        }
      }
    } catch (_) {}
    try {
      if (typeof supabase.auth.user === "function") {
        const user = supabase.auth.user();
        if (user && user.id) return user.id;
      }
    } catch (_) {}
  }

  // Fallback to locally stored active session
  try {
    const sessionStr = localStorage.getItem("flashgram_user_session");
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed && (parsed.uid || parsed.id)) {
        return parsed.uid || parsed.id;
      }
    }
  } catch (_) {}

  return null;
}

/**
 * Fetch all live posts from Supabase joined with author profile (posts.user_id = profiles.id)
 */
export async function fetchSupabasePosts() {
  if (!supabase) return [];

  try {
    // 1. Relational join with profiles: posts.user_id = profiles.id
    let { data, error } = await supabase
      .from("posts")
      .select("*, profiles:user_id(id, username, full_name, avatar_url)")
      .order("created_at", { ascending: false });

    if (error) {
      // Try standard syntax without alias
      const res = await supabase
        .from("posts")
        .select("*, profiles(id, username, full_name, avatar_url)")
        .order("created_at", { ascending: false });
      data = res.data;
      error = res.error;
    }

    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }

    // Fallback: If foreign key is not formally defined in PostgREST schema cache,
    // fetch posts then batch-query profiles and join manually on posts.user_id = profiles.id
    const { data: rawPosts, error: rawError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!rawError && Array.isArray(rawPosts) && rawPosts.length > 0) {
      const userIds = [...new Set(rawPosts.map(p => p.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        try {
          const { data: profilesList } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .in("id", userIds);

          if (Array.isArray(profilesList)) {
            const profilesMap = new Map(profilesList.map(pr => [pr.id, pr]));
            return rawPosts.map(post => ({
              ...post,
              profiles: profilesMap.get(post.user_id) || null
            }));
          }
        } catch (_) {}
      }
      return rawPosts;
    }
  } catch (err) {
    console.warn("Supabase posts query note:", err);
  }

  try {
    const { data: reelsData, error: reelsError } = await supabase
      .from("reels")
      .select("*, profiles:user_id(id, username, full_name, avatar_url)")
      .order("created_at", { ascending: false });

    if (!reelsError && Array.isArray(reelsData) && reelsData.length > 0) {
      return reelsData;
    }
  } catch (_) {}

  return [];
}

/**
 * Insert new post row into Supabase 'posts' or 'reels' table
 */
export async function savePostToSupabase({ videoUrl, thumbnailUrl, caption, userId }) {
  if (!supabase) return null;

  try {
    const activeUserId = userId || (await getAuthenticatedUserId());
    const postPayload = {
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      user_id: activeUserId || "anonymous_user",
      caption: caption || "Uploaded Video Post! ✨ #lifestyle",
      created_at: new Date().toISOString()
    };

    // Try 'posts' table first with select including profiles
    let savedRecord = null;
    const { data, error } = await supabase
      .from("posts")
      .insert([postPayload])
      .select("*, profiles:user_id(id, username, full_name, avatar_url)");

    if (!error && Array.isArray(data) && data[0]) {
      savedRecord = data[0];
    } else {
      const res = await supabase.from("posts").insert([postPayload]).select();
      if (!res.error && res.data && res.data[0]) {
        savedRecord = res.data[0];
      } else {
        // Fallback try 'reels' table
        const { data: reelsData, error: reelsError } = await supabase
          .from("reels")
          .insert([postPayload])
          .select();

        if (!reelsError && reelsData && reelsData[0]) {
          savedRecord = reelsData[0];
        }
      }
    }

    if (savedRecord) {
      if (!savedRecord.profiles && activeUserId) {
        try {
          const { data: prData } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .eq("id", activeUserId)
            .maybeSingle();
          if (prData) {
            savedRecord.profiles = prData;
          }
        } catch (_) {}
      }
      return savedRecord;
    }

    return { ...postPayload, id: "post_" + Date.now() };
  } catch (err) {
    console.warn("Exception saving post to Supabase:", err);
    return null;
  }
}

if (typeof window !== "undefined") {
  window.uploadVideoToCloudinary = uploadVideoToCloudinary;
  window.deriveCloudinaryThumbnailUrl = deriveCloudinaryThumbnailUrl;
  window.savePostToSupabase = savePostToSupabase;
  window.fetchSupabasePosts = fetchSupabasePosts;
  window.getAuthenticatedUserId = getAuthenticatedUserId;
}
