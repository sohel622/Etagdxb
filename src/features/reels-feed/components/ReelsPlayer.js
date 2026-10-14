// Dedicated 9:16 Fullscreen Reels Player & Clean Action Sidebar Component
import { getOptimizedVideoUrl } from "../../../services/cloudinaryService.js";

/**
 * Renders an Instagram-standard 9:16 fullscreen reel item
 * Sidebar strictly retains:
 * - Like (Heart)
 * - Comment
 * - Share
 * - PiP (Picture in Picture)
 * - More options (...)
 * With NO "Full" screen button.
 */
export function buildReelItemElement(reel, index) {
  const item = document.createElement("div");
  item.className = "reel-item reels-fullscreen-container";
  item.dataset.index = String(index);
  item.dataset.reelId = String(reel.id);

  const videoUrl = getOptimizedVideoUrl(reel.video_url || reel.url);
  const posterUrl = reel.thumbnail_url || reel.thumbnail || "";

  item.innerHTML = `
    <div class="reel-video-wrapper reels-video-container">
      <video class="reel-video reels-player reels-video-player" src="${videoUrl}" poster="${posterUrl}" loop playsinline preload="metadata"></video>
      <div class="reel-overlay"></div>

      <!-- Bottom metadata overlay: username, caption, sound badge -->
      <div class="reels-bottom-overlay">
        <div class="reels-user-info flex items-center gap-2 mb-2">
          <img src="${reel.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}" class="w-8 h-8 rounded-full border border-white/30" alt="" />
          <span class="font-bold text-sm text-white">${reel.username || reel.user || 'creator'}</span>
        </div>
        <div class="reels-caption text-xs text-white line-clamp-2 mb-2">${reel.caption || ''}</div>
        <div class="reels-audio-badge text-[11px] text-white/90 flex items-center gap-1.5">
          <i class="fa-solid fa-music text-[10px]"></i>
          <span class="truncate">${reel.soundTitle || 'Original Audio'}</span>
        </div>
      </div>

      <!-- Clean right action column: strictly Like, Comment, Share, PiP, More -->
      <div class="reels-sidebar">
        <div class="reel-action-btn like-btn">
          <i class="fa-solid fa-heart"></i>
          <span>${reel.likes || '1.2k'}</span>
        </div>
        <div class="reel-action-btn comment-btn" title="Comments">
          <i class="fa-solid fa-comment-dots"></i>
          <span>${reel.comments || '142'}</span>
        </div>
        <div class="reel-action-btn share-btn" title="Share">
          <i class="fa-regular fa-paper-plane"></i>
          <span>Share</span>
        </div>
        <div class="reel-action-btn pip-btn" title="Picture in Picture">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
          <span>PiP</span>
        </div>
        <div class="reel-action-btn more-btn">
          <i class="fa-solid fa-ellipsis"></i>
        </div>
      </div>

      <!-- Video progress bar -->
      <div class="reel-card-progress-bar-container">
        <div class="reel-card-progress-bar-fill"></div>
      </div>
    </div>
  `;

  return item;
}
