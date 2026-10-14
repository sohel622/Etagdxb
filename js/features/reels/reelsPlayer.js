// js/features/reels/reelsPlayer.js - 9:16 Vertical Swipe Reels Player
import {
  loadReels,
  navigateToReel,
  playCurrentReel,
  pauseAllReels,
  toggleCurrentReelPlayback
} from "../../../src/components/ReelsViewer.js";

export function initReelsPlayer() {
  const wrapper = document.getElementById("reelsFeedWrapper");
  if (wrapper) {
    loadReels();
  }
}

export {
  loadReels,
  navigateToReel,
  playCurrentReel,
  pauseAllReels,
  toggleCurrentReelPlayback
};
