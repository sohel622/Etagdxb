// Audio Post Sync Controller with MediaSession API integration
import { audio30sController } from "../../../utils/audioCatalog.js";
import { updateMediaSessionState, clearMediaNotification } from "../../../services/mediaSessionController.js";

export { audio30sController, updateMediaSessionState, clearMediaNotification };

export function setupMediaSessionMetadata(track) {
  if (!track) return;

  updateMediaSessionState(true, track);

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        updateMediaSessionState(true, track);
        if (typeof audio30sController.resume === "function") {
          audio30sController.resume();
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        updateMediaSessionState(false, track);
        if (typeof audio30sController.pause === "function") {
          audio30sController.pause();
        }
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        clearMediaNotification();
        if (typeof audio30sController.stopPlayback === "function") {
          audio30sController.stopPlayback();
        }
      });
    } catch (e) {
      console.warn("MediaSession API setup error:", e);
    }
  }
}
