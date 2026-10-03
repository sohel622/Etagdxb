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
 * Fetch all authentic live posts directly from Supabase database ordered by created_at desc
 */
export async function fetchSupabasePosts() {
  if (!supabase) return [];

  let posts = null;

  try {
    // 1. Relational join with profiles table as requested
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        video_url,
        thumbnail_url,
        caption,
        created_at,
        user_id,
        profiles (
          username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      posts = data;
    }
  } catch (_) {}

  // 2. Fallback: Manual join if PostgREST schema cache does not have explicit foreign key constraint
  if (!posts) {
    try {
      const { data: rawPosts, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError || !Array.isArray(rawPosts) || rawPosts.length === 0) {
        return [];
      }

      const userIds = [...new Set(rawPosts.map(p => p.user_id).filter(Boolean))];
      const profilesMap = new Map();

      if (userIds.length > 0) {
        try {
          const { data: profilesList, error: profError } = await supabase
            .from("profiles")
            .select("*")
            .in("id", userIds);

          if (!profError && Array.isArray(profilesList)) {
            profilesList.forEach(pr => profilesMap.set(String(pr.id), pr));
          }
        } catch (prErr) {
          console.warn("Notice querying profiles for author metadata:", prErr);
        }
      }

      posts = rawPosts.map(post => {
        const pr = profilesMap.get(String(post.user_id)) || {};
        const usernameVal = pr.username || pr.display_name || pr.full_name || UserProfileStore.state.username || "sohel_077";
        const avatarVal = pr.avatar_url || UserProfileStore.state.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";
        return {
          ...post,
          profiles: {
            username: usernameVal,
            avatar_url: avatarVal
          },
          author_name: usernameVal,
          user: usernameVal,
          avatar: avatarVal
        };
      });
    } catch (err) {
      console.error("fetchSupabasePosts fallback exception:", err);
      return [];
    }
  }

  if (!Array.isArray(posts)) return [];

  // Normalize each post so author_name and profiles are guaranteed
  return posts.map(post => {
    let pr = post.profiles;
    if (Array.isArray(pr)) pr = pr[0];
    if (!pr || typeof pr !== 'object') pr = {};

    const usernameVal = pr.username || pr.display_name || post.author_name || (post.user && post.user !== 'flashgram_creator' ? post.user : UserProfileStore.state.username) || "sohel_077";
    const avatarVal = pr.avatar_url || post.avatar || UserProfileStore.state.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";

    return {
      ...post,
      profiles: {
        username: usernameVal,
        avatar_url: avatarVal
      },
      author_name: usernameVal,
      user: usernameVal,
      avatar: avatarVal
    };
  });
}

/**
 * Guarantee Supabase Database Insertion for newly uploaded Cloudinary video
 */
export async function savePostToSupabase({ videoUrl, thumbnailUrl, caption, userId }) {
  if (!supabase) {
    throw new Error("Supabase client is not initialized");
  }

  // Resolve authentic user ID
  let user = null;
  if (supabase.auth) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      user = authData?.user;
    } catch (_) {}
    if (!user) {
      try {
        const { data: sessData } = await supabase.auth.getSession();
        user = sessData?.session?.user;
      } catch (_) {}
    }
  }

  const effectiveUserId = userId || user?.id || null;

  const postPayload = {
    video_url: videoUrl,
    thumbnail_url: thumbnailUrl,
    caption: caption || '',
    created_at: new Date().toISOString()
  };

  if (effectiveUserId) {
    postPayload.user_id = effectiveUserId;
  }

  console.log("Inserting post into Supabase 'posts' table:", postPayload);

  // Perform exact insert into 'posts' table with .select()
  const { data, error } = await supabase
    .from('posts')
    .insert([postPayload])
    .select();

  if (error) {
    console.error("❌ Supabase Database Insertion Error:", error);
    // If error is caused by invalid string in UUID column, retry without user_id
    if (postPayload.user_id && (error.code === '22P02' || String(error.message).includes('uuid'))) {
      const retryPayload = { ...postPayload };
      delete retryPayload.user_id;
      const { data: retryData, error: retryError } = await supabase
        .from('posts')
        .insert([retryPayload])
        .select();
      if (!retryError && retryData && retryData[0]) {
        console.log("✅ Post saved to Supabase (retry without user_id):", retryData[0]);
        return retryData[0];
      }
    }
    throw error;
  }

  if (data && data[0]) {
    console.log("✅ Post successfully inserted into Supabase:", data[0]);
    return data[0];
  }

  return { ...postPayload, id: "post_" + Date.now() };
}

if (typeof window !== "undefined") {
  window.uploadVideoToCloudinary = uploadVideoToCloudinary;
  window.deriveCloudinaryThumbnailUrl = deriveCloudinaryThumbnailUrl;
  window.savePostToSupabase = savePostToSupabase;
  window.fetchSupabasePosts = fetchSupabasePosts;
  window.getAuthenticatedUserId = getAuthenticatedUserId;
}
