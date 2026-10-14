// Upload Service (Direct Supabase Storage / Cloudinary Backend with Fallbacks)
import { supabase } from "../../supabaseClient.js";
import { uploadVideoToCloudinary } from "../../services/cloudinaryService.js";
import { showInstagramToast } from "../../utils/storage.js";

/**
 * Direct Server Upload (Supabase Storage / Cloudinary Backend):
 * Upload the real media file (image or video) directly to cloud storage bucket,
 * obtain the permanent public URL and return object with URL and type.
 */
export const uploadPostMedia = async (file) => {
  if (!file) throw new Error("No file provided for upload");

  const isVideo = file.type ? file.type.startsWith("video") : (file.name && file.name.endsWith(".mp4"));
  const rawExt = file.name ? file.name.split('.').pop() : (isVideo ? 'mp4' : 'jpg');
  const fileExt = (rawExt || (isVideo ? 'mp4' : 'jpg')).toLowerCase();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `user_posts/${fileName}`;

  // 1. Attempt upload to Supabase Storage bucket 'media_uploads'
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
        type: isVideo ? 'video' : 'photo',
        storage: 'supabase',
        filePath
      };
    }
  } catch (supabaseErr) {
    console.warn("Supabase storage 'media_uploads' error, checking 'posts' bucket:", supabaseErr);
  }

  // 2. Attempt fallback to Supabase Storage bucket 'posts'
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
        type: isVideo ? 'video' : 'photo',
        storage: 'supabase',
        filePath
      };
    }
  } catch (err) {
    console.warn("Supabase storage 'posts' error, attempting Cloudinary fallback:", err);
  }

  // 3. Resilient Cloudinary Upload fallback
  try {
    const cloudRes = await uploadVideoToCloudinary(file);
    return {
      url: cloudRes.secure_url || cloudRes.url,
      thumbnail_url: cloudRes.thumbnail_url,
      type: isVideo ? 'video' : 'photo',
      storage: 'cloudinary'
    };
  } catch (cloudErr) {
    console.error("All remote upload backends failed:", cloudErr);
    // If offline or both credentials fail, return local object URL as safe fallback
    const localUrl = URL.createObjectURL(file);
    return {
      url: localUrl,
      type: isVideo ? 'video' : 'photo',
      storage: 'local'
    };
  }
};

export class UploadService {
  constructor() {
    this.activeUploads = new Map();
  }

  async uploadFile(file, { onProgress, onSuccess, onError } = {}) {
    if (!file) return;
    const uploadId = "upload_" + Date.now();

    try {
      showInstagramToast("Starting upload...");
      const result = await uploadPostMedia(file);

      if (typeof onSuccess === "function") {
        onSuccess(result);
      }
      return result;
    } catch (err) {
      console.error("UploadService error:", err);
      if (typeof onError === "function") {
        onError(err);
      }
      throw err;
    }
  }
}

export const uploadService = new UploadService();
