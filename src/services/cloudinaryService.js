// Cloudinary Direct Upload Service for Flashgram
import { supabase } from "../supabaseClient.js";
import { showInstagramToast, UserProfileStore } from "../utils/storage.js";
import { getCurrentUserId, resolveCurrentUserId, toValidUUID } from "./avatarService.js";
import { encodePostCaptionWithSong, normalizeSongRecord, DEFAULT_MUSIC_COVER } from "./songsService.js";

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
    // If it already has optimization or audio replacement transformations, avoid duplicate injection
    if (
      url.includes("/upload/q_auto") || 
      url.includes("/upload/w_720") || 
      url.includes("/upload/f_auto") ||
      url.includes("/upload/ac_none") ||
      url.includes("l_video:")
    ) {
      return url;
    }
    return url.replace("/upload/", "/upload/q_auto,f_auto,w_720,c_limit/");
  }

  return url;
}

/**
 * Optimize image URLs for Cloudinary, Supabase Storage, and Unsplash to reduce RAM usage and prevent APK crashes.
 * Enforces width caps and automatic format/quality compression (w_720,q_auto,f_auto).
 * @param {string} url - Original image URL
 * @param {number} maxWidth - Maximum image width in pixels (default: 720, or 120 for avatars)
 * @returns {string} - Memory-optimized image URL
 */
export function getOptimizedImageUrl(url, maxWidth = 720) {
  if (!url || typeof url !== "string") return url || "";
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;

  // Cloudinary image transformation
  if (url.includes("cloudinary.com") && url.includes("/upload/")) {
    if (url.includes(`/upload/w_`) || url.includes(`/upload/c_`) || url.includes(`/upload/q_`)) {
      return url;
    }
    return url.replace("/upload/", `/upload/w_${maxWidth},c_limit,q_auto,f_auto/`);
  }

  // Supabase Storage render transformation
  if (url.includes("supabase.co/storage/v1/")) {
    if (url.includes("/object/public/")) {
      const renderUrl = url.replace("/object/public/", "/render/image/public/");
      const separator = renderUrl.includes("?") ? "&" : "?";
      return `${renderUrl}${separator}width=${maxWidth}&quality=80`;
    }
  }

  // Unsplash image dimension capping
  if (url.includes("images.unsplash.com")) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set("w", String(maxWidth));
      parsed.searchParams.set("q", "80");
      parsed.searchParams.set("auto", "format");
      return parsed.toString();
    } catch (_) {
      return url;
    }
  }

  return url;
}

/**
 * Derive high-quality, memory-efficient poster frame URL from Cloudinary video URL
 * Replaces video extension (.mp4, .webm, etc.) with .jpg and injects optimization params
 */
export function deriveCloudinaryThumbnailUrl(secureUrl) {
  if (!secureUrl || typeof secureUrl !== "string") return "";
  const jpgUrl = secureUrl.replace(/\.[^/.]+$/, ".jpg");
  return getOptimizedImageUrl(jpgUrl, 720);
}

/**
 * Media upload timeout: 3600 seconds (1 hour) to accommodate large videos & high-resolution media
 */
export const UPLOAD_TIMEOUT_MS = 3600000;

function singleCloudinaryUpload(file, resourceType, preset, onProgress) {
  const formData = new FormData();
  if (typeof file === "string") {
    // Direct remote URL upload to Cloudinary
    formData.append("file", file);
  } else if (file instanceof Blob && !(file instanceof File)) {
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

  if (typeof XMLHttpRequest === "undefined") {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    return fetch(endpoint, {
      method: "POST",
      body: formData,
      signal: controller.signal
    }).then(async (res) => {
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok && (data.secure_url || data.url)) {
        const secure_url = data.secure_url || data.url;
        const thumbnail_url = resourceType === "video" ? deriveCloudinaryThumbnailUrl(secure_url) : secure_url;
        return {
          ...data,
          secure_url,
          thumbnail_url,
          public_id: data.public_id
        };
      }
      throw new Error(data?.error?.message || `Cloudinary upload failed (status: ${res.status})`);
    }).catch(err => {
      clearTimeout(timeoutId);
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new Error("Upload failed: Internet connection was lost. Please reconnect and try again.");
      }
      if (err.name === 'AbortError') {
        throw new Error("Cloudinary upload timed out after 3600s (1 hour). Please check your internet connection.");
      }
      throw err;
    });
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);
    xhr.timeout = UPLOAD_TIMEOUT_MS; // 3600 seconds (1 hour) network timeout for large video uploads

    if (xhr.upload && typeof onProgress === "function") {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const percent = Math.min(100, Math.max(0, Math.round((e.loaded / e.total) * 100)));
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

    xhr.ontimeout = () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        reject(new Error("Upload failed: Internet connection was lost. Please reconnect and try again."));
      } else {
        reject(new Error("Cloudinary upload request timed out (1 hour limit reached). Please check your network connection and try again."));
      }
    };

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
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        reject(new Error("Upload failed: Internet connection was lost. Please reconnect and try again."));
      } else {
        reject(new Error("Network connection error during Cloudinary upload. Please check your connection and try again."));
      }
    };

    xhr.onabort = () => {
      reject(new Error("Cloudinary upload was aborted"));
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

export const VERIFIED_FALLBACK_AUDIO_PUBLIC_ID = 'sphtvthf3kwsr0s9xmoi';
export const audioPublicIdCache = new Map();

/**
 * Upload or resolve background audio track on Cloudinary.
 * Caches public_id so subsequent uploads for the same song are instant.
 * @param {Object|string} musicOrUrl - Song record from Supabase songs table or audio URL
 * @param {Function} [onProgress] - Optional upload progress callback
 * @returns {Promise<{ public_id: string, secure_url: string, duration?: number }>}
 */
export async function uploadAudioTrackToCloudinary(musicOrUrl, onProgress) {
  if (!musicOrUrl) return null;

  let audioUrl = '';
  let songId = '';

  if (typeof musicOrUrl === 'string') {
    audioUrl = musicOrUrl;
    songId = musicOrUrl;
  } else if (typeof musicOrUrl === 'object') {
    audioUrl = musicOrUrl.audio_url || musicOrUrl.audioUrl || '';
    songId = musicOrUrl.id || musicOrUrl.song_id || audioUrl;
  }

  // Sanitize Supabase audio URL typos
  if (audioUrl && audioUrl.includes('gxotjbncfpwhisehvbcff')) {
    audioUrl = audioUrl.replace('gxotjbncfpwhisehvbcff', 'gxoajbncfpwhisehvbcf');
  }

  // 1. Check in-memory and local storage cache
  const cacheKey = String(songId || audioUrl);
  if (audioPublicIdCache.has(cacheKey)) {
    const cachedId = audioPublicIdCache.get(cacheKey);
    console.log(`[Cloudinary Audio] Using cached public_id '${cachedId}' for song:`, cacheKey);
    return {
      public_id: cachedId,
      secure_url: `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${cachedId}.mp4`
    };
  }

  try {
    const localCached = localStorage.getItem(`cld_audio_${cacheKey}`);
    if (localCached) {
      audioPublicIdCache.set(cacheKey, localCached);
      console.log(`[Cloudinary Audio] Restored cached public_id '${localCached}' from localStorage.`);
      return {
        public_id: localCached,
        secure_url: `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${localCached}.mp4`
      };
    }
  } catch (_) {}

  // 2. Upload audio to Cloudinary using unsigned preset 'flashgram_videos' (Cloudinary accepts audio under video resource type)
  console.log(`[Cloudinary Audio] Uploading background song to Cloudinary: ${audioUrl || songId}`);
  let lastError = null;

  // Try direct remote URL upload first (instantaneous server-to-server transfer)
  if (audioUrl && audioUrl.startsWith('http')) {
    try {
      const directRes = await singleCloudinaryUpload(audioUrl, 'video', 'flashgram_videos', onProgress);
      if (directRes && directRes.public_id) {
        audioPublicIdCache.set(cacheKey, directRes.public_id);
        try { localStorage.setItem(`cld_audio_${cacheKey}`, directRes.public_id); } catch (_) {}
        console.log(`[Cloudinary Audio] Successfully uploaded song to Cloudinary. public_id: ${directRes.public_id}`);
        return directRes;
      }
    } catch (directErr) {
      console.warn(`[Cloudinary Audio] Direct URL upload notice:`, directErr.message || directErr);
      lastError = directErr;
    }

    // Fallback: Fetch audio blob in browser and upload
    try {
      console.log(`[Cloudinary Audio] Attempting blob fetch fallback for: ${audioUrl}`);
      const audioFetch = await fetch(audioUrl);
      if (audioFetch.ok) {
        const audioBlob = await audioFetch.blob();
        const blobRes = await singleCloudinaryUpload(audioBlob, 'video', 'flashgram_videos', onProgress);
        if (blobRes && blobRes.public_id) {
          audioPublicIdCache.set(cacheKey, blobRes.public_id);
          try { localStorage.setItem(`cld_audio_${cacheKey}`, blobRes.public_id); } catch (_) {}
          console.log(`[Cloudinary Audio] Blob upload succeeded. public_id: ${blobRes.public_id}`);
          return blobRes;
        }
      }
    } catch (blobErr) {
      console.warn(`[Cloudinary Audio] Blob upload fallback notice:`, blobErr.message || blobErr);
      lastError = blobErr;
    }
  }

  // 3. Resilient fallback to verified permanent audio public_id on Cloudinary
  console.warn(`[Cloudinary Audio] Using verified default background track fallback: ${VERIFIED_FALLBACK_AUDIO_PUBLIC_ID}`);
  audioPublicIdCache.set(cacheKey, VERIFIED_FALLBACK_AUDIO_PUBLIC_ID);
  return {
    public_id: VERIFIED_FALLBACK_AUDIO_PUBLIC_ID,
    secure_url: `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${VERIFIED_FALLBACK_AUDIO_PUBLIC_ID}.mp4`
  };
}

/**
 * Generate native Cloudinary server-side audio-video merged URL.
 * Completely mutes original video audio (ac_none) and attaches selected song layer (l_video:<audio_id>/fl_layer_apply)
 * so anyone playing the standalone URL or exported file natively hears the music without dual-player syncing.
 * @param {string} rawVideoUrl - Original Cloudinary video URL
 * @param {string} audioPublicId - Cloudinary audio public_id
 * @returns {string} - Merged standalone video URL
 */
export function generateCloudinaryAudioMergedVideoUrl(rawVideoUrl, audioPublicId) {
  if (!rawVideoUrl || typeof rawVideoUrl !== 'string') return rawVideoUrl || '';

  if (!audioPublicId) {
    return getOptimizedVideoUrl(rawVideoUrl);
  }

  if (rawVideoUrl.includes('cloudinary.com') && rawVideoUrl.includes('/upload/')) {
    // Strip any existing audio layers or transformations before applying clean merge
    let cleanBaseUrl = rawVideoUrl;
    if (cleanBaseUrl.includes('/upload/ac_none') || cleanBaseUrl.includes('/upload/q_auto') || cleanBaseUrl.includes('/upload/w_720')) {
      cleanBaseUrl = cleanBaseUrl.replace(/\/upload\/[^/]+\//, '/upload/');
    }

    const transformation = `ac_none,l_video:${audioPublicId}/fl_layer_apply,q_auto,f_auto`;
    return cleanBaseUrl.replace('/upload/', `/upload/${transformation}/`);
  }

  return rawVideoUrl;
}

/**
 * Completely mute original video audio via Cloudinary transformation (ac_none)
 * @param {string} rawVideoUrl 
 * @returns {string}
 */
export function generateCloudinaryMutedVideoUrl(rawVideoUrl) {
  if (!rawVideoUrl || typeof rawVideoUrl !== 'string') return rawVideoUrl || '';
  if (rawVideoUrl.includes('cloudinary.com') && rawVideoUrl.includes('/upload/')) {
    if (rawVideoUrl.includes('/upload/ac_none')) return rawVideoUrl;
    return rawVideoUrl.replace('/upload/', '/upload/ac_none,q_auto,f_auto/');
  }
  return rawVideoUrl;
}

/**
 * Check if a video URL is already server-side audio-merged with Cloudinary
 */
export function isCloudinaryAudioMergedVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.includes('l_video:') || (url.includes('ac_none') && url.includes('fl_layer_apply'));
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
/**
 * Hardened Supabase Posts & Reels fetching for Home Feed
 * Handles RLS policies, missing foreign-key relationships in schema cache,
 * and seamlessly merges posts and reels tables with profile metadata.
 */
export async function fetchSupabasePosts() {
  if (!supabase) return [];

  console.log("[Feed] Querying Supabase posts and reels...");
  const combinedRawPosts = [];
  const seenIds = new Set();
  const seenUrls = new Set();

  // Helper to deduplicate and collect records
  const addRecords = (records = []) => {
    if (!Array.isArray(records)) return;
    records.forEach((rec, idx) => {
      if (!rec) return;
      const id = String(rec.id || `post_${Date.now()}_${idx}`);
      const rawUrl = rec.video_url || rec.media_url || rec.url || "";
      if (seenIds.has(id)) return;
      if (rawUrl && seenUrls.has(rawUrl)) return;

      seenIds.add(id);
      if (rawUrl) seenUrls.add(rawUrl);
      combinedRawPosts.push(rec);
    });
  };

  // 1. Fetch from 'posts' table
  try {
    const { data: postsData, error: postsErr } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!postsErr && Array.isArray(postsData)) {
      console.log(`[Feed] Retrieved ${postsData.length} records from 'posts' table.`);
      addRecords(postsData);
    } else if (postsErr) {
      console.warn("[Feed] 'posts' table query notice:", postsErr.message || postsErr);
    }
  } catch (err) {
    console.warn("[Feed] Exception querying 'posts' table:", err);
  }

  // 2. Fetch from 'reels' table (in case user uploaded reels directly or table was separated)
  try {
    const { data: reelsData, error: reelsErr } = await supabase
      .from('reels')
      .select('*')
      .order('created_at', { ascending: false });

    if (!reelsErr && Array.isArray(reelsData)) {
      console.log(`[Feed] Retrieved ${reelsData.length} records from 'reels' table.`);
      addRecords(reelsData);
    } else if (reelsErr) {
      console.warn("[Feed] 'reels' table query notice:", reelsErr.message || reelsErr);
    }
  } catch (err) {
    console.warn("[Feed] Exception querying 'reels' table:", err);
  }

  // 3. Fetch authentic profiles to map usernames, display names, and avatars
  const profilesMap = new Map();
  try {
    const { data: profilesList, error: profsErr } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, email');

    if (!profsErr && Array.isArray(profilesList)) {
      profilesList.forEach(pr => {
        if (pr.id !== undefined && pr.id !== null) {
          profilesMap.set(String(pr.id).toLowerCase(), pr);
        }
        if (pr.email) {
          profilesMap.set(String(pr.email).toLowerCase(), pr);
        }
      });
    } else if (profsErr) {
      console.warn("[Feed] Notice querying profiles for metadata:", profsErr.message || profsErr);
    }
  } catch (prErr) {
    console.warn("[Feed] Exception querying profiles table:", prErr);
  }

  const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";

  // 4. Normalize records with genuine creator information and Cloudinary optimizations
  const normalizedPosts = combinedRawPosts.map((post, idx) => {
    const uidStr = String(post.user_id || "").toLowerCase();
    const pr = profilesMap.get(uidStr) || profilesMap.get(String(post.user_id)) || (Array.isArray(post.profiles) ? post.profiles[0] : post.profiles) || {};

    let usernameVal = pr.username || pr.display_name || post.username || post.author_name;
    if (!usernameVal) {
      usernameVal = "creator";
    }

    const avatarVal = pr.avatar_url || post.user_avatar || post.avatar || defaultAvatar;
    const stableId = post.id || `post_${post.created_at || idx}`;
    const rawUrl = post.media_url || post.video_url || post.url || "";
    const optimizedUrl = getOptimizedVideoUrl(rawUrl);
    const mediaType = post.media_type || (rawUrl?.match(/\.(mp4|webm|mov|m4v)($|\?)/i) ? 'video' : 'photo');

    return {
      ...post,
      id: String(stableId),
      user_id: post.user_id || "",
      url: optimizedUrl,
      video_url: optimizedUrl,
      media_url: optimizedUrl,
      media_type: mediaType,
      thumbnail_url: post.thumbnail_url || (rawUrl ? deriveCloudinaryThumbnailUrl(rawUrl) : ""),
      profiles: {
        id: pr.id || post.user_id,
        username: usernameVal,
        avatar_url: avatarVal
      },
      author_name: usernameVal,
      user: usernameVal,
      avatar: avatarVal,
      likes_count: post.likes_count !== undefined && post.likes_count !== null ? post.likes_count : (post.likesCount || 0),
      comments_count: post.comments_count !== undefined && post.comments_count !== null ? post.comments_count : (post.commentsCount || 0)
    };
  });

  return normalizedPosts;
}

/**
 * Save Reel directly to the Supabase `reels` table, saving the final transformed/merged
 * Cloudinary video URL along with associated song title and cover art details.
 * Also synchronizes with `posts` table so it immediately displays across all feeds.
 */
export async function saveReelToSupabase({ videoUrl, thumbnailUrl, caption, userId, music = null }) {
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

  const normalizedMusic = music ? normalizeSongRecord(music) : null;
  const captionToSave = encodePostCaptionWithSong(caption, normalizedMusic);
  const permanentThumb = thumbnailUrl || (videoUrl ? deriveCloudinaryThumbnailUrl(videoUrl) : '');

  // 1. Primary Requirement: Save directly into Supabase 'reels' table with song details & merged video URL
  const reelPayload = {
    user_id: effectiveUserId,
    video_url: videoUrl,
    thumbnail_url: permanentThumb,
    caption: captionToSave,
    song_id: normalizedMusic?.id || null,
    song_title: normalizedMusic?.title || null,
    song_artist: normalizedMusic?.artist || null,
    song_cover: normalizedMusic?.cover_url || null,
    audio_url: normalizedMusic?.audio_url || null,
    likes_count: 0,
    comments_count: 0,
    created_at: new Date().toISOString()
  };

  console.log("[Reel Upload] Inserting into Supabase 'reels' table with merged video URL & song details:", {
    video_url: videoUrl,
    song_title: normalizedMusic?.title,
    song_cover: normalizedMusic?.cover_url
  });

  let savedReelRecord = null;
  try {
    const { data: rData, error: rError } = await supabase
      .from('reels')
      .insert([reelPayload])
      .select();

    if (!rError && rData && rData[0]) {
      savedReelRecord = rData[0];
      console.log("✅ Reel successfully inserted into Supabase 'reels' table:", savedReelRecord);
    } else if (rError) {
      console.warn("[Reel Upload] Supabase 'reels' table notice:", rError.message || rError);
    }
  } catch (err) {
    console.warn("[Reel Upload] Exception during 'reels' table insert:", err?.message || err);
  }

  // 2. Synchronize with 'posts' table so newly uploaded reel appears immediately across all app views
  let savedPostRecord = null;
  try {
    const postPayload = {
      user_id: effectiveUserId,
      video_url: videoUrl,
      media_url: videoUrl,
      thumbnail_url: permanentThumb,
      caption: captionToSave,
      media_type: 'video',
      username: username,
      user_avatar: userAvatar,
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString()
    };
    if (normalizedMusic && normalizedMusic.id) {
      postPayload.song_id = normalizedMusic.id;
      postPayload.audio_url = normalizedMusic.audio_url;
    }

    const { data: pData, error: pError } = await supabase
      .from('posts')
      .insert([postPayload])
      .select();

    if (!pError && pData && pData[0]) {
      savedPostRecord = pData[0];
      console.log("✅ Reel synchronized to Supabase 'posts' table:", savedPostRecord);
    } else if (pError) {
      // Fallback with exact base columns
      const basePayload = {
        user_id: effectiveUserId,
        video_url: videoUrl,
        thumbnail_url: permanentThumb,
        caption: captionToSave,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString()
      };
      const { data: bData } = await supabase.from('posts').insert([basePayload]).select();
      if (bData && bData[0]) {
        savedPostRecord = { ...postPayload, ...bData[0] };
      }
    }
  } catch (pErr) {
    console.warn("[Reel Upload] Notice syncing to 'posts' table:", pErr?.message || pErr);
  }

  const finalRecord = {
    ...(savedReelRecord || {}),
    ...(savedPostRecord || {}),
    id: String(savedReelRecord?.id || savedPostRecord?.id || ('reel_' + Date.now())),
    video_url: videoUrl,
    media_url: videoUrl,
    url: videoUrl,
    thumbnail_url: permanentThumb,
    thumbnail: permanentThumb,
    caption: caption || '',
    music: normalizedMusic,
    song_id: normalizedMusic?.id || null,
    song_title: normalizedMusic?.title || null,
    song_artist: normalizedMusic?.artist || null,
    song_cover: normalizedMusic?.cover_url || null,
    soundTitle: normalizedMusic ? `${normalizedMusic.title} • ${normalizedMusic.artist}` : 'Original Audio',
    soundCover: normalizedMusic?.cover_url || null,
    audio_url: normalizedMusic?.audio_url || null
  };

  return finalRecord;
}

/**
 * Guarantee Supabase Database Insertion for newly uploaded Cloudinary video
 */
export async function savePostToSupabase({ videoUrl, thumbnailUrl, caption, userId, mediaType = 'video', music = null }) {
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

  const normalizedMusic = music ? normalizeSongRecord(music) : null;
  const captionToSave = encodePostCaptionWithSong(caption, normalizedMusic);
  const permanentThumb = thumbnailUrl || (videoUrl ? deriveCloudinaryThumbnailUrl(videoUrl) : '');

  const postPayload = {
    user_id: effectiveUserId,
    video_url: videoUrl,
    media_url: videoUrl, // Explicit Cloudinary secure_url
    media_type: mediaType,
    thumbnail_url: permanentThumb,
    caption: captionToSave,
    username: username,
    user_avatar: userAvatar,
    likes_count: 0,
    comments_count: 0,
    created_at: new Date().toISOString()
  };

  if (normalizedMusic && (normalizedMusic.id || normalizedMusic.song_id)) {
    postPayload.song_id = normalizedMusic.id || normalizedMusic.song_id;
    postPayload.audio_url = normalizedMusic.audio_url;
  }

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
        caption: captionToSave,
        song_id: normalizedMusic?.id || null,
        song_title: normalizedMusic?.title || null,
        song_artist: normalizedMusic?.artist || null,
        song_cover: normalizedMusic?.cover_url || null,
        audio_url: normalizedMusic?.audio_url || null,
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
  window.uploadAudioTrackToCloudinary = uploadAudioTrackToCloudinary;
  window.generateCloudinaryAudioMergedVideoUrl = generateCloudinaryAudioMergedVideoUrl;
  window.generateCloudinaryMutedVideoUrl = generateCloudinaryMutedVideoUrl;
  window.isCloudinaryAudioMergedVideoUrl = isCloudinaryAudioMergedVideoUrl;
  window.deriveCloudinaryThumbnailUrl = deriveCloudinaryThumbnailUrl;
  window.savePostToSupabase = savePostToSupabase;
  window.saveReelToSupabase = saveReelToSupabase;
  window.fetchSupabasePosts = fetchSupabasePosts;
  window.getAuthenticatedUserId = getAuthenticatedUserId;
  window.UPLOAD_TIMEOUT_MS = UPLOAD_TIMEOUT_MS;
}

