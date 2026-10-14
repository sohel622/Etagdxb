// js/features/music/musicPlayer.js - MediaSession Player & Background Audio
import { youtubeMusicService } from "../../../src/services/youtubeMusicService.js";
import { openFlashgramMusicView, closeFlashgramMusicView } from "../../../src/components/music/MusicView.js";
import { setupMediaSessionMetadata } from "../../../src/features/music-player/components/AudioSyncController.js";

export function initMusicPlayer() {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => youtubeMusicService.playTrack());
    navigator.mediaSession.setActionHandler('pause', () => youtubeMusicService.pauseTrack());
    navigator.mediaSession.setActionHandler('previoustrack', () => youtubeMusicService.prevTrack());
    navigator.mediaSession.setActionHandler('nexttrack', () => youtubeMusicService.nextTrack());
  }
}

export function openMusicView() {
  openFlashgramMusicView();
}

export function closeMusicView() {
  closeFlashgramMusicView();
}

export {
  youtubeMusicService,
  openFlashgramMusicView,
  closeFlashgramMusicView,
  setupMediaSessionMetadata
};
