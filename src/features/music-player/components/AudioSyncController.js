// Audio Post Sync Controller with MediaSession API integration
import { audio30sController } from "../../../utils/audioCatalog.js";

export { audio30sController };

export function setupMediaSessionMetadata(track) {
  if (!('mediaSession' in navigator) || !track) return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: "Flashgram Hits",
      artwork: [
        { src: track.cover || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=512", sizes: "512x512", type: "image/jpeg" }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => {
      audio30sController.resume();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      audio30sController.pause();
    });
  } catch (e) {
    console.warn("MediaSession API setup error:", e);
  }
}
