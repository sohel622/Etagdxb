// Media Picker Module Entry Point
import { uploadPostMedia } from "../upload-service/uploadService.js";
import { searchYouTubeAudio } from "../../services/youtubeMusicService.js";

/**
 * Native Android & Web Media Fetcher
 * Requests native Android storage/media permissions:
 * - READ_MEDIA_IMAGES
 * - READ_MEDIA_VIDEO
 * Reads local device gallery thumbnails or invokes native file picker
 * Returns real Blob / File objects
 */
export const fetchDeviceMedia = async (options = {}) => {
  // Check/request permissions on Android if running under Capacitor
  if (typeof window !== "undefined" && window.Capacitor?.Plugins?.Permissions) {
    try {
      await window.Capacitor.Plugins.Permissions.query({ name: 'storage' });
    } catch (_) {}
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.accept || 'image/*,video/*';
    input.multiple = options.multiple !== false;

    input.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      resolve(files);
    };

    input.oncancel = () => {
      resolve([]);
    };

    input.click();
  });
};

export { uploadPostMedia };
export { searchYouTubeAudio };
export { MediaPickerState } from "./hooks/useMediaPicker.js";
export { DEVICE_ALBUMS, renderAlbumFoldersList } from "./components/AlbumSelector.js";
export { renderPreviewMediaHost } from "./components/MultiSelectPreview.js";
export { renderAttachedMusicBadge } from "./components/PostFinalizeView.js";
export {
  initInstagramMediaPicker,
  openInstagramMediaPicker,
  closeInstagramMediaPicker
} from "../../components/media/MediaPickerModal.js";
