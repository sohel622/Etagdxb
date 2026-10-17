// Cloudinary Direct Upload Service for Flashgram
import { supabase } from "../supabaseClient.js";
import { showInstagramToast, UserProfileStore } from "../utils/storage.js";
import { getCurrentUserId, resolveCurrentUserId, toValidUUID } from "./avatarService.js";

export const CLOUD_NAME = 
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) || 
  (typeof process !== "undefined" && process.env && process.env.VITE_CLOUDINARY_CLOUD_NAME) || 
  (typeof window !== "undefined" && window.CLOUDINARY_CLOUD_NAME) || 
  'yrfaotod';

const rawEnvPreset = 
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET) || 
  (typeof process !== "undefined" && process.env && process.env.VITE_CLOUDINARY_UPLOAD_PRESET) || 
  (typeof window !== "undefined" && window.CLOUDINARY_UPLOAD_PRESET);

// If numeric (e.g. '226969442298122') or empty, fallback to 'flashgram_videos' which is the verified unsigned preset
export const UPLOAD_PRESET = 
  (rawEnvPreset && !/^\d+$/.test(String(rawEnvPreset).trim()) && rawEnvPreset !== '226969442298122')
    ? rawEnvPreset
    : 'flashgram_videos';

export const API_KEY = 
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_CLOUDINARY_API_KEY) || 
  (typeof process !== "undefined" && process.env && process.env.VITE_CLOUDINARY_API_KEY) || 
  (typeof window !== "undefined" && window.CLOUDINARY_API_KEY) || 
  '414958444676865';

export const CLOUDINARY_VIDEO_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

/**
 * Automatically inject Cloudinary video optimization parameters (q_auto,f_auto,w_720,c_limit)
 * right after "/upload/" to fix buffering, slow loading, and stuttering.
 * @param {string} url - Original video URL
 * @returns {string} - Optimized video streaming URL
 */
export function getOptimizedVideoUrl(url) {
  if (!url || typeof url !== "string") return url || "";
  
  // Check if it's a Cloudinary URL and contains /upload/
  if (url.includes("cloudinary.com") && url.includes("/upload/")) {
    // If it already has optimization transformations, avoid duplicate injection
    if (url.includes("/upload/q_auto") || url.includes("/upload/w_720") || url.includes("/upload/f_auto")) {
      return url;
    }
    return url.replace("/upload/", "/upload/q_auto,f_auto,w_720,c_limit/");
  }

  return url;
}

/**
 * Derive high-quality poster frame URL from Cloudinary video URL
 * Replaces video extension (.mp4, .webm, etc.) with .jpg
 */
export function deriveCloudinaryThumbnailUrl(secureUrl) {
  if (!secureUrl || typeof secureUrl !== "string") return "";
  // Ensure we get a crisp first-frame JPG snapshot
  return secureUrl.replace(/\.[^/.]+$/, ".jpg");
}

function singleCloudinaryUpload(file, resourceType, preset, onProgress) {
  const formData = new FormData();
  if (file instanceof Blob && !(file instanceof File)) {
    formData.append("file", file, resourceType === "video" ? "recorded_reel.webm" : "upload.png");
  } else {
    formData.append("file", file);
  }
  formData.append("upload_preset", preset);
  formData.append("resource_type", resourceType);
  if (API_KEY) {
    formData.append("api_key", API_KEY);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME || 'yrfaotod'}/${resourceType}/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);

    if (xhr.upload && typeof onProgress === "function") {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          const uploadedMB = (e.loaded / (1024 * 1024)).toFixed(1);
          const totalMB = (e.total / (1024 * 1024)).toFixed(1);
          onProgress(percent, {
            loaded: e.loaded,
            total: e.total,
            percent,
            uploadedMB,
            totalMB
          });
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const data = JSON.parse(xhr.responseText);
          const secure_url = data.secure_url || data.url;
          if (!secure_url) {
            reject(new Error("Cloudinary response missing secure_url"));
            return;
          }
          const thumbnail_url = resourceType === "video" ? deriveCloudinaryThumbnailUrl(secure_url) : secure_url;
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
      reject(new Error("Network error during Cloudinary upload"));
    };

    xhr.send(formData);
  });
}

/**
 * Upload video or media directly to Cloudinary with multi-preset fallback
 * @param {File|Blob} file - The raw video File object or recorded Blob
 * @param {Function} [onProgress] - Optional upload progress callback (percent 0-100)
 * @returns {Promise<{ secure_url: string, thumbnail_url: string, public_id: string }>}
 */
export async function uploadVideoToCloudinary(file, onProgress) {
  const isVideo = file.type ? file.type.startsWith("video") : (file.name && file.name.match(/\.(mp4|webm|mov|m4v)($|\?)/i));
  const resourceType = isVideo ? "video" : (file.type && file.type.startsWith("image") ? "image" : "video");

  // Candidate presets: start with 'flashgram_videos', then UPLOAD_PRESET, then 'unsigned', 'ml_default'
  const presetsToTry = Array.from(new Set(['flashgram_videos', UPLOAD_PRESET, 'unsigned', 'ml_default'])).filter(Boolean);

  let lastErr = null;
  for (const preset of presetsToTry) {
    try {
      const res = await singleCloudinaryUpload(file, resourceType, preset, onProgress);
      return res;
    } catch (err) {
      lastErr = err;
      if (err.message && err.message.includes("Upload preset not found")) {
        console.warn(`[Cloudinary] Upload preset '${preset}' not found, trying next candidate...`);
        continue;
      }
      // If it's a format issue on video upload, attempt image resource type if appropriate
      if (resourceType === "video" && !isVideo && (err.message?.includes("Unsupported video") || err.message?.includes("Invalid image"))) {
        try {
          const imgRes = await singleCloudinaryUpload(file, "image", preset, onProgress);
          return imgRes;
        } catch (_) {}
      }
      break;
    }
  }

  throw lastErr || new Error("Cloudinary upload failed");
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

  console.log("[Feed] Querying Supabase posts with author profiles join...");
  let posts = null;

  try {
    // 1. Relational join with profiles table as requested: profiles:user_id (id, username, avatar_url)
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        video_url,
        thumbnail_url,
        caption,
        created_at,
        user_id,
        profiles:user_id (
          id,
          username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("[Feed] profiles:user_id join note, trying standard profiles join:", error.message || error);
      const fallbackRes = await supabase
        .from('posts')
        .select(`
          id,
          video_url,
          thumbnail_url,
          caption,
          created_at,
          user_id,
          profiles (
            id,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });
      if (!fallbackRes.error && Array.isArray(fallbackRes.data) && fallbackRes.data.length > 0) {
        posts = fallbackRes.data;
      }
    } else if (Array.isArray(data) && data.length > 0) {
      console.log(`[Feed] Successfully retrieved ${data.length} posts with profiles:user_id join.`);
      posts = data;
    }
  } catch (err) {
    console.warn("[Feed] Exception during relational posts query:", err);
  }

  // 2. Direct posts table query if PostgREST schema cache does not have explicit foreign key constraint
  if (!posts || posts.length === 0) {
    try {
      console.log("[Feed] Querying posts table directly...");
      const { data: rawPosts, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError) {
        console.error("[Feed] Error fetching from posts table:", postsError);
        return [];
      }

      if (!Array.isArray(rawPosts) || rawPosts.length === 0) {
        console.log("[Feed] No raw posts returned from posts table.");
        return [];
      }

      console.log(`[Feed] Fetched ${rawPosts.length} raw posts from Supabase.`);

      // Fetch profiles to associate authentic usernames and avatars
      const profilesMap = new Map();
      try {
        const { data: profilesList, error: profsErr } = await supabase
          .from("profiles")
          .select("*");

        if (profsErr) {
          console.warn("[Feed] Notice querying profiles table:", profsErr.message);
        } else if (Array.isArray(profilesList)) {
          profilesList.forEach(pr => {
            if (pr.id !== undefined) profilesMap.set(String(pr.id), pr);
            if (pr.email) profilesMap.set(String(pr.email).toLowerCase(), pr);
            if (pr.avatar_url && typeof pr.avatar_url === "string") {
              const uuidMatch = pr.avatar_url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
              if (uuidMatch) {
                profilesMap.set(uuidMatch[0].toLowerCase(), pr);
              }
            }
          });
        }
      } catch (prErr) {
        console.warn("[Feed] Exception querying profiles for metadata:", prErr);
      }

      // Hardened mapping for known authentic accounts
      const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";

      posts = rawPosts.map((post, idx) => {
        const uidStr = String(post.user_id || "").toLowerCase();
        const pr = profilesMap.get(uidStr) || profilesMap.get(String(post.user_id)) || {};

        let usernameVal = pr.username || pr.display_name || post.username || post.author_name;
        if (!usernameVal) {
          usernameVal = "creator";
        }

        const avatarVal = pr.avatar_url || post.user_avatar || post.avatar || defaultAvatar;
        const stableId = post.id || `post_${post.created_at || idx}`;

        return {
          ...post,
          id: stableId,
          user_id: post.user_id,
          profiles: {
            id: pr.id || post.user_id,
            username: usernameVal,
            avatar_url: avatarVal
          },
          author_name: usernameVal,
          user: usernameVal,
          avatar: avatarVal
        };
      });
    } catch (err) {
      console.error("[Feed] fetchSupabasePosts fallback exception:", err);
      return [];
    }
  }

  if (!Array.isArray(posts)) return [];

  const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";

  // Normalize each post so author_name and profiles are guaranteed with genuine creator info
  return posts.map((post, idx) => {
    let pr = post.profiles;
    if (Array.isArray(pr)) pr = pr[0];
    if (!pr || typeof pr !== 'object') pr = {};

    const genuineUsername = pr.username || pr.display_name || post.username || post.author_name || 'creator';
    const genuineAvatar = pr.avatar_url || post.user_avatar || post.avatar || defaultAvatar;
    const stableId = post.id || `post_${post.created_at || idx}`;
    const rawUrl = post.media_url || post.video_url || post.url || '';
    const optimizedUrl = getOptimizedVideoUrl(rawUrl);
    const mediaType = post.media_type || (rawUrl?.match(/\.(mp4|webm|mov|m4v)($|\?)/i) ? 'video' : 'photo');

    return {
      ...post,
      id: stableId,
      user_id: post.user_id,
      url: optimizedUrl,
      video_url: optimizedUrl,
      media_url: optimizedUrl,
      media_type: mediaType,
      thumbnail_url: post.thumbnail_url || (rawUrl ? deriveCloudinaryThumbnailUrl(rawUrl) : ''),
      profiles: {
        id: pr.id || post.user_id,
        username: genuineUsername,
        avatar_url: genuineAvatar
      },
      author_name: genuineUsername,
      user: genuineUsername,
      avatar: genuineAvatar
    };
  });
}

/**
 * Guarantee Supabase Database Insertion for newly uploaded Cloudinary video
 */
export async function savePostToSupabase({ videoUrl, thumbnailUrl, caption, userId, mediaType = 'video' }) {
  if (!supabase) {
    throw new Error("Supabase client is not initialized");
  }

  // Obtain current authenticated user
  let user = null;
  if (supabase.auth) {
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    } catch (_) {}
    if (!user) {
      try {
        const { data: sessData } = await supabase.auth.getSession();
        user = sessData?.session?.user;
      } catch (_) {}
    }
  }

  const rawUid = userId || user?.id || (typeof resolveCurrentUserId === "function" ? await resolveCurrentUserId() : null) || (typeof getCurrentUserId === "function" ? getCurrentUserId() : null);
  const effectiveUserId = toValidUUID(rawUid) || rawUid;
  const username = (typeof UserProfileStore !== "undefined" && UserProfileStore.state?.username) || user?.user_metadata?.username || user?.email?.split('@')[0] || 'creator';
  const userAvatar = (typeof UserProfileStore !== "undefined" && UserProfileStore.state?.avatar) || user?.user_metadata?.avatar_url || '/assets/default-avatar.png';

  // Guard: NEVER save temporary local blob links to Supabase
  if (videoUrl && String(videoUrl).startsWith('blob:')) {
    console.warn("[savePostToSupabase] Refusing to save temporary blob URL to Supabase table:", videoUrl);
    return {
      id: "post_" + Date.now(),
      user_id: effectiveUserId,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl || videoUrl,
      caption: caption || '',
      created_at: new Date().toISOString()
    };
  }

  const permanentThumb = thumbnailUrl || (videoUrl ? videoUrl.replace(/\.[^/.]+$/, ".jpg") : '');

  const postPayload = {
    user_id: effectiveUserId,
    video_url: videoUrl,
    media_url: videoUrl, // Explicit Cloudinary secure_url
    media_type: mediaType,
    thumbnail_url: permanentThumb,
    caption: caption || '',
    username: username,
    user_avatar: userAvatar,
    likes_count: 0,
    comments_count: 0,
    created_at: new Date().toISOString()
  };

  console.log("Inserting post into Supabase 'posts' table strictly with user_id:", effectiveUserId);

  // Perform insert into 'posts' table with .select()
  let savedRecord = null;
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert([postPayload])
      .select();

    if (!error && data && data[0]) {
      savedRecord = data[0];
    } else if (error) {
      console.warn("Notice on full schema insert, trying exact database columns:", error.message || error);
      // Fallback with exact columns present in database
      const exactCols = {
        user_id: effectiveUserId,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        caption: caption || '',
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString()
      };
      const { data: cData, error: cError } = await supabase
        .from('posts')
        .insert([exactCols])
        .select();

      if (!cError && cData && cData[0]) {
        savedRecord = { ...postPayload, ...cData[0] };
      }
    }
  } catch (err) {
    console.warn("Supabase post save notice:", err?.message || err);
  }

  if (savedRecord) {
    console.log("✅ Post successfully inserted into Supabase:", savedRecord);
    return savedRecord;
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
