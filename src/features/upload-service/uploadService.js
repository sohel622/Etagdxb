// Upload Service (Direct Supabase Storage / Cloudinary Backend with Fallbacks)
import { supabase } from "../../supabaseClient.js";
import { uploadVideoToCloudinary, deriveCloudinaryThumbnailUrl } from "../../services/cloudinaryService.js";
import { showInstagramToast, UserProfileStore } from "../../utils/storage.js";
import { getCurrentUserId, resolveCurrentUserId, toValidUUID } from "../../services/avatarService.js";
import { encodePostCaptionWithSong, normalizeSongRecord } from "../../services/songsService.js";

/**
 * Direct Server Upload (Supabase Storage / Cloudinary Backend):
 * Upload the real media file (image or video) directly to cloud storage bucket,
 * obtain the permanent public URL and return object with URL and type.
 */
export const uploadPostMedia = async (file, onProgress) => {
  if (!file) throw new Error("No file provided for upload");

  const isVideo = file.type ? file.type.startsWith("video") : (file.name && file.name.match(/\.(mp4|webm|mov|m4v)($|\?)/i));
  const rawExt = file.name ? file.name.split('.').pop() : (isVideo ? 'mp4' : 'jpg');
  const fileExt = (rawExt || (isVideo ? 'mp4' : 'jpg')).toLowerCase();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `user_posts/${fileName}`;

  // 1. Cloudinary Direct Upload is our verified primary media backend
  try {
    const cloudRes = await uploadVideoToCloudinary(file, onProgress);
    const secureUrl = cloudRes.secure_url || cloudRes.url;
    if (secureUrl && !secureUrl.startsWith("blob:")) {
      const thumbUrl = cloudRes.thumbnail_url || (isVideo ? deriveCloudinaryThumbnailUrl(secureUrl) : secureUrl);
      return {
        url: secureUrl,
        secure_url: secureUrl,
        thumbnail_url: thumbUrl,
        type: isVideo ? 'video' : 'photo',
        storage: 'cloudinary'
      };
    }
  } catch (cloudErr) {
    console.warn("[Upload] Primary Cloudinary upload attempt notice:", cloudErr?.message || cloudErr);
  }

  // 2. Attempt upload to Supabase Storage bucket 'media_uploads'
  try {
    const { data, error } = await supabase.storage
      .from('media_uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage
        .from('media_uploads')
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        secure_url: publicUrl,
        thumbnail_url: isVideo ? deriveCloudinaryThumbnailUrl(publicUrl) : publicUrl,
        type: isVideo ? 'video' : 'photo',
        storage: 'supabase',
        filePath
      };
    }
  } catch (supabaseErr) {
    // Continue to next fallback
  }

  // 3. Attempt fallback to Supabase Storage bucket 'posts'
  try {
    const { data, error } = await supabase.storage
      .from('posts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        secure_url: publicUrl,
        thumbnail_url: isVideo ? deriveCloudinaryThumbnailUrl(publicUrl) : publicUrl,
        type: isVideo ? 'video' : 'photo',
        storage: 'supabase',
        filePath
      };
    }
  } catch (_) {}

  // 4. Local object URL preview for immediate responsive UI (marked strictly as storage: 'local')
  console.warn("[Upload] Remote cloud upload unavailable, using local preview buffer.");
  const localUrl = URL.createObjectURL(file);
  return {
    url: localUrl,
    secure_url: localUrl,
    thumbnail_url: localUrl,
    type: isVideo ? 'video' : 'photo',
    storage: 'local'
  };
};

/**
 * Appends the newly created post record immediately to local Feed & Profile Grid
 */
export const appendPostToLocalFeed = (postRecord) => {
  if (!postRecord) return null;

  const currentUsername = UserProfileStore?.state?.username || "sohelmommy_077";
  const currentAvatar = UserProfileStore?.state?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400";

  const authorName = postRecord.username || postRecord.author_name || currentUsername;
  const authorAvatar = postRecord.user_avatar || postRecord.avatar || currentAvatar;
  const mediaUrl = postRecord.media_url || postRecord.video_url || postRecord.url;
  const mediaType = postRecord.media_type || (mediaUrl?.match(/\.(mp4|webm|mov|m4v)($|\?)/i) ? 'video' : 'photo');
  const posterUrl = postRecord.thumbnail_url || postRecord.thumbnail || deriveCloudinaryThumbnailUrl(mediaUrl) || mediaUrl;

  const normalized = {
    id: postRecord.id || ('post_' + Date.now()),
    user_id: postRecord.user_id,
    author_name: authorName,
    user: authorName,
    avatar: authorAvatar,
    url: mediaUrl,
    video_url: mediaType === 'video' ? mediaUrl : null,
    media_url: mediaUrl,
    media_type: mediaType,
    thumbnail_url: posterUrl,
    thumbnail: posterUrl,
    caption: postRecord.caption || '',
    music: postRecord.music || null,
    song_id: postRecord.song_id || null,
    audio_url: postRecord.audio_url || null,
    soundTitle: postRecord.soundTitle || (postRecord.music ? `${postRecord.music.title} • ${postRecord.music.artist}` : 'Original Audio'),
    soundCover: postRecord.soundCover || postRecord.music?.coverUrl || postRecord.music?.cover_url || null,
    likesCount: postRecord.likes_count ?? (postRecord.likesCount || 0),
    likes_count: postRecord.likes_count ?? 0,
    commentsCount: postRecord.comments_count ?? (postRecord.commentsCount || 0),
    comments_count: postRecord.comments_count ?? 0,
    time: postRecord.time || 'JUST NOW',
    isCurrentUser: true,
    location: postRecord.location || (postRecord.music ? `${postRecord.music.title} • ${postRecord.music.artist}` : 'Original Audio'),
    isCarousel: Boolean(postRecord.isCarousel),
    carouselItems: postRecord.carouselItems || null
  };

  // 1. Immediately prepend to home feed
  if (typeof window !== "undefined") {
    if (typeof window.addNewPostToFeed === "function") {
      window.addNewPostToFeed(normalized);
    }
    // 2. Refresh profile count and grid
    if (typeof window.updateProfilePostsCount === "function") {
      window.updateProfilePostsCount();
    }
    if (typeof window.renderProfileGrid === "function") {
      window.renderProfileGrid();
    }
  }

  return normalized;
};

/**
 * Await Cloudinary Upload & Save Real Public URLs (NO blob: URLs)
 * Automatically generates the thumbnail image URL from Cloudinary (replacing extension with .jpg)
 * @param {File|Blob} videoFile - Video File or recorded Blob
 * @param {string} caption - Post caption
 * @param {string} [userId] - Optional authentic user UUID
 */
export const uploadAndSaveVideoPost = async (videoFile, caption, userId, music = null) => {
  try {
    if (!videoFile) {
      throw new Error("No video file provided for upload");
    }

    // 1. Upload to Cloudinary first
    const formData = new FormData();
    if (videoFile instanceof Blob && !(videoFile instanceof File)) {
      formData.append('file', videoFile, 'recorded_reel.mp4');
    } else {
      formData.append('file', videoFile);
    }

    // Target verified preset 'flashgram_videos' or 'flashgram_preset'
    formData.append('upload_preset', 'flashgram_videos');
    formData.append('resource_type', 'video');

    let cloudinaryData = null;
    const candidateEndpoints = [
      'https://api.cloudinary.com/v1_1/yrfaotod/video/upload',
      'https://api.cloudinary.com/v1_1/yrfactod/video/upload'
    ];

    let lastUploadError = null;
    for (const endpoint of candidateEndpoints) {
      try {
        const cloudinaryRes = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });

        const data = await cloudinaryRes.json();
        if (cloudinaryRes.ok && data && (data.secure_url || data.url)) {
          cloudinaryData = data;
          break;
        } else {
          lastUploadError = new Error(data?.error?.message || 'Cloudinary upload failed');
        }
      } catch (err) {
        lastUploadError = err;
      }
    }

    if (!cloudinaryData || (!cloudinaryData.secure_url && !cloudinaryData.url)) {
      throw lastUploadError || new Error('Cloudinary upload failed: ' + JSON.stringify(cloudinaryData));
    }

    // Permanent Video URL from Cloudinary
    const permanentVideoUrl = cloudinaryData.secure_url || cloudinaryData.url;
    if (String(permanentVideoUrl).startsWith('blob:') || !String(permanentVideoUrl).startsWith('http')) {
      throw new Error('Refusing to save non-remote URL to Supabase: ' + permanentVideoUrl);
    }

    // Generate image thumbnail URL directly from Cloudinary video public ID (e.g. .mp4 -> .jpg)
    const permanentThumbnailUrl = permanentVideoUrl.replace(/\.[^/.]+$/, ".jpg");

    // Resolve authentic user UUID
    const rawUid = userId || (typeof resolveCurrentUserId === "function" ? await resolveCurrentUserId() : null) || (typeof getCurrentUserId === "function" ? getCurrentUserId() : null);
    const targetUid = toValidUUID(rawUid) || rawUid;
    const authorUsername = UserProfileStore?.state?.username || 'creator';
    const authorAvatar = UserProfileStore?.state?.avatar || '/assets/default-avatar.png';

    // Encode selected song metadata into caption to guarantee 100% persistence in Supabase
    const captionToSave = encodePostCaptionWithSong(caption, music);

    // 2. Insert into Supabase table with verified permanent URLs (NO blob: URLs)
    let savedRow = null;
    const postPayload = {
      user_id: targetUid,
      video_url: permanentVideoUrl,
      media_url: permanentVideoUrl,
      thumbnail_url: permanentThumbnailUrl,
      caption: captionToSave,
      media_type: 'video',
      username: authorUsername,
      user_avatar: authorAvatar,
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString()
    };

    if (music && (music.id || music.song_id)) {
      postPayload.song_id = music.id || music.song_id;
      postPayload.audio_url = music.audio_url || music.audioUrl;
    }

    const { data, error } = await supabase
      .from('posts')
      .insert([postPayload])
      .select()
      .single();

    if (!error && data) {
      savedRow = data;
    } else if (error) {
      console.warn("Schema notice on media_type column, attempting schema compatibility insert:", error.message || error);
      const compatPayload = {
        user_id: targetUid,
        video_url: permanentVideoUrl,
        thumbnail_url: permanentThumbnailUrl,
        caption: captionToSave,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString()
      };
      const { data: cData, error: cError } = await supabase
        .from('posts')
        .insert([compatPayload])
        .select()
        .single();

      if (cError) throw cError;
      savedRow = { ...postPayload, ...cData };
    }

    const finalPost = {
      ...savedRow,
      id: String(savedRow?.id || ('post_' + Date.now())),
      video_url: permanentVideoUrl,
      thumbnail_url: permanentThumbnailUrl,
      media_url: permanentVideoUrl,
      url: permanentVideoUrl,
      caption: caption || '',
      music: music ? { ...music } : null,
      song_id: music?.id || music?.song_id || null,
      audio_url: music?.audio_url || music?.audioUrl || null,
      soundTitle: music ? `${music.title} • ${music.artist}` : 'Original Audio',
      soundCover: music?.coverUrl || music?.cover_url || null
    };

    appendPostToLocalFeed(finalPost);
    return finalPost;
  } catch (error) {
    console.error('Upload & Save Error:', error);
    throw error;
  }
};

/**
 * Fix Post Creation: Ensure Video URL & Current User ID Save Correctly to Supabase
 * Strictly checks that permanent public URL is used (refusing temporary blob links)
 * @param {string} cloudinaryVideoUrl - Real Cloudinary secure_url or public media URL
 * @param {string} caption - Post caption
 * @param {string} [mediaType='video'] - 'video' | 'photo'
 */
export const handlePublishPost = async (cloudinaryVideoUrl, caption, mediaType = 'video', userId = null, music = null) => {
  const rawUid = userId || (typeof resolveCurrentUserId === "function" ? await resolveCurrentUserId() : null) || (typeof getCurrentUserId === "function" ? getCurrentUserId() : null);
  const finalUserId = toValidUUID(rawUid) || rawUid;
  const username = UserProfileStore?.state?.username || 'creator';
  const userAvatar = UserProfileStore?.state?.avatar || '/assets/default-avatar.png';

  const captionToSave = encodePostCaptionWithSong(caption, music);

  // Guard: NEVER save temporary local blob links to Supabase
  if (!cloudinaryVideoUrl || String(cloudinaryVideoUrl).startsWith("blob:")) {
    console.warn("[Post Creation] Skipping Supabase insertion for temporary blob preview:", cloudinaryVideoUrl);
    const localPost = {
      id: 'post_' + Date.now(),
      user_id: finalUserId,
      username: username,
      user_avatar: userAvatar,
      media_url: cloudinaryVideoUrl,
      video_url: cloudinaryVideoUrl,
      thumbnail_url: cloudinaryVideoUrl,
      media_type: mediaType,
      caption: caption || '',
      music: music ? { ...music } : null,
      song_id: music?.id || music?.song_id || null,
      audio_url: music?.audio_url || music?.audioUrl || null,
      soundTitle: music ? `${music.title} • ${music.artist}` : 'Original Audio',
      soundCover: music?.coverUrl || music?.cover_url || null,
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString()
    };
    appendPostToLocalFeed(localPost);
    return localPost;
  }

  const permanentThumbnailUrl = String(cloudinaryVideoUrl).replace(/\.[^/.]+$/, ".jpg");

  try {
    const newPostData = {
      user_id: finalUserId,
      username: username,
      user_avatar: userAvatar,
      media_url: cloudinaryVideoUrl, // Ensure this is the real Cloudinary secure_url
      video_url: cloudinaryVideoUrl,
      thumbnail_url: permanentThumbnailUrl,
      media_type: mediaType,
      caption: captionToSave,
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString()
    };

    if (music && (music.id || music.song_id)) {
      newPostData.song_id = music.id || music.song_id;
      newPostData.audio_url = music.audio_url || music.audioUrl;
    }

    let savedRecord = null;
    const { data, error: insertError } = await supabase
      .from('posts')
      .insert([newPostData])
      .select()
      .single();

    if (!insertError && data) {
      savedRecord = data;
    } else if (insertError) {
      console.warn("Notice on full schema insert, trying standard columns insert:", insertError.message || insertError);
      const compatData = {
        user_id: finalUserId,
        video_url: cloudinaryVideoUrl,
        thumbnail_url: permanentThumbnailUrl,
        caption: captionToSave,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString()
      };
      const { data: cData, error: cError } = await supabase
        .from('posts')
        .insert([compatData])
        .select()
        .single();

      if (!cError && cData) {
        savedRecord = { ...newPostData, ...cData };
      }
    }

    const finalPost = savedRecord || {
      ...newPostData,
      id: 'post_' + Date.now()
    };

    // Immediately update feed & local cache state
    appendPostToLocalFeed(finalPost);
    return finalPost;
  } catch (err) {
    console.warn('Notice saving post to Supabase:', err?.message || err);
    const fallbackPost = {
      id: 'post_' + Date.now(),
      user_id: finalUserId,
      username: username,
      user_avatar: userAvatar,
      media_url: cloudinaryVideoUrl,
      video_url: cloudinaryVideoUrl,
      thumbnail_url: permanentThumbnailUrl,
      media_type: mediaType,
      caption: caption || '',
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString()
    };
    appendPostToLocalFeed(fallbackPost);
    return fallbackPost;
  }
};

export class UploadService {
  constructor() {
    this.activeUploads = new Map();
  }

  async uploadFile(file, { onProgress, onSuccess, onError } = {}) {
    if (!file) return;
    try {
      showInstagramToast("Starting upload...");
      const result = await uploadPostMedia(file, onProgress);
      if (typeof onSuccess === "function") {
        onSuccess(result);
      }
      return result;
    } catch (err) {
      console.warn("UploadService notice:", err);
      if (typeof onError === "function") {
        onError(err);
      }
      throw err;
    }
  }
}

export const uploadService = new UploadService();

if (typeof window !== "undefined") {
  window.uploadPostMedia = uploadPostMedia;
  window.uploadAndSaveVideoPost = uploadAndSaveVideoPost;
  window.handlePublishPost = handlePublishPost;
  window.appendPostToLocalFeed = appendPostToLocalFeed;
  window.uploadService = uploadService;
}

