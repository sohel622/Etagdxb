// Feed Component (Home Post Feed & Observer with Aggressive Video Memory Cleanup)
import { db } from "../services/database.js";
import { UserProfileStore, showInstagramToast, isPostLikedByUser, togglePostLike } from "../utils/storage.js";
import { SAMPLE_VIDEOS, SHABNAM_AI_PROFILE } from "../utils/mockData.js";
import { isGlobalAudioMuted } from "./Navbar.js";
import { openMyProfileTab, navigateToReel } from "./ReelsViewer.js";
import { openReelsCommentsSheet, openReelsShareSheet, getStoredComments, openPostOptionsSheet } from "./reels/index.js";
import { openProfile } from "./Profile.js";
import { renderSuggestedReels } from "./SuggestedReels.js";
import { deriveCloudinaryThumbnailUrl, fetchSupabasePosts, getOptimizedVideoUrl } from "../services/cloudinaryService.js";
import { isFollowingUser, toggleFollowUser } from "../services/followService.js";
import { getCurrentUserId } from "../services/avatarService.js";
import { supabase } from "../supabaseClient.js";
import {
  getCachedVideoBlobUrl,
  getOfflineWatchedPosts,
  isOffline,
  trackVideoProgressForCaching
} from "../services/offlineCacheService.js";
import { audio30sController } from "../utils/audioCatalog.js";
import { attachConditionalFullscreenButton } from "./media/FullscreenVideoPlayer.js";
import { decodePostCaptionAndSong, sanitizeCaptionText, DEFAULT_MUSIC_COVER } from "../services/songsService.js";

/* =======================================================
   ১. হোম ফিড এরর বাউন্ডারি (Error Boundary Fallback)
======================================================= */
function renderFeedErrorBoundary(container, error) {
  if (!container) return;
  console.error("Home Feed ErrorBoundary caught failure:", error);
  container.innerHTML = `
    <div class="feed-error-boundary flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
      <div class="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500 text-2xl shadow-inner mb-3">
        <i class="fa-solid fa-circle-exclamation"></i>
      </div>
      <h3 class="text-[17px] font-bold text-neutral-900 dark:text-white">Couldn't load feed</h3>
      <p class="text-[13px] text-neutral-500 dark:text-neutral-400 max-w-[280px] mt-1 mb-4 leading-normal">
        There was an unexpected issue loading feed posts. Tap below to retry.
      </p>
      <div class="flex items-center gap-2">
        <button id="feedRetryBtn" type="button" class="px-5 py-2 rounded-full bg-[#0095F6] hover:bg-sky-600 active:scale-95 text-white font-semibold text-[13.5px] transition-all shadow-sm cursor-pointer flex items-center gap-2">
          <i class="fa-solid fa-rotate-right"></i>
          <span>Tap to retry</span>
        </button>
      </div>
    </div>
  `;

  const retryBtn = container.querySelector("#feedRetryBtn");
  if (retryBtn) {
    retryBtn.onclick = (e) => {
      e.preventDefault();
      retryBtn.disabled = true;
      retryBtn.innerHTML = '<i class="fa-solid fa-rotate-right fa-spin"></i><span>Retrying...</span>';
      setTimeout(() => {
        renderHomeFeed();
      }, 250);
    };
  }
}

// Requirement 2: Generate or attach automatic thumbnail image without broken video URL
function getPostThumbnail(post) {
  if (post.thumbnail_url && !post.thumbnail_url.includes(".mp4") && !post.thumbnail_url.includes(".webm") && !String(post.thumbnail_url).startsWith("blob:")) {
    return post.thumbnail_url;
  }
  if (post.video_url && typeof post.video_url === 'string' && !String(post.video_url).startsWith("blob:")) {
    return post.video_url.includes("cloudinary.com") ? deriveCloudinaryThumbnailUrl(post.video_url) : post.video_url.replace(/\.[^/.]+$/, ".jpg");
  }
  if (post.media_url && typeof post.media_url === 'string' && !String(post.media_url).startsWith("blob:")) {
    return post.media_url.includes("cloudinary.com") ? deriveCloudinaryThumbnailUrl(post.media_url) : post.media_url.replace(/\.[^/.]+$/, ".jpg");
  }
  if (post.url && typeof post.url === 'string' && !String(post.url).startsWith("blob:")) {
    return post.url.includes("cloudinary.com") ? deriveCloudinaryThumbnailUrl(post.url) : post.url.replace(/\.[^/.]+$/, ".jpg");
  }
  if (post.thumbnail && !post.thumbnail.includes(".mp4") && !post.thumbnail.includes(".webm") && !String(post.thumbnail).startsWith("blob:")) {
    return post.thumbnail;
  }
  if (post.poster && !post.poster.includes(".mp4") && !post.poster.includes(".webm") && !String(post.poster).startsWith("blob:")) {
    return post.poster;
  }
  if (post.id === 'sample_1') {
    return "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80";
  }
  if (post.id === 'shabnam_reel_1') {
    return "https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/IMG_20260921_164350.png";
  }
  // High quality fallback cover for uploaded videos without a separate static cover image
  return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80";
}

/**
 * Adaptively balances container aspect-ratio to match the video's natural ratio
 * (square, portrait, landscape) clamped between 4:5 and 1.91:1 without rigid height
 * or letterboxing black spaces, using object-fit: cover for edge-to-edge presentation.
 */
function adaptVideoContainerLayout(container, mediaEl) {
  if (!container || !mediaEl) return;
  const w = mediaEl.videoWidth || mediaEl.naturalWidth || mediaEl.width;
  const h = mediaEl.videoHeight || mediaEl.naturalHeight || mediaEl.height;
  if (!w || !h) return;

  const rawRatio = w / h;
  // Instagram standard: clamped between 0.8 (4:5 maximum vertical height) and 1.91 (horizontal landscape)
  const clampedRatio = Math.max(0.8, Math.min(1.91, rawRatio));

  container.style.aspectRatio = `${clampedRatio}`;
  container.style.height = "auto";

  container.classList.remove("is-landscape", "is-square", "is-portrait");
  if (rawRatio > 1.15) {
    container.classList.add("is-landscape");
  } else if (rawRatio >= 0.88 && rawRatio <= 1.15) {
    container.classList.add("is-square");
  } else {
    container.classList.add("is-portrait");
  }
}

/**
 * Safe video play handler that tracks the active play promise and catches AbortError/NotAllowedError.
 * Prevents unhandled rejection crashes when rapid scrolling interrupts video playback.
 */
function safePlayVideo(video) {
  if (!video) return Promise.resolve();
  try {
    const playPromise = video.play();
    if (playPromise !== undefined && typeof playPromise.then === "function") {
      video._playPromise = playPromise;
      return playPromise
        .catch((err) => {
          // AbortError is expected when rapid scrolling triggers pause() before play() resolves
          if (err && (err.name === "AbortError" || String(err.message || "").toLowerCase().includes("interrupted"))) {
            return;
          }
          if (err && err.name === "NotAllowedError") {
            // Autoplay policy: fallback to muted playback
            video.muted = true;
            return video.play().catch((mutedErr) => {
              if (mutedErr && (mutedErr.name === "AbortError" || String(mutedErr.message || "").toLowerCase().includes("interrupted"))) {
                return;
              }
            });
          }
        })
        .finally(() => {
          if (video._playPromise === playPromise) {
            video._playPromise = null;
          }
        });
    }
  } catch (err) {
    if (err && (err.name === "AbortError" || String(err.message || "").toLowerCase().includes("interrupted"))) {
      return Promise.resolve();
    }
  }
  return Promise.resolve();
}

/**
 * Safe video pause handler that waits for or handles any in-flight play() promise.
 * Avoids browser AbortError exceptions and guarantees playback is safely halted.
 */
function safePauseVideo(video) {
  if (!video) return;
  try {
    if (video._playPromise && typeof video._playPromise.then === "function") {
      video._playPromise
        .then(() => {
          try {
            video.pause();
          } catch (_) {}
        })
        .catch(() => {
          try {
            video.pause();
          } catch (_) {}
        });
    } else {
      video.pause();
    }
    video.muted = true;
  } catch (err) {
    if (err && (err.name === "AbortError" || String(err.message || "").toLowerCase().includes("interrupted"))) {
      return;
    }
  }
}

/**
 * Attaches Video Completion Overlay and action handlers ("Watch again" / "Watch more reels")
 */
function attachVideoCompletionHandlers(card, videoBox, video) {
  if (!videoBox || !video) return;
  if (video._completionAttached) return;
  video._completionAttached = true;

  let overlay = videoBox.querySelector(".video-completion-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "video-completion-overlay";
    overlay.innerHTML = `
      <div class="video-completion-icon">
        <i class="fa-solid fa-check"></i>
      </div>
      <div class="video-completion-title">Watch completed</div>
      <div class="video-completion-actions">
        <button type="button" class="btn-watch-again" title="Replay video">
          <i class="fa-solid fa-rotate-right"></i>
          <span>Watch again</span>
        </button>
        <button type="button" class="btn-watch-more" title="Watch more reels">
          <span>Watch more reels</span>
          <i class="fa-solid fa-arrow-down"></i>
        </button>
      </div>
    `;
    videoBox.appendChild(overlay);
  }

  const showCompletion = () => {
    safePauseVideo(video);
    overlay.classList.add("active");
    videoBox.classList.remove("is-playing");
  };

  const hideCompletion = () => {
    overlay.classList.remove("active");
  };

  // Strictly disable infinite auto-loop so completion event triggers cleanly
  video.loop = false;
  video.removeAttribute("loop");

  video.addEventListener("ended", () => {
    showCompletion();
  });

  video.addEventListener("timeupdate", () => {
    if (video.duration && video.duration > 0 && video.currentTime >= video.duration - 0.25) {
      if (!overlay.classList.contains("active")) {
        showCompletion();
      }
    }
  });

  video.addEventListener("playing", () => {
    if (video.currentTime < (video.duration ? video.duration - 0.5 : 1)) {
      hideCompletion();
    }
  });

  const btnWatchAgain = overlay.querySelector(".btn-watch-again");
  if (btnWatchAgain && !btnWatchAgain._bound) {
    btnWatchAgain._bound = true;
    btnWatchAgain.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideCompletion();
      try {
        video.currentTime = 0;
      } catch (_) {}
      video.muted = isGlobalAudioMuted ? isGlobalAudioMuted() : false;
      safePlayVideo(video).then(() => {
        videoBox.classList.add("is-playing");
      });
    });
  }

  const btnWatchMore = overlay.querySelector(".btn-watch-more");
  if (btnWatchMore && !btnWatchMore._bound) {
    btnWatchMore._bound = true;
    btnWatchMore.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideCompletion();
      safePauseVideo(video);

      // Smoothly scroll down to the next post/card
      const parentCard = card || videoBox.closest(".post-card");
      const nextCard = parentCard ? parentCard.nextElementSibling : null;
      if (nextCard && nextCard.classList.contains("post-card")) {
        nextCard.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (typeof loadNextPostBatch === "function") {
        loadNextPostBatch().then(() => {
          setTimeout(() => {
            const updatedNext = parentCard ? parentCard.nextElementSibling : null;
            if (updatedNext && updatedNext.classList.contains("post-card")) {
              updatedNext.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 120);
        });
      }
    });
  }
}

/* =======================================================
   ২. পোস্ট কার্ড ক্রিয়েটর (Create Post Card Element)
======================================================= */
function createPostCardElement(post, index = 0) {
  const currentUserId = typeof getCurrentUserId === "function" ? getCurrentUserId() : null;
  const profile = (Array.isArray(post.profiles) ? post.profiles[0] : post.profiles) || {};
  const isShabnam = post.user === 'shabnam_ai' || post.id === 'shabnam_reel_1' || profile.username === 'shabnam_ai';

  const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";

  // Strictly render author from post.profiles, never fall back to static 'user'
  const authorUsername = isShabnam 
    ? "shabnam_ai" 
    : (profile.username || post.author_name || 'creator');

  const authorAvatar = isShabnam 
    ? SHABNAM_AI_PROFILE.avatar 
    : (profile.avatar_url || post.avatar || defaultAvatar);

  const isCurrentUser = !isShabnam && Boolean(
    post.user_id && currentUserId && String(post.user_id) === String(currentUserId)
  );

  const displayUser = authorUsername;
  const displayAvatar = authorAvatar;
  const usernameClass = "font-semibold";
  const posterImg = getPostThumbnail(post);
  const targetUserId = post.user_id || profile.id;

  let userClickAttr = "";
  if (isCurrentUser) {
    userClickAttr = 'onclick="if (typeof openMyProfileTab===\'function\') openMyProfileTab(); else if (window.openMyProfileTab) window.openMyProfileTab();" style="cursor: pointer;" title="View My Profile"';
  } else if (isShabnam) {
    userClickAttr = 'onclick="if (typeof openProfile===\'function\') openProfile(\'shabnam_ai\'); else if (window.openProfile) window.openProfile(\'shabnam_ai\');" style="cursor: pointer;" title="View Shabnam AI Profile"';
  } else if (targetUserId) {
    userClickAttr = `onclick="if (typeof openProfile===\'function\') openProfile('${targetUserId}', '${displayUser}', '${displayAvatar}'); else if (window.openProfile) window.openProfile('${targetUserId}', '${displayUser}', '${displayAvatar}');" style="cursor: pointer;" title="View ${displayUser}'s Profile"`;
  }

  // Follow button for other creators on post card
  let followBtnHtml = "";
  if (!isCurrentUser && !isShabnam && targetUserId) {
    const isFoll = isFollowingUser(targetUserId);
    followBtnHtml = `
      <button 
        type="button" 
        data-follow-user-id="${targetUserId}"
        data-is-following="${isFoll}"
        class="post-feed-follow-btn text-[12px] font-semibold ${isFoll ? 'text-neutral-400 hover:text-neutral-500' : 'text-sky-500 hover:text-sky-600'} ml-1.5 cursor-pointer"
        onclick="event.stopPropagation(); toggleFollowUser('${targetUserId}', '${displayUser}')"
      >
        ${isFoll ? '• Following' : '• Follow'}
      </button>
    `;
  }

  const card = document.createElement("div");
  card.className = "post-card";
  card.dataset.id = post.id;
  card.dataset.postId = post.id;
  card.dataset.userId = post.user_id || '';
  if (isCurrentUser) card.dataset.currentUserPost = "true";

  const postComments = typeof getStoredComments === "function" ? getStoredComments(post.id) : [];
  const initialCommentsCount = (postComments && postComments.length) ? postComments.length : (post.commentsCount || 18);

  const isCarouselPost = Boolean(post.isCarousel && post.carouselItems && post.carouselItems.length > 1);

  // Decode and strictly sanitize caption, stripping any internal [FLASHGRAM_SONG: ...] JSON or raw URLs
  const { caption: decodedCaption, song: decodedSong } = decodePostCaptionAndSong(post.caption || '');
  const cleanCaption = sanitizeCaptionText(decodedCaption);

  const attachedSong = post.music || decodedSong || ((post.song_title || post.soundTitle) ? {
    id: post.song_id || '',
    title: post.song_title || post.soundTitle || 'Featured Track',
    artist: post.song_artist || post.soundArtist || 'Artist',
    audio_url: post.audio_url || '',
    cover_url: post.song_cover || post.cover_url || DEFAULT_MUSIC_COVER,
    duration: post.duration || 30
  } : null);

  if (attachedSong && !post.music) {
    post.music = attachedSong;
  }
  const hasAttachedMusic = Boolean(attachedSong);

  let mediaMarkup = "";
  if (isCarouselPost) {
    mediaMarkup = `
      <div class="post-carousel-container relative" data-post-id="${post.id}">
        <div class="carousel-counter-badge">1/${post.carouselItems.length}</div>
        ${post.carouselItems.map((item, idx) => `
          <div class="post-carousel-item" data-index="${idx}">
            ${item.type === 'video'
              ? `<video src="${getOptimizedVideoUrl(item.url)}" poster="${item.thumbnail || ''}" class="w-full h-full object-cover" loop muted playsinline preload="metadata"></video>`
              : `<img src="${item.url}" alt="Carousel ${idx + 1}" class="w-full h-full object-cover" loading="lazy" />`}
          </div>
        `).join('')}
      </div>
      <div class="carousel-dots-container">
        ${post.carouselItems.map((_, idx) => `<span class="carousel-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>`).join('')}
      </div>
    `;
  } else {
    const mediaUrl = post.media_url || post.video_url || post.url || "";
    const optimizedMediaUrl = getOptimizedVideoUrl(mediaUrl);
    const videoSrc = post.media_url || optimizedMediaUrl;
    const isPhoto = post.media_type === "photo" || (!post.media_type && !mediaUrl.match(/\.(mp4|webm|mov|m4v)($|\?)/i) && mediaUrl.match(/\.(jpg|jpeg|png|webp|gif)($|\?)/i));

    if (isPhoto) {
      mediaMarkup = `
        <div class="home-post-video-container home-video-container post-video-container relative" data-post-id="${post.id}" style="cursor: pointer;">
          <img class="home-post-video-player w-full h-full object-cover" src="${videoSrc || posterImg}" alt="${displayUser} photo" loading="lazy" />
        </div>
      `;
    } else {
      mediaMarkup = `
        <div class="home-post-video-container home-video-container post-video-container relative" data-post-id="${post.id}" data-video-url="${post.video_url || post.media_url || videoSrc}" data-poster-url="${post.thumbnail_url || posterImg}" style="cursor: pointer;" title="Watch Reel">
          <div class="home-video-skeleton"></div>
          <video
            class="home-post-video-player w-full h-full object-cover"
            ${index === 0 ? `src="${post.video_url || post.media_url || videoSrc}"` : ''}
            poster="${post.thumbnail_url || posterImg}"
            playsinline
            muted
            preload="metadata"
          ></video>
          ${Boolean(post.isOfflineCached) 
            ? `<div class="offline-item-badge absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10.5px] font-semibold border border-white/10 shadow-sm"><i class="fa-solid fa-circle-check text-sky-400 text-[10px]"></i><span>Cached</span></div>`
            : (isOffline() 
                ? `<div class="offline-item-badge absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-neutral-300 text-[10.5px] font-medium border border-white/10"><i class="fa-solid fa-wifi-slash text-amber-400 text-[10px]"></i><span>Offline</span></div>`
                : '')}
          <div class="home-play-badge"><i class="fa-solid fa-play ml-0.5"></i></div>
          <div class="sound-status-badge"><i class="fa-solid fa-volume-high"></i></div>
          <div class="video-completion-overlay">
            <div class="video-completion-icon">
              <i class="fa-solid fa-check"></i>
            </div>
            <div class="video-completion-title">Watch completed</div>
            <div class="video-completion-actions">
              <button type="button" class="btn-watch-again" title="Replay video">
                <i class="fa-solid fa-rotate-right"></i>
                <span>Watch again</span>
              </button>
              <button type="button" class="btn-watch-more" title="Watch more reels">
                <span>Watch more reels</span>
                <i class="fa-solid fa-arrow-down"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  const musicBadgeMarkup = hasAttachedMusic ? `
    <div class="post-music-badge cursor-pointer" data-post-id="${post.id}" title="Tap to listen • 30-Second Audio">
      <i class="fa-solid fa-music music-status-icon text-pink-500"></i>
      <span class="truncate max-w-[200px]">${attachedSong.title} • ${attachedSong.artist}</span>
      <div class="music-wave-bars"><span></span><span></span><span></span></div>
    </div>
  ` : '';

  card.dataset.hasMusic = hasAttachedMusic ? "true" : "false";
  card.dataset.isCarousel = isCarouselPost ? "true" : "false";

  card.innerHTML = `
    <div class="post-header">
      <div class="post-user" ${userClickAttr}>
        <div class="post-avatar">
          ${displayAvatar ? `<img src="${displayAvatar}" alt="${displayUser}" crossorigin="anonymous" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : ''}
          <i class="fa-solid fa-user" style="${displayAvatar ? 'display:none;' : ''}"></i>
        </div>
        <div class="post-user-meta">
          <div class="flex items-center gap-1">
            <span class="post-username font-semibold text-[13.5px] text-neutral-900 dark:text-white">${displayUser}</span>
            ${isShabnam ? '<span class="text-sky-500 text-[11px]" title="Verified"><i class="fa-solid fa-circle-check"></i></span>' : ''}
            ${followBtnHtml}
          </div>
          <span class="post-location">${post.location || 'Original Audio'}</span>
          ${musicBadgeMarkup}
        </div>
      </div>
      <i class="fa-solid fa-ellipsis post-more-btn cursor-pointer" title="Post options"></i>
    </div>
    ${mediaMarkup}
    <div class="post-actions">
      <div class="post-actions-left">
        <i class="fa-regular fa-heart action-btn like-btn"></i>
        <i class="fa-regular fa-comment action-btn comment-icon-btn" title="Comments"></i>
        <i class="fa-regular fa-paper-plane action-btn share-icon-btn" title="Share"></i>
      </div>
      <i class="fa-regular fa-bookmark action-btn bookmark-btn"></i>
    </div>
    <div class="post-details">
      <div class="post-likes"><span class="likes-count">${(post.likes_count !== undefined && post.likes_count !== null ? post.likes_count : (post.likesCount !== undefined && post.likesCount !== null ? post.likesCount : 0)).toLocaleString()}</span> likes</div>
      ${hasAttachedMusic ? `
        <!-- Neat Audio Indicator / Music Bar Component -->
        <div class="post-audio-bar my-1.5 px-3 py-1.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-700/60 flex items-center justify-between text-xs cursor-pointer select-none" data-post-id="${post.id}" onclick="event.stopPropagation(); if (typeof window.playFeedPostAudio === 'function') window.playFeedPostAudio('${post.id}');" title="Audio: ${attachedSong.title} • ${attachedSong.artist}">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-6 h-6 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 text-[11px]">
              <i class="fa-solid fa-music"></i>
            </span>
            <span class="font-semibold text-neutral-900 dark:text-neutral-100 truncate text-[12px]">${attachedSong.title} • ${attachedSong.artist}</span>
          </div>
          <span class="text-[10px] uppercase font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full shrink-0">Audio</span>
        </div>
      ` : ''}
      <div class="post-caption">
        <span class="caption-user ${usernameClass}" ${userClickAttr}>${displayUser}</span>
        <span>${cleanCaption || 'Moments ✨'}</span>
      </div>
      <div class="post-comments-link" style="cursor: pointer;" data-post-id="${post.id}">View all ${post.comments_count !== undefined && post.comments_count !== null ? post.comments_count : (post.commentsCount !== undefined && post.commentsCount !== null ? post.commentsCount : 0)} comments</div>
      <div class="post-time">${post.time || '2 HOURS AGO'}</div>
    </div>
  `;

  const videoBox = card.querySelector(".home-post-video-container") || card.querySelector(".home-video-container");
  const carouselBox = card.querySelector(".post-carousel-container");
  const posterElement = card.querySelector(".home-video-poster");
  const likeBtn = card.querySelector(".like-btn");
  const bookmarkBtn = card.querySelector(".bookmark-btn");
  const likesSpan = card.querySelector(".likes-count");
  let currentLikes = post.likes_count !== undefined && post.likes_count !== null ? post.likes_count : (post.likesCount !== undefined && post.likesCount !== null ? post.likesCount : 0);
  let isLiked = isPostLikedByUser(post.id, currentUserId);
  if (likeBtn) {
    likeBtn.classList.toggle("liked", isLiked);
    likeBtn.classList.toggle("fa-solid", isLiked);
    likeBtn.classList.toggle("fa-regular", !isLiked);
  }

  card._postData = post;

  if (videoBox) {
    // Standard Home Feed video container
    videoBox._postData = post;

    const vidEl = videoBox.querySelector("video");
    const imgEl = videoBox.querySelector("img");
    if (vidEl) {
      if (vidEl.readyState >= 1) {
        adaptVideoContainerLayout(videoBox, vidEl);
      } else {
        vidEl.addEventListener("loadedmetadata", () => {
          adaptVideoContainerLayout(videoBox, vidEl);
        }, { once: true });
      }
      // Attach conditional Fullscreen button on landscape feed videos
      attachConditionalFullscreenButton(videoBox, vidEl, {
        author: displayUser,
        caption: cleanCaption || 'Flashgram Video'
      });
      // Attach video completion overlay and action handlers ("Watch again" / "Watch more reels")
      attachVideoCompletionHandlers(card, videoBox, vidEl);
    } else if (imgEl) {
      if (imgEl.complete && imgEl.naturalWidth) {
        adaptVideoContainerLayout(videoBox, imgEl);
      } else {
        imgEl.addEventListener("load", () => {
          adaptVideoContainerLayout(videoBox, imgEl);
        }, { once: true });
      }
    }

    // Single tap immediately navigates to the full-screen Reels viewer with this video active
    videoBox.addEventListener("click", (e) => {
      if (e.target.closest(".video-fullscreen-btn") || e.target.closest(".video-completion-overlay")) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      pauseAllHomeVideos();
      navigateToReel(post.id, post.url);
    });
  }

  if (carouselBox) {
    const counterBadge = card.querySelector(".carousel-counter-badge");
    const dots = card.querySelectorAll(".carousel-dot");
    carouselBox.addEventListener("scroll", () => {
      const scrollLeft = carouselBox.scrollLeft;
      const itemWidth = carouselBox.offsetWidth || 1;
      const activeIndex = Math.min(post.carouselItems.length - 1, Math.max(0, Math.round(scrollLeft / itemWidth)));
      if (counterBadge) counterBadge.textContent = `${activeIndex + 1}/${post.carouselItems.length}`;
      dots.forEach((dot, i) => dot.classList.toggle("active", i === activeIndex));
    }, { passive: true });
  }

  const musicBadge = card.querySelector(".post-music-badge");
  if (musicBadge && post.music) {
    musicBadge.addEventListener("click", (e) => {
      e.stopPropagation();
      if (audio30sController.currentPostId === post.id) {
        audio30sController.stopPlayback();
      } else {
        audio30sController.playTrackForPost(post.id, post.music);
      }
    });
  }

  likeBtn.onclick = async () => {
    const { isLiked: nextLiked } = togglePostLike(post.id, currentUserId);
    isLiked = nextLiked;
    likeBtn.classList.toggle("liked", isLiked);
    likeBtn.classList.toggle("fa-solid", isLiked);
    likeBtn.classList.toggle("fa-regular", !isLiked);
    currentLikes = Math.max(0, currentLikes + (isLiked ? 1 : -1));
    likesSpan.textContent = currentLikes.toLocaleString();
    post.likes_count = currentLikes;
    post.likesCount = currentLikes;

    if (supabase && post.id && !String(post.id).startsWith("pending_") && !String(post.id).startsWith("post_1")) {
      try {
        await supabase.from('posts').update({ likes_count: currentLikes }).eq('id', post.id);
      } catch (_) {}
    }
  };

  bookmarkBtn.onclick = () => {
    bookmarkBtn.classList.toggle("fa-solid");
    bookmarkBtn.classList.toggle("fa-regular");
  };

  const moreBtn = card.querySelector(".post-more-btn");
  if (moreBtn) {
    moreBtn.onclick = (e) => {
      e.stopPropagation();
      openPostOptionsSheet(post, card);
    };
  }

  const shareBtn = card.querySelector(".share-icon-btn");
  if (shareBtn) {
    shareBtn.onclick = (e) => {
      e.stopPropagation();
      openReelsShareSheet(post);
    };
  }

  const commentBtn = card.querySelector(".comment-icon-btn");
  if (commentBtn) {
    commentBtn.onclick = (e) => {
      e.stopPropagation();
      openReelsCommentsSheet(post.id, post);
    };
  }

  const commentsLink = card.querySelector(".post-comments-link");
  if (commentsLink) {
    commentsLink.onclick = (e) => {
      e.stopPropagation();
      openReelsCommentsSheet(post.id, post);
    };
  }

  return card;
}

/* =======================================================
   ৩. হোম ফিড রেন্ডারার ও ব্যাচ লোডিং পেজিনেশন
   (Batch Loading Feed Renderer & Pagination Sentinel)
======================================================= */
const BATCH_SIZE = 2;
let allFeedPostsCache = [];
let currentRenderedCount = 0;
let isBatchLoading = false;
let feedPaginationObserver = null;

function setupPaginationSentinel(feedContainer) {
  if (!feedContainer) return;
  removePaginationSentinel();

  const sentinel = document.createElement("div");
  sentinel.id = "feedPaginationSentinel";
  sentinel.className = "feed-pagination-sentinel";
  sentinel.innerHTML = `
    <div class="feed-spinner-ring"></div>
    <span class="text-[12px] text-neutral-400 font-medium">Loading more posts...</span>
  `;
  feedContainer.appendChild(sentinel);

  const homeView = document.getElementById("homeView");
  const feedScrollContainer = document.getElementById("feedScrollContainer");

  feedPaginationObserver = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry && entry.isIntersecting) {
      if (!isBatchLoading && currentRenderedCount < allFeedPostsCache.length) {
        loadNextPostBatch();
      }
    }
  }, {
    root: feedScrollContainer || homeView || null,
    rootMargin: "250px 0px",
    threshold: 0.1
  });

  feedPaginationObserver.observe(sentinel);
}

function removePaginationSentinel() {
  if (feedPaginationObserver) {
    feedPaginationObserver.disconnect();
    feedPaginationObserver = null;
  }
  const sentinel = document.getElementById("feedPaginationSentinel");
  if (sentinel) {
    sentinel.remove();
  }
}

async function loadNextPostBatch() {
  if (isBatchLoading) return;
  if (currentRenderedCount >= allFeedPostsCache.length) {
    removePaginationSentinel();
    return;
  }

  isBatchLoading = true;
  const feedContainer = document.getElementById("feedContainer");
  const sentinel = document.getElementById("feedPaginationSentinel");
  if (!feedContainer) {
    isBatchLoading = false;
    return;
  }

  // Artificial mini-delay so the spinning loader icon is smoothly visible
  await new Promise(r => setTimeout(r, 220));

  const nextBatch = allFeedPostsCache.slice(currentRenderedCount, currentRenderedCount + BATCH_SIZE);
  const newCards = [];

  nextBatch.forEach((post, i) => {
    try {
      const card = createPostCardElement(post, currentRenderedCount + i);
      if (sentinel && sentinel.parentNode === feedContainer) {
        feedContainer.insertBefore(card, sentinel);
      } else {
        feedContainer.appendChild(card);
      }
      newCards.push(card);
    } catch (err) {
      console.warn("[Feed] Error rendering batched post:", err);
    }
  });

  currentRenderedCount += nextBatch.length;

  // Add new video boxes to existing homeFeedObserver
  if (homeFeedObserver) {
    newCards.forEach(c => {
      const vb = c.querySelector(".home-video-container");
      if (vb) homeFeedObserver.observe(vb);
      if (c.dataset.hasMusic === "true") homeFeedObserver.observe(c);
    });
  }

  if (currentRenderedCount >= allFeedPostsCache.length) {
    removePaginationSentinel();
  }

  isBatchLoading = false;
}

async function renderHomeFeed(forceRefresh = false) {
  const feedContainer = document.getElementById("feedContainer");
  if (!feedContainer) return;

  try {
    // Wipe deprecated / stale local storage post entries
    try {
      localStorage.removeItem("cached_posts");
    } catch (_) {}

    let isOfflineFeedMode = isOffline();

    // In-memory query caching: Only fetch from Supabase if cache is empty or forceRefresh is true
    if (forceRefresh || allFeedPostsCache.length === 0) {
      console.log("[Feed] Fetching posts for Home Feed from source...");
      let livePosts = null;

      // 1. If device is offline, retrieve fully-watched posts from offline_watched_posts
      if (isOfflineFeedMode) {
        console.log("[Feed] Offline status detected. Loading cached watched posts from offline_watched_posts...");
        const offlinePosts = await getOfflineWatchedPosts();
        if (offlinePosts && offlinePosts.length > 0) {
          livePosts = offlinePosts.map(p => ({ ...p, isOfflineCached: true }));
        }
      }

      if (!livePosts && !isOfflineFeedMode && !isOffline()) {
        try {
          console.log("[Feed] Loading live posts with author profiles mapping via fetchSupabasePosts...");
          livePosts = await fetchSupabasePosts();
        } catch (qErr) {
          console.warn("[Feed] Supabase posts query exception:", qErr);
        }
      }

      if (!livePosts || livePosts.length === 0) {
        // Fallback to offline watched posts if network returned zero posts or device lost connection
        const offlinePosts = await getOfflineWatchedPosts();
        if (offlinePosts && offlinePosts.length > 0) {
          livePosts = offlinePosts.map(p => ({ ...p, isOfflineCached: true }));
          isOfflineFeedMode = true;
        }
      }

      // Default welcome fallback post if database is brand new, empty, or RLS blocked
      if ((!livePosts || livePosts.length === 0) && !isOffline() && !isOfflineFeedMode) {
        console.log("[Feed] Supplying default Shabnam AI welcome post fallback to prevent broken feed view.");
        livePosts = [{
          id: "shabnam_reel_1",
          user_id: "shabnam_ai",
          url: SHABNAM_AI_PROFILE.videoUrl,
          video_url: SHABNAM_AI_PROFILE.videoUrl,
          media_url: SHABNAM_AI_PROFILE.videoUrl,
          thumbnail_url: "https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/IMG_20260921_164350.png",
          caption: SHABNAM_AI_PROFILE.caption,
          profiles: {
            id: "shabnam_ai",
            username: "shabnam_ai",
            avatar_url: SHABNAM_AI_PROFILE.avatar
          },
          author_name: "shabnam_ai",
          user: "shabnam_ai",
          avatar: SHABNAM_AI_PROFILE.avatar,
          likes_count: 14200,
          comments_count: 184,
          time: "RECENT"
        }];
      }

      const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";
      const currentUserId = typeof getCurrentUserId === "function" ? getCurrentUserId() : null;

      const formattedUserPosts = (livePosts || []).map((p, idx) => {
        const rawVidUrl = p.video_url || p.url || '';
        const vidUrl = getOptimizedVideoUrl(rawVidUrl);
        const thumbUrl = p.thumbnail_url || (rawVidUrl ? deriveCloudinaryThumbnailUrl(rawVidUrl) : '');
        const profile = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) || {};
        
        const isMine = Boolean(
          p.user_id && currentUserId && String(p.user_id) === String(currentUserId)
        );

        const authorUsername = profile.username || profile.display_name || p.author_name || (isMine ? UserProfileStore.state.username : 'creator');
        const authorAvatar = profile.avatar_url || p.avatar_url || (isMine ? UserProfileStore.state.avatar : defaultAvatar);
        const stableId = p.id || `post_${p.created_at || idx}`;

        const { caption: userCleanCaption, song: userDecodedSong } = decodePostCaptionAndSong(p.caption || '');
        const attachedMusic = p.music || userDecodedSong || (p.song_title ? {
          id: p.song_id || '',
          title: p.song_title,
          artist: p.song_artist || 'Artist',
          audio_url: p.audio_url || '',
          cover_url: p.song_cover || DEFAULT_MUSIC_COVER
        } : null);

        return {
          id: String(stableId),
          user_id: p.user_id || '',
          url: vidUrl,
          video_url: vidUrl,
          thumbnail: thumbUrl,
          thumbnail_url: thumbUrl,
          profiles: {
            id: profile.id || p.user_id,
            username: authorUsername,
            avatar_url: authorAvatar
          },
          author_name: authorUsername,
          user: authorUsername,
          avatar: authorAvatar,
          isCurrentUser: isMine,
          location: p.location || (attachedMusic ? `${attachedMusic.title} • ${attachedMusic.artist}` : 'Original Audio'),
          caption: userCleanCaption || 'Flashgram Video Post! ✨ #lifestyle',
          music: attachedMusic,
          likesCount: p.likes_count !== undefined && p.likes_count !== null ? p.likes_count : (p.likesCount !== undefined && p.likesCount !== null ? p.likesCount : 0),
          commentsCount: p.comments_count !== undefined && p.comments_count !== null ? p.comments_count : (p.commentsCount !== undefined && p.commentsCount !== null ? p.commentsCount : 0),
          time: p.created_at ? 'RECENT' : 'JUST NOW'
        };
      });

      allFeedPostsCache = [...inMemoryLocalPosts, ...formattedUserPosts];
    }

    console.log(`[Feed] Total cached posts ready: ${allFeedPostsCache.length} (Offline: ${isOfflineFeedMode})`);

    // Clean up any previously playing video decoder instances before clearing container
    pauseAllHomeVideos();
    feedContainer.innerHTML = "";
    currentRenderedCount = 0;

    if (isOfflineFeedMode && allFeedPostsCache.length > 0) {
      const offlineBanner = document.createElement("div");
      offlineBanner.className = "offline-feed-banner mx-3.5 my-3 px-3.5 py-2.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-900/90 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between text-[12px] select-none shadow-sm";
      offlineBanner.innerHTML = `
        <div class="flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 min-w-0">
          <i class="fa-solid fa-cloud-arrow-down text-sky-500 text-sm shrink-0"></i>
          <span class="truncate">Offline Mode • <strong>${allFeedPostsCache.length}</strong> saved posts ready</span>
        </div>
        <span class="shrink-0 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Cached</span>
      `;
      feedContainer.appendChild(offlineBanner);
    }

    if (allFeedPostsCache.length === 0) {
      if (isOffline() || isOfflineFeedMode) {
        feedContainer.innerHTML = `
          <div style="padding: 60px 24px; text-align: center; color: #8e8e8e;">
            <div style="width: 68px; height: 68px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; opacity: 0.85;">
              <i class="fa-solid fa-cloud-arrow-down" style="font-size: 28px; color: #0095f6;"></i>
            </div>
            <div style="font-weight: 700; font-size: 17px; color: currentColor; margin-bottom: 6px;">No Cached Posts Yet</div>
            <div style="font-size: 13.5px; opacity: 0.75; max-width: 280px; margin: 0 auto; line-height: 1.4;">When online, fully watching any post or reel (100%) automatically saves it here for offline viewing.</div>
          </div>
        `;
        return;
      }
      feedContainer.innerHTML = `
        <div style="padding: 60px 24px; text-align: center; color: #8e8e8e;">
          <div style="width: 68px; height: 68px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; opacity: 0.85;">
            <i class="fa-solid fa-camera" style="font-size: 28px;"></i>
          </div>
          <div style="font-weight: 700; font-size: 17px; color: currentColor; margin-bottom: 6px;">No posts yet</div>
          <div style="font-size: 13.5px; opacity: 0.75; max-width: 260px; margin: 0 auto; line-height: 1.4;">When you upload videos, they will appear here live from Supabase.</div>
          <button onclick="if (typeof openInstagramMediaPicker === 'function') openInstagramMediaPicker(); else openMediaCreationPrompt();" style="margin-top: 18px; background: #0095f6; color: white; padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; cursor: pointer;">Upload your first video</button>
        </div>
      `;
      return;
    }

    // Batch Loading: Strictly load only 2 posts at a time into the DOM to keep memory usage low
    const initialBatch = allFeedPostsCache.slice(0, BATCH_SIZE);
    initialBatch.forEach((post, index) => {
      try {
        const card = createPostCardElement(post, index);
        feedContainer.appendChild(card);
      } catch (postErr) {
        console.warn("Error rendering individual post:", postErr);
      }
    });

    currentRenderedCount = initialBatch.length;

    // Display circular spinner loading sentinel at the bottom if more posts exist
    if (currentRenderedCount < allFeedPostsCache.length) {
      setupPaginationSentinel(feedContainer);
    } else {
      removePaginationSentinel();
    }

    // Initialize observation with 0.5 threshold & single audio enforcement
    setupHomeFeedObserver();
  } catch (err) {
    renderFeedErrorBoundary(feedContainer, err);
  }
}

// Requirement 3: Prevent Full Page Hard Reload on Video Upload - Prepend directly to active feed
function prependPostToHomeFeed(newPost) {
  const feedContainer = document.getElementById("feedContainer");
  if (!feedContainer || !newPost) return;

  if (newPost.id) {
    const existing = feedContainer.querySelector(`[data-post-id="${newPost.id}"]`);
    if (existing) return;
  }

  try {
    allFeedPostsCache.unshift(newPost);
    currentRenderedCount++;

    const card = createPostCardElement(newPost, 0);
    if (card) {
      if (feedContainer.firstChild) {
        feedContainer.insertBefore(card, feedContainer.firstChild);
      } else {
        feedContainer.appendChild(card);
      }
    }

    // Refresh observer so the newly prepended video is tracked
    setupHomeFeedObserver();

    // Seamless scroll retention at top of feed
    const homeView = document.getElementById("homeView");
    if (homeView) {
      homeView.scrollTo({ top: 0, behavior: "smooth" });
    }
  } catch (e) {
    console.warn("Error prepending post to feed:", e);
    renderHomeFeed(true);
  }
}

/* =======================================================
   ৪. অন-ডিমান্ড ভিডিও মাউন্টিং ও সিঙ্গেল অডিও প্লেব্যাক
   (Enforce Single Active Video & Audio Playback)
======================================================= */
let activePlayingId = null; // Single active video tracking state
let homeFeedObserver = null;
let currentlyPlayingBox = null;
let currentlyPlayingHomeVideo = null;
let isScrollScheduled = false;
let scrollListenerCleanup = null;
const activeMountedBoxes = new Set();
const MAX_ACTIVE_VIDEO_ELEMENTS = 2; // Strict limit on mobile devices to prevent GPU decoder crashes

async function mountAndPlayVideo(container) {
  if (!container) return;
  const postId = String(container.dataset.postId || "");

  // If already playing this exact post, ensure it is playing and unmuted
  if (activePlayingId === postId && currentlyPlayingBox === container) {
    const existingVid = container.querySelector("video");
    if (existingVid) {
      const overlay = container.querySelector(".video-completion-overlay");
      if (overlay) overlay.classList.remove("active");
      if (existingVid.paused) {
        safePlayVideo(existingVid);
      }
      existingVid.muted = false;
    }
    return;
  }

  // Safely pause and mute all other video posts
  document.querySelectorAll(".home-video-player").forEach(vid => {
    safePauseVideo(vid);
  });

  // Aggressively cleanup previous video decoder if different box
  if (currentlyPlayingBox && currentlyPlayingBox !== container) {
    unmountAndCleanupVideo(currentlyPlayingBox, false);
  }

  activePlayingId = postId;
  currentlyPlayingBox = container;

  // Limit maximum active video elements in the DOM simultaneously to prevent memory exhaustion
  activeMountedBoxes.add(container);
  if (activeMountedBoxes.size > MAX_ACTIVE_VIDEO_ELEMENTS) {
    for (const box of activeMountedBoxes) {
      if (box !== container) {
        unmountAndCleanupVideo(box, true);
        activeMountedBoxes.delete(box);
        if (activeMountedBoxes.size <= MAX_ACTIVE_VIDEO_ELEMENTS) break;
      }
    }
  }

  const videoUrl = container.dataset.videoUrl;
  const posterUrl = container.dataset.posterUrl || (videoUrl ? videoUrl + '#t=0.001' : '');
  if (!videoUrl && !container._postData) return;

  const postData = container._postData || {
    id: postId,
    video_url: videoUrl,
    thumbnail_url: posterUrl
  };

  // Video Source Resolver: Check if cached blob exists in IndexedDB/CacheStorage
  let resolvedVideoSrc = "";
  const cachedBlobUrl = await getCachedVideoBlobUrl(postId);

  if (cachedBlobUrl) {
    resolvedVideoSrc = cachedBlobUrl;
  } else if (isOffline()) {
    // If device is offline and no cached blob exists for that item, show poster only
    console.log(`[Feed] Post ${postId} not cached and offline. Rendering poster thumbnail only.`);
    let offlineBadge = container.querySelector(".offline-item-badge");
    if (!offlineBadge) {
      offlineBadge = document.createElement("div");
      offlineBadge.className = "offline-item-badge absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-neutral-300 text-[10.5px] font-medium border border-white/10 shadow-sm";
      offlineBadge.innerHTML = '<i class="fa-solid fa-wifi-slash text-amber-400 text-[10px]"></i><span>Offline • Not Cached</span>';
      container.appendChild(offlineBadge);
    }
    return;
  } else {
    resolvedVideoSrc = getOptimizedVideoUrl(videoUrl);
  }

  let video = container.querySelector("video");
  if (!video) {
    video = document.createElement("video");
    video.className = "home-post-video-player home-video-player post-video-player w-full h-full object-cover";
    video.loop = false;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "true");
    video.removeAttribute("loop");
    video.crossOrigin = "anonymous";
    video.setAttribute("crossorigin", "anonymous");
    video.preload = "metadata";
    video.setAttribute("preload", "metadata");

    // Hardware acceleration to offload rendering to the GPU and eliminate stutter
    video.style.transform = "translateZ(0)";
    video.style.webkitTransform = "translateZ(0)";
    video.style.willChange = "transform";
    video.style.backfaceVisibility = "hidden";

    // Attach poster
    if (posterUrl && !posterUrl.includes(".mp4") && !posterUrl.includes(".webm") && !String(posterUrl).startsWith("blob:")) {
      video.poster = posterUrl;
      video.setAttribute("poster", posterUrl);
    }
    video.src = resolvedVideoSrc;

    // Automatic Cache on 100% Watched (timeupdate >= 0.95 or ended)
    trackVideoProgressForCaching(video, postData);

    // Adaptively scale feed video container layout for balanced display
    video.onloadedmetadata = () => {
      adaptVideoContainerLayout(container, video);
    };
    if (video.readyState >= 1) {
      adaptVideoContainerLayout(container, video);
    }

    container.appendChild(video);
  } else if (!video.src || video.src === window.location.href || !video.getAttribute("src")) {
    video.loop = false;
    video.removeAttribute("loop");
    video.preload = "metadata";
    video.setAttribute("preload", "metadata");
    video.src = resolvedVideoSrc;
    video.onloadedmetadata = () => {
      adaptVideoContainerLayout(container, video);
    };
    if (video.readyState >= 1) {
      adaptVideoContainerLayout(container, video);
    }
  } else {
    video.loop = false;
    video.removeAttribute("loop");
    if (video.readyState >= 1) {
      adaptVideoContainerLayout(container, video);
    } else {
      video.addEventListener("loadedmetadata", () => {
        adaptVideoContainerLayout(container, video);
      }, { once: true });
    }
  }

  // Attach conditional Fullscreen button for landscape video posts
  attachConditionalFullscreenButton(container, video, {
    author: container._postData?.author_name || container._postData?.user || "creator",
    caption: container._postData?.caption || ""
  });

  // Attach Video Completion Overlay & Handlers
  attachVideoCompletionHandlers(container.closest(".post-card"), container, video);

  // Hide completion overlay if active when starting playback
  const completionOverlay = container.querySelector(".video-completion-overlay");
  if (completionOverlay) {
    completionOverlay.classList.remove("active");
  }

  // Strictly guarantee that ONLY the active video post plays audio
  video.muted = false;

  video.onplaying = () => {
    container.classList.add("is-playing");
    currentlyPlayingHomeVideo = video;
  };

  // Safe play handling: catches and ignores AbortError from rapid scrolling
  safePlayVideo(video).then(() => {
    container.classList.add("is-playing");
    currentlyPlayingHomeVideo = video;
  });
}

/**
 * Robust off-screen cleanup: stops playback, resets time, and releases hardware decoders
 */
function unmountAndCleanupVideo(container, shouldReleaseDecoder = false) {
  if (!container) return;
  const video = container.querySelector("video");
  if (video) {
    safePauseVideo(video);
    try {
      video.currentTime = 0;
    } catch (_) {}

    // When scrolled out of viewport, completely clear source and call load() to release hardware decoders & RAM
    if (shouldReleaseDecoder) {
      try {
        video.pause();
        video.removeAttribute("src");
        video.load(); // Immediately instructs browser engine to free GPU video memory
      } catch (_) {}
    }
  }

  container.classList.remove("is-playing");
  if (currentlyPlayingBox === container) {
    currentlyPlayingBox = null;
  }
  if (container.dataset.postId === activePlayingId) {
    activePlayingId = null;
  }
  if (currentlyPlayingHomeVideo === video) {
    currentlyPlayingHomeVideo = null;
  }
  activeMountedBoxes.delete(container);
}

function setupHomeFeedObserver() {
  // Clean up previous observer and event handlers
  if (homeFeedObserver) {
    homeFeedObserver.disconnect();
    homeFeedObserver = null;
  }
  if (scrollListenerCleanup) {
    scrollListenerCleanup();
    scrollListenerCleanup = null;
  }

  const homeView = document.getElementById("homeView");
  const feedScrollContainer = document.getElementById("feedScrollContainer");
  if (!homeView) return;

  const videoBoxes = Array.from(document.querySelectorAll(".home-video-container"));
  const musicCards = Array.from(document.querySelectorAll('.post-card[data-has-music="true"]'));
  if (videoBoxes.length === 0 && musicCards.length === 0) return;

  const visibilityMap = new Map();

  const evaluateCenterVideo = () => {
    isScrollScheduled = false;

    // If home view is not active, pause all videos and stop audio immediately
    if (!homeView.classList.contains("active") && window.activeNavId !== "home") {
      pauseAllHomeVideos();
      if (audio30sController && typeof audio30sController.stopPlayback === "function") {
        audio30sController.stopPlayback();
      }
      return;
    }

    const scrollContainer = feedScrollContainer || homeView;
    const containerRect = scrollContainer.getBoundingClientRect();
    const containerCenterY = containerRect.top + containerRect.height / 2;

    let bestBox = null;
    let minDistance = Infinity;

    videoBoxes.forEach(box => {
      const ratio = visibilityMap.get(box) || 0;
      // Videos must ONLY auto-play when actively scrolled into viewport and at least 50% visible
      if (ratio >= 0.5) {
        const rect = box.getBoundingClientRect();
        const boxCenterY = rect.top + rect.height / 2;
        const dist = Math.abs(containerCenterY - boxCenterY);
        if (dist < minDistance) {
          minDistance = dist;
          bestBox = box;
        }
      }
    });

    if (bestBox) {
      mountAndPlayVideo(bestBox);
    } else {
      // If no video post has >= 50% visibility, pause currently playing video
      if (currentlyPlayingBox) {
        unmountAndCleanupVideo(currentlyPlayingBox, false);
      }
    }

    // 30-Second Music Post Auto Playback Sync (IntersectionObserver >= 50% visibility)
    let bestMusicCard = null;
    let minMusicDist = Infinity;

    musicCards.forEach(card => {
      const ratio = visibilityMap.get(card) || 0;
      if (ratio >= 0.5) {
        const rect = card.getBoundingClientRect();
        const cardCenterY = rect.top + rect.height / 2;
        const dist = Math.abs(containerCenterY - cardCenterY);
        if (dist < minMusicDist) {
          minMusicDist = dist;
          bestMusicCard = card;
        }
      }
    });

    if (bestMusicCard && bestMusicCard._postData?.music) {
      audio30sController.playTrackForPost(bestMusicCard.dataset.postId, bestMusicCard._postData.music);
    } else if (!bestMusicCard && audio30sController && audio30sController.currentPostId) {
      audio30sController.stopPlayback();
    }
  };

  // Robust IntersectionObserver strictly detecting viewport visibility and performing off-screen cleanup
  homeFeedObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      visibilityMap.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);

      // Immediately pause and mute outgoing video when dropping below 50% visibility
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5) {
        const v = entry.target.querySelector("video");
        if (v) {
          safePauseVideo(v);
        }
        entry.target.classList.remove("is-playing");

        // Off-screen cleanup: when scrolled away from viewport, clear source to release RAM and decoders
        if (!entry.isIntersecting || entry.intersectionRatio < 0.1) {
          unmountAndCleanupVideo(entry.target, true);
        } else if (currentlyPlayingBox === entry.target || entry.target.dataset.postId === activePlayingId) {
          unmountAndCleanupVideo(entry.target, false);
        }
      }

      // Immediately stop 30-second audio track if music card drops below 50% visibility
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5) {
        if (audio30sController && entry.target.dataset.postId === audio30sController.currentPostId) {
          audio30sController.stopPlayback();
        }
      }
    });

    if (!isScrollScheduled) {
      isScrollScheduled = true;
      requestAnimationFrame(evaluateCenterVideo);
    }
  }, {
    root: feedScrollContainer || null,
    threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0]
  });

  videoBoxes.forEach(box => homeFeedObserver.observe(box));
  musicCards.forEach(card => homeFeedObserver.observe(card));

  // Scroll listener for instantaneous response on rapid user touch/drag
  const onHomeScroll = () => {
    if (currentlyPlayingBox) {
      const rect = currentlyPlayingBox.getBoundingClientRect();
      const scrollContainer = feedScrollContainer || homeView;
      const containerRect = scrollContainer.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top));
      const ratio = rect.height > 0 ? (overlap / rect.height) : 0;
      if (ratio < 0.5) {
        const vid = currentlyPlayingBox.querySelector("video");
        if (vid) {
          safePauseVideo(vid);
        }
        currentlyPlayingBox.classList.remove("is-playing");
      }
    }

    if (audio30sController && audio30sController.currentPostId) {
      const activeCard = document.querySelector(`.post-card[data-post-id="${audio30sController.currentPostId}"]`);
      if (activeCard) {
        const rect = activeCard.getBoundingClientRect();
        const scrollContainer = feedScrollContainer || homeView;
        const containerRect = scrollContainer.getBoundingClientRect();
        const overlap = Math.max(0, Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top));
        const ratio = rect.height > 0 ? (overlap / rect.height) : 0;
        if (ratio < 0.5) {
          audio30sController.stopPlayback();
        }
      }
    }

    if (!isScrollScheduled) {
      isScrollScheduled = true;
      requestAnimationFrame(evaluateCenterVideo);
    }
  };

  homeView.addEventListener("scroll", onHomeScroll, { passive: true });
  if (feedScrollContainer) {
    feedScrollContainer.addEventListener("scroll", onHomeScroll, { passive: true });
  }

  scrollListenerCleanup = () => {
    homeView.removeEventListener("scroll", onHomeScroll);
    if (feedScrollContainer) {
      feedScrollContainer.removeEventListener("scroll", onHomeScroll);
    }
  };

  // Initial evaluation after DOM paint
  setTimeout(evaluateCenterVideo, 120);
}

/**
 * Clean, safe pause of all home feed videos and music tracks.
 * Does NOT destroy or remove <video> elements from the DOM.
 */
function pauseAllHomeVideos() {
  activePlayingId = null;
  if (audio30sController && typeof audio30sController.stopPlayback === "function") {
    audio30sController.stopPlayback();
  }
  if (currentlyPlayingBox) {
    unmountAndCleanupVideo(currentlyPlayingBox, false);
  }

  // Gracefully pause and mute all home feed video players with safe promise handling
  document.querySelectorAll(".home-post-video-container, .home-video-container").forEach(box => {
    box.classList.remove("is-playing");
    const v = box.querySelector("video");
    if (v) {
      safePauseVideo(v);
    }
  });

  currentlyPlayingHomeVideo = null;
  currentlyPlayingBox = null;
}

export const inMemoryLocalPosts = [];

export function addNewPostToFeed(newPost) {
  if (!newPost) return;
  inMemoryLocalPosts.unshift(newPost);
  prependPostToHomeFeed(newPost);
}

// Global browser listeners to prevent background video sound leaks
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseAllHomeVideos();
    } else if (window.activeNavId === "home") {
      setupHomeFeedObserver();
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("blur", () => {
    if (window.activeNavId === "home" && currentlyPlayingHomeVideo) {
      safePauseVideo(currentlyPlayingHomeVideo);
    }
  });

  window.renderHomeFeed = renderHomeFeed;
  window.setupHomeFeedObserver = setupHomeFeedObserver;
  window.pauseAllHomeVideos = pauseAllHomeVideos;
  window.prependPostToHomeFeed = prependPostToHomeFeed;
  window.loadNextPostBatch = loadNextPostBatch;
}

export {
  renderHomeFeed,
  setupHomeFeedObserver,
  pauseAllHomeVideos,
  prependPostToHomeFeed,
  loadNextPostBatch,
  allFeedPostsCache
};



