import { getOptimizedVideoUrl } from "../../../services/cloudinaryService.js";
import { decodePostCaptionAndSong, DEFAULT_MUSIC_COVER } from "../../../services/songsService.js";

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
  item.className = "reel-item reels-fullscreen-container reels-fullscreen-viewport";
  item.dataset.index = String(index);
  item.dataset.reelId = String(reel.id);

  const videoUrl = getOptimizedVideoUrl(reel.video_url || reel.url);
  const posterUrl = reel.thumbnail_url || reel.thumbnail || "";

  const { caption: cleanCaption, song: decodedSong } = decodePostCaptionAndSong(reel.caption || '');
  const songData = reel.music || decodedSong || (reel.audio_url ? {
    id: reel.song_id || '',
    song_id: reel.song_id || '',
    title: reel.soundTitle || 'Featured Track',
    artist: reel.soundArtist || 'Artist',
    audio_url: reel.audio_url,
    audioUrl: reel.audio_url,
    cover_url: reel.soundCover || DEFAULT_MUSIC_COVER,
    coverUrl: reel.soundCover || DEFAULT_MUSIC_COVER
  } : null);

  const hasCustomSong = Boolean(songData && (songData.audio_url || songData.audioUrl));
  const soundTitle = songData ? `${songData.title} • ${songData.artist}` : (reel.soundTitle || 'Original Audio');
  const soundCover = songData ? (songData.cover_url || songData.coverUrl || songData.cover || DEFAULT_MUSIC_COVER) : (reel.soundCover || reel.avatar || DEFAULT_MUSIC_COVER);

  reel._songData = songData;
  item._songData = songData;

  item.innerHTML = `
    <div class="reel-video-wrapper reels-video-container reels-fullscreen-viewport">
      <video class="reel-video reels-player reels-video-player" src="${videoUrl}" poster="${posterUrl}" loop playsinline preload="metadata"></video>
      <div class="reel-overlay"></div>

      <!-- Bottom metadata overlay: username, caption, sound badge -->
      <div class="reels-bottom-overlay">
        <div class="reels-user-info flex items-center gap-2 mb-2">
          <img src="${reel.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}" class="w-8 h-8 rounded-full border border-white/30" alt="" />
          <span class="font-bold text-sm text-white">${reel.username || reel.user || 'creator'}</span>
        </div>
        <div class="reels-caption text-xs text-white line-clamp-2 mb-2">${cleanCaption || ''}</div>
        <div class="reels-audio-badge text-[11px] text-white/90 flex items-center gap-1.5" title="${soundTitle}">
          ${hasCustomSong ? `
            <img src="${soundCover}" class="w-4 h-4 rounded-full object-cover border border-white/60 animate-spin-slow inline-block mr-1 flex-shrink-0" alt="" onerror="this.src='${DEFAULT_MUSIC_COVER}'" />
          ` : '<i class="fa-solid fa-music text-[10px]"></i>'}
          <span class="truncate">${soundTitle}</span>
        </div>
      </div>

      <!-- Clean right action column: strictly Like, Comment, Share, More, and Sound Disc -->
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
        <div class="reel-action-btn more-btn">
          <i class="fa-solid fa-ellipsis"></i>
        </div>
        <!-- Rotating Song Cover Art Disc -->
        <div class="reel-sound-disc-wrapper" title="${soundTitle}">
          <img src="${soundCover}" class="reel-sound-disc animate-spin-slow" alt="Sound cover" onerror="this.src='${DEFAULT_MUSIC_COVER}'" />
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
