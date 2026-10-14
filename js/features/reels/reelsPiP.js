// js/features/reels/reelsPiP.js - Picture-in-Picture Controller (Restricted strictly to Reels)
import { enableVideoPiP } from "../../../src/components/ReelsViewer.js";
import { showInstagramToast } from "../../utils/storage.js";

export function requestReelPiP(videoElement) {
  if (!videoElement) {
    showInstagramToast("No active reel video found");
    return;
  }
  enableVideoPiP(videoElement);
}

export { enableVideoPiP };
