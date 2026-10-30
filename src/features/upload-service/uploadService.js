// Upload Service (Direct Supabase Storage / Cloudinary Backend with Fallbacks)
import { supabase } from "../../supabaseClient.js";
import { 
  uploadVideoToCloudinary, 
  deriveCloudinaryThumbnailUrl,
  uploadAudioTrackToCloudinary,
  generateCloudinaryAudioMergedVideoUrl,
  generateCloudinaryMutedVideoUrl,
  saveReelToSupabase
} from "../../services/cloudinaryService.js";
import { showInstagramToast, UserProfileStore } from "../../utils/storage.js";
import { getCurrentUserId, resolveCurrentUserId, toValidUUID, AUTHENTIC_USER_UUID, getUniqueUserAvatar } from "../../services/avatarService.js";
import { encodePostCaptionWithSong, normalizeSongRecord, DEFAULT_MUSIC_COVER } from "../../services/songsService.js";

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
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new Error("Upload failed: Internet connection was lost. Please reconnect and try again.");
    }
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
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new Error("Upload failed: Internet connection was lost. Please reconnect and try again.");
    }
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
  } catch (_) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new Error("Upload failed: Internet connection was lost. Please reconnect and try again.");
    }
  }

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

  const currentUsername = UserProfileStore?.state?.username || "creator";
  const authorName = postRecord.username || postRecord.author_name || currentUsername;
  const currentAvatar = UserProfileStore?.state?.avatar || getUniqueUserAvatar(postRecord.user_id, authorName);
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
    try {
      window.dispatchEvent(new CustomEvent('flashgram_post_uploaded', { detail: normalized }));
    } catch (_) {}
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
export const uploadAndSaveVideoPost = async (videoFile, caption, userId, music = null, onProgress = null) => {
  try {
    if (!videoFile) {
      throw new Error("No video file provided for upload");
    }

    // 1. Upload to Cloudinary using XMLHttpRequest with exact progress reporting (0% to 100%)
    const cloudinaryData = await uploadVideoToCloudinary(videoFile, (percent, meta) => {
      if (typeof onProgress === "function") {
        onProgress(percent, meta);
      }
    });

    if (!cloudinaryData || (!cloudinaryData.secure_url && !cloudinaryData.url)) {
      throw new Error('Cloudinary upload failed: no secure URL received');
    }

    // Permanent Video URL from Cloudinary
    const permanentVideoUrl = cloudinaryData.secure_url || cloudinaryData.url;
    if (String(permanentVideoUrl).startsWith('blob:') || !String(permanentVideoUrl).startsWith('http')) {
      throw new Error('Refusing to save non-remote URL to Supabase: ' + permanentVideoUrl);
    }

    // 2. Dynamic Audio Replacement via Cloudinary Media Processing:
    // When a user selects a background song from the Supabase `songs` table:
    // Use Cloudinary's video transformation API to replace/mute the original video audio track with the selected song.
    // Generates a permanent standalone video URL natively embedding the selected song.
    let finalVideoUrl = permanentVideoUrl;
    const normalizedMusic = music ? normalizeSongRecord(music) : null;

    if (normalizedMusic && (normalizedMusic.audio_url || normalizedMusic.id)) {
      console.log(`[UploadService] Merging selected background track '${normalizedMusic.title}' into video via Cloudinary...`);
      try {
        const audioUploadResult = await uploadAudioTrackToCloudinary(normalizedMusic);
        if (audioUploadResult && audioUploadResult.public_id) {
          finalVideoUrl = generateCloudinaryAudioMergedVideoUrl(permanentVideoUrl, audioUploadResult.public_id);
          console.log(`[UploadService] ✅ Cloudinary standalone audio-video merged URL ready:`, finalVideoUrl);
        } else {
          finalVideoUrl = generateCloudinaryMutedVideoUrl(permanentVideoUrl);
          console.log(`[UploadService] Muted original video audio via Cloudinary transformation:`, finalVideoUrl);
        }
      } catch (mergeErr) {
        console.warn("[UploadService] Notice merging audio with Cloudinary, muting original video audio:", mergeErr);
        finalVideoUrl = generateCloudinaryMutedVideoUrl(permanentVideoUrl);
      }
    }

    // Generate crisp image thumbnail URL directly from Cloudinary video public ID
    const permanentThumbnailUrl = deriveCloudinaryThumbnailUrl(finalVideoUrl) || finalVideoUrl.replace(/\.[^/.]+$/, ".jpg");

    // Strictly resolve authentic user UUID dynamically from Supabase Auth
    let dynamicAuthUid = null;
    if (supabase?.auth) {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) dynamicAuthUid = data.user.id;
      } catch (_) {}
      if (!dynamicAuthUid) {
        try {
          const { data: sessData } = await supabase.auth.getSession();
          if (sessData?.session?.user?.id) dynamicAuthUid = sessData.session.user.id;
        } catch (_) {}
      }
    }
    if (!dynamicAuthUid && typeof resolveCurrentUserId === "function") {
      dynamicAuthUid = await resolveCurrentUserId();
    }
    const rawUid = dynamicAuthUid || (userId && userId !== "flashgram_user" && userId !== "creator" ? userId : null) || (typeof getCurrentUserId === "function" ? getCurrentUserId() : null);
    const targetUid = toValidUUID(rawUid) || rawUid || AUTHENTIC_USER_UUID;

    // 3. Database Link: Save the final transformed/merged Cloudinary video URL directly into the
    // Supabase `reels` table along with the associated song title and cover art details.
    let savedRow = null;
    try {
      savedRow = await saveReelToSupabase({
        videoUrl: finalVideoUrl,
        thumbnailUrl: permanentThumbnailUrl,
        caption: caption,
        userId: targetUid,
        music: normalizedMusic
      });
    } catch (saveErr) {
      console.warn("[UploadService] saveReelToSupabase notice:", saveErr);
    }

    const soundTitle = normalizedMusic ? `${normalizedMusic.title} • ${normalizedMusic.artist}` : 'Original Audio';
    const soundCover = normalizedMusic?.cover_url || normalizedMusic?.coverUrl || null;

    const finalPost = {
      ...savedRow,
      id: String(savedRow?.id || ('post_' + Date.now())),
      video_url: finalVideoUrl,
      thumbnail_url: permanentThumbnailUrl,
      media_url: finalVideoUrl,
      url: finalVideoUrl,
      caption: caption || '',
      music: normalizedMusic ? { ...normalizedMusic } : null,
      song_id: normalizedMusic?.id || normalizedMusic?.song_id || null,
      song_title: normalizedMusic?.title || null,
      song_artist: normalizedMusic?.artist || null,
      song_cover: soundCover,
      audio_url: normalizedMusic?.audio_url || normalizedMusic?.audioUrl || null,
      soundTitle: soundTitle,
      soundCover: soundCover
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
  let dynamicAuthUid = null;
  if (supabase?.auth) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) dynamicAuthUid = data.user.id;
    } catch (_) {}
    if (!dynamicAuthUid) {
      try {
        const { data: sessData } = await supabase.auth.getSession();
        if (sessData?.session?.user?.id) dynamicAuthUid = sessData.session.user.id;
      } catch (_) {}
    }
  }
  if (!dynamicAuthUid && typeof resolveCurrentUserId === "function") {
    dynamicAuthUid = await resolveCurrentUserId();
  }
  const rawUid = dynamicAuthUid || (userId && userId !== "flashgram_user" && userId !== "creator" ? userId : null) || (typeof getCurrentUserId === "function" ? getCurrentUserId() : null);
  const finalUserId = toValidUUID(rawUid) || rawUid || AUTHENTIC_USER_UUID;
  const username = UserProfileStore?.state?.username || (UserProfileStore?.state?.email ? UserProfileStore.state.email.split('@')[0] : 'creator');
  const userAvatar = UserProfileStore?.state?.avatar || getUniqueUserAvatar(finalUserId, username);

  const normalizedMusic = music ? normalizeSongRecord(music) : null;
  const captionToSave = encodePostCaptionWithSong(caption, normalizedMusic);

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
      music: normalizedMusic ? { ...normalizedMusic } : null,
      song_id: normalizedMusic?.id || null,
      song_title: normalizedMusic?.title || null,
      song_artist: normalizedMusic?.artist || null,
      song_cover: normalizedMusic?.cover_url || null,
      audio_url: normalizedMusic?.audio_url || null,
      soundTitle: normalizedMusic ? `${normalizedMusic.title} • ${normalizedMusic.artist}` : 'Original Audio',
      soundCover: normalizedMusic?.cover_url || null,
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString()
    };
    appendPostToLocalFeed(localPost);
    return localPost;
  }

  // If this is a video with attached music and not yet merged, perform server-side Cloudinary merge
  let effectiveVideoUrl = cloudinaryVideoUrl;
  if (mediaType === 'video' && normalizedMusic && !cloudinaryVideoUrl.includes('l_video:')) {
    try {
      const audioResult = await uploadAudioTrackToCloudinary(normalizedMusic);
      if (audioResult && audioResult.public_id) {
        effectiveVideoUrl = generateCloudinaryAudioMergedVideoUrl(cloudinaryVideoUrl, audioResult.public_id);
      } else {
        effectiveVideoUrl = generateCloudinaryMutedVideoUrl(cloudinaryVideoUrl);
      }
    } catch (_) {
      effectiveVideoUrl = generateCloudinaryMutedVideoUrl(cloudinaryVideoUrl);
    }
  }

  const permanentThumbnailUrl = deriveCloudinaryThumbnailUrl(effectiveVideoUrl) || String(effectiveVideoUrl).replace(/\.[^/.]+$/, ".jpg");

  try {
    let savedRecord = null;
    if (mediaType === 'video') {
      savedRecord = await saveReelToSupabase({
        videoUrl: effectiveVideoUrl,
        thumbnailUrl: permanentThumbnailUrl,
        caption: caption,
        userId: finalUserId,
        music: normalizedMusic
      });
    } else {
      const newPostData = {
        user_id: finalUserId,
        username: username,
        user_avatar: userAvatar,
        media_url: effectiveVideoUrl,
        video_url: null,
        thumbnail_url: permanentThumbnailUrl,
        media_type: 'photo',
        caption: captionToSave,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString()
      };

      if (normalizedMusic && (normalizedMusic.id || normalizedMusic.song_id)) {
        newPostData.song_id = normalizedMusic.id || normalizedMusic.song_id;
        newPostData.audio_url = normalizedMusic.audio_url || normalizedMusic.audioUrl;
      }

      const { data, error: insertError } = await supabase
        .from('posts')
        .insert([newPostData])
        .select()
        .single();

      if (!insertError && data) {
        savedRecord = data;
      } else {
        const compatData = {
          user_id: finalUserId,
          thumbnail_url: permanentThumbnailUrl,
          caption: captionToSave,
          likes_count: 0,
          comments_count: 0,
          created_at: new Date().toISOString()
        };
        const { data: cData } = await supabase.from('posts').insert([compatData]).select().single();
        if (cData) savedRecord = { ...newPostData, ...cData };
      }
    }

    const soundTitle = normalizedMusic ? `${normalizedMusic.title} • ${normalizedMusic.artist}` : 'Original Audio';
    const soundCover = normalizedMusic?.cover_url || null;

    const finalPost = {
      ...(savedRecord || {}),
      id: String(savedRecord?.id || ('post_' + Date.now())),
      user_id: finalUserId,
      username: username,
      author_name: username,
      avatar: userAvatar,
      user_avatar: userAvatar,
      media_url: effectiveVideoUrl,
      video_url: mediaType === 'video' ? effectiveVideoUrl : null,
      url: effectiveVideoUrl,
      thumbnail_url: permanentThumbnailUrl,
      thumbnail: permanentThumbnailUrl,
      media_type: mediaType,
      caption: caption || '',
      music: normalizedMusic,
      song_id: normalizedMusic?.id || null,
      song_title: normalizedMusic?.title || null,
      song_artist: normalizedMusic?.artist || null,
      song_cover: soundCover,
      soundTitle: soundTitle,
      soundCover: soundCover,
      audio_url: normalizedMusic?.audio_url || null,
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString()
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
      media_url: effectiveVideoUrl,
      video_url: mediaType === 'video' ? effectiveVideoUrl : null,
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

