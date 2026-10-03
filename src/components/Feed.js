// Feed Component (Home Post Feed & Observer with Aggressive Video Memory Cleanup)
import { db } from "../services/database.js";
import { UserProfileStore, showInstagramToast } from "../utils/storage.js";
import { SAMPLE_VIDEOS, SHABNAM_AI_PROFILE } from "../utils/mockData.js";
import { isGlobalAudioMuted } from "./Navbar.js";
import { openMyProfileTab, navigateToReel } from "./ReelsViewer.js";
import { openReelsCommentsSheet, openReelsShareSheet, getStoredComments, openPostOptionsSheet } from "./reels/index.js";
import { openProfile } from "./Profile.js";
import { renderSuggestedReels } from "./SuggestedReels.js";
import { deriveCloudinaryThumbnailUrl, fetchSupabasePosts } from "../services/cloudinaryService.js";

/* =======================================================
   ১. হোম ফিড এরর বাউন্ডারি (Error Boundary Fallback)
======================================================= */
function renderFeedErrorBoundary(container, error) {
  if (!container) return;
  console.error("Home Feed ErrorBoundary caught failure:", error);
  container.innerHTML = `
    <div class="feed-error-boundary">
      <div class="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500 text-2xl shadow-inner mb-1">
        <i class="fa-solid fa-circle-exclamation"></i>
      </div>
      <h3 class="text-[17px] font-bold text-neutral-900 dark:text-white">Couldn't load feed</h3>
      <p class="text-[13px] text-neutral-500 dark:text-neutral-400 max-w-[280px]">
        There was an unexpected issue loading feed posts. Tap below to retry.
      </p>
      <button type="button" class="mt-2 px-5 py-2 rounded-full bg-[#0095F6] hover:bg-sky-600 active:scale-95 text-white font-semibold text-[13.5px] transition-all shadow-sm cursor-pointer" onclick="renderHomeFeed()">
        Tap to retry
      </button>
    </div>
  `;
}

// Requirement 2: Generate or attach automatic thumbnail image without broken video URL
function getPostThumbnail(post) {
  if (post.thumbnail_url && !post.thumbnail_url.includes(".mp4") && !post.thumbnail_url.includes(".webm") && !String(post.thumbnail_url).startsWith("blob:")) {
    return post.thumbnail_url;
  }
  if (post.video_url && post.video_url.includes("cloudinary.com")) {
    return deriveCloudinaryThumbnailUrl(post.video_url);
  }
  if (post.url && post.url.includes("cloudinary.com")) {
    return deriveCloudinaryThumbnailUrl(post.url);
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

/* =======================================================
   ২. পোস্ট কার্ড ক্রিয়েটর (Create Post Card Element)
======================================================= */
function createPostCardElement(post, index = 0) {
  const currentUserId = typeof getCurrentUserId === "function" ? getCurrentUserId() : null;
  const isShabnam = post.user === 'shabnam_ai' || post.id === 'shabnam_reel_1';

  // Render author name directly from post.profiles?.username || post.author_name
  const authorUsername = isShabnam 
    ? "shabnam_ai" 
    : (post.profiles?.username || post.author_name || post.user || UserProfileStore.state.username || "sohel_077");

  const authorAvatar = isShabnam 
    ? SHABNAM_AI_PROFILE.avatar 
    : (post.profiles?.avatar_url || post.avatar || UserProfileStore.state.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100");

  const isCurrentUser = !isShabnam && (
    authorUsername === UserProfileStore.state.username ||
    (post.user_id && currentUserId && String(post.user_id) === String(currentUserId)) ||
    post.isCurrentUser
  );

  const displayUser = authorUsername;
  const displayAvatar = authorAvatar;
  const avatarClass = isCurrentUser ? "current-user-avatar current-user-post-avatar" : "";
  const usernameClass = isCurrentUser ? "current-user-username current-user-post-username" : "";
  const posterImg = getPostThumbnail(post);

  let userClickAttr = "";
  if (isCurrentUser) {
    userClickAttr = 'onclick="openMyProfileTab()" style="cursor: pointer;" title="View Profile"';
  } else if (isShabnam) {
    userClickAttr = 'onclick="openProfile(\'shabnam_ai\')" style="cursor: pointer;" title="View Shabnam AI Profile"';
  }

  const card = document.createElement("div");
  card.className = "post-card";
  card.dataset.id = post.id;
  card.dataset.postId = post.id;
  card.dataset.userId = post.user_id || '';
  if (isCurrentUser) card.dataset.currentUserPost = "true";

  const postComments = typeof getStoredComments === "function" ? getStoredComments(post.id) : [];
  const initialCommentsCount = (postComments && postComments.length) ? postComments.length : (post.commentsCount || 18);

  // Requirement 1 & 2: Exact Instagram feed dimensions (4:5 / 16:9), skeleton shimmer & zero broken image
  card.innerHTML = `
    <div class="post-header">
      <div class="post-user" ${userClickAttr}>
        <div class="post-avatar">
          ${displayAvatar ? `<img src="${displayAvatar}" class="${avatarClass}" alt="${displayUser}" crossorigin="anonymous" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : ''}
          <i class="fa-solid fa-user" style="${displayAvatar ? 'display:none;' : ''}"></i>
        </div>
        <div class="post-user-meta">
          <div class="flex items-center gap-1">
            <span class="post-username ${usernameClass}">${displayUser}</span>
            ${isShabnam ? '<span class="text-sky-500 text-[11px]" title="Verified"><i class="fa-solid fa-circle-check"></i></span>' : ''}
          </div>
          <span class="post-location">${post.location || 'Original Audio'}</span>
        </div>
      </div>
      <i class="fa-solid fa-ellipsis post-more-btn cursor-pointer" title="Post options"></i>
    </div>
    <div class="home-video-container" data-post-id="${post.id}" data-video-url="${post.url}" data-poster-url="${posterImg}" style="cursor: pointer;" title="Watch Reel">
      <div class="home-video-skeleton"></div>
      <img class="home-video-poster" src="${posterImg}" alt="${displayUser} video" loading="lazy" crossorigin="anonymous" onerror="this.style.display='none';" />
      <div class="home-play-badge"><i class="fa-solid fa-play ml-0.5"></i></div>
      <div class="sound-status-badge"><i class="fa-solid fa-volume-high"></i></div>
    </div>
    <div class="post-actions">
      <div class="post-actions-left">
        <i class="fa-regular fa-heart action-btn like-btn"></i>
        <i class="fa-regular fa-comment action-btn comment-icon-btn" title="Comments"></i>
        <i class="fa-regular fa-paper-plane action-btn share-icon-btn" title="Share"></i>
      </div>
      <i class="fa-regular fa-bookmark action-btn bookmark-btn"></i>
    </div>
    <div class="post-details">
      <div class="post-likes"><span class="likes-count">${(post.likesCount || 1248).toLocaleString()}</span> likes</div>
      <div class="post-caption">
        <span class="caption-user ${usernameClass}" ${userClickAttr}>${displayUser}</span>
        <span>${post.caption}</span>
      </div>
      <div class="post-comments-link" style="cursor: pointer;" data-post-id="${post.id}">View all ${initialCommentsCount} comments</div>
      <div class="post-time">${post.time || '2 HOURS AGO'}</div>
    </div>
  `;

  const videoBox = card.querySelector(".home-video-container");
  const posterElement = card.querySelector(".home-video-poster");
  const likeBtn = card.querySelector(".like-btn");
  const bookmarkBtn = card.querySelector(".bookmark-btn");
  const likesSpan = card.querySelector(".likes-count");
  let currentLikes = post.likesCount || 1248;
  let isLiked = false;

  // Requirement 1: Proportional scaling - support portrait (4:5 / 9:16) and landscape (16:9)
  if (posterElement) {
    posterElement.onload = () => {
      const w = posterElement.naturalWidth;
      const h = posterElement.naturalHeight;
      if (w && h) {
        const ratio = w / h;
        if (ratio > 1.25) {
          videoBox.classList.add("is-landscape");
          videoBox.classList.remove("is-square");
        } else if (ratio >= 0.88 && ratio <= 1.15) {
          videoBox.classList.add("is-square");
          videoBox.classList.remove("is-landscape");
        } else {
          videoBox.classList.remove("is-landscape", "is-square");
        }
      }
    };
  }

  // Single tap immediately navigates to the full-screen Reels viewer with this video active
  videoBox.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    pauseAllHomeVideos();
    navigateToReel(post.id, post.url);
  });

  likeBtn.onclick = () => {
    isLiked = !isLiked;
    likeBtn.classList.toggle("liked", isLiked);
    likeBtn.classList.toggle("fa-solid", isLiked);
    likeBtn.classList.toggle("fa-regular", !isLiked);
    currentLikes += isLiked ? 1 : -1;
    likesSpan.textContent = currentLikes.toLocaleString();
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
   ৩. হোম ফিড রেন্ডারার ও প্রিপেন্ডার (Feed Renderer & Prepend)
======================================================= */
async function renderHomeFeed() {
  const feedContainer = document.getElementById("feedContainer");
  if (!feedContainer) return;

  try {
    // Wipe deprecated / stale local storage post entries
    try {
      localStorage.removeItem("cached_posts");
    } catch (_) {}

    const livePosts = await fetchSupabasePosts();
    const formattedUserPosts = (livePosts || []).map(p => {
      const vidUrl = p.video_url || p.url || '';
      const thumbUrl = p.thumbnail_url || (vidUrl ? deriveCloudinaryThumbnailUrl(vidUrl) : '');
      const profile = p.profiles || {};
      const isMine = (p.user_id && p.user_id.includes(UserProfileStore.state.username)) || 
                     (p.user === UserProfileStore.state.username);

      const authorUsername = profile.username || profile.display_name || p.author_name || p.username || (isMine ? UserProfileStore.state.username : UserProfileStore.state.username || 'sohel_077');
      const authorAvatar = profile.avatar_url || p.avatar_url || (isMine ? UserProfileStore.state.avatar : UserProfileStore.state.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100');

      return {
        id: String(p.id),
        user_id: p.user_id || '',
        url: vidUrl,
        video_url: vidUrl,
        thumbnail: thumbUrl,
        thumbnail_url: thumbUrl,
        profiles: {
          username: authorUsername,
          avatar_url: authorAvatar
        },
        author_name: authorUsername,
        user: authorUsername,
        avatar: authorAvatar,
        isCurrentUser: isMine,
        location: p.location || 'Original Audio',
        caption: p.caption || 'Flashgram Video Post! ✨ #lifestyle',
        likesCount: p.likes_count || 1248,
        commentsCount: p.comments_count || 24,
        time: p.created_at ? 'RECENT' : 'JUST NOW'
      };
    });

    // Clean up any previously playing video decoder instances before clearing container
    pauseAllHomeVideos();
    feedContainer.innerHTML = "";

    if (formattedUserPosts.length === 0) {
      feedContainer.innerHTML = `
        <div style="padding: 60px 24px; text-align: center; color: #8e8e8e;">
          <div style="width: 68px; height: 68px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; opacity: 0.85;">
            <i class="fa-solid fa-camera" style="font-size: 28px;"></i>
          </div>
          <div style="font-weight: 700; font-size: 17px; color: currentColor; margin-bottom: 6px;">No posts yet</div>
          <div style="font-size: 13.5px; opacity: 0.75; max-width: 260px; margin: 0 auto; line-height: 1.4;">When you upload videos, they will appear here live from Supabase.</div>
          <button onclick="openMediaCreationPrompt()" style="margin-top: 18px; background: #0095f6; color: white; padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; cursor: pointer;">Upload your first video</button>
        </div>
      `;
      return;
    }

    formattedUserPosts.forEach((post, index) => {
      try {
        const card = createPostCardElement(post, index);
        feedContainer.appendChild(card);
      } catch (postErr) {
        console.warn("Error rendering individual post:", postErr);
      }
    });

    // Initialize observation with 0.7 threshold & single audio enforcement
    setupHomeFeedObserver();
  } catch (err) {
    renderFeedErrorBoundary(feedContainer, err);
  }
}

// Requirement 3: Prevent Full Page Hard Reload on Video Upload - Prepend directly to active feed
function prependPostToHomeFeed(newPost) {
  const feedContainer = document.getElementById("feedContainer");
  if (!feedContainer || !newPost) return;

  try {
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
    renderHomeFeed();
  }
}

/* =======================================================
   ৪. অন-ডিমান্ড ভিডিও মাউন্টিং ও সিঙ্গেল অডিও প্লেব্যাক
   (Enforce Single Active Video & Audio Playback)
======================================================= */
let activePlayingId = null; // Requirement 4: Single active video tracking state
let homeFeedObserver = null;
let currentlyPlayingBox = null;
let currentlyPlayingHomeVideo = null;
let isScrollScheduled = false;
let scrollListenerCleanup = null;

function mountAndPlayVideo(container) {
  if (!container) return;
  const postId = String(container.dataset.postId || "");

  // If already playing this exact post, ensure it is playing and unmuted
  if (activePlayingId === postId && currentlyPlayingBox === container) {
    const existingVid = container.querySelector("video");
    if (existingVid) {
      if (existingVid.paused) {
        existingVid.play().catch(() => {});
      }
      existingVid.muted = false;
    }
    return;
  }

  // Requirement 4: For all other video posts, force pause and mute immediately
  document.querySelectorAll(".home-video-player").forEach(vid => {
    vid.pause();
    vid.muted = true;
  });

  // Aggressively unmount and flush previous video from memory
  if (currentlyPlayingBox && currentlyPlayingBox !== container) {
    unmountAndCleanupVideo(currentlyPlayingBox);
  }

  activePlayingId = postId;
  currentlyPlayingBox = container;
  const videoUrl = container.dataset.videoUrl;
  const posterUrl = container.dataset.posterUrl || (videoUrl ? videoUrl + '#t=0.001' : '');
  if (!videoUrl) return;

  let video = container.querySelector("video");
  if (!video) {
    video = document.createElement("video");
    video.className = "home-video-player";
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.crossOrigin = "anonymous";
    video.setAttribute("crossorigin", "anonymous");
    video.preload = "auto";

    // Requirement 2: Attach crisp first-frame poster on video element (valid image or #t=0.001)
    if (posterUrl && !posterUrl.includes(".mp4") && !posterUrl.includes(".webm") && !String(posterUrl).startsWith("blob:")) {
      video.poster = posterUrl;
      video.setAttribute("poster", posterUrl);
    }
    video.src = videoUrl;

    // Requirement 1: Proportional container aspect ratio based on video metadata
    video.onloadedmetadata = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w && h) {
        const ratio = w / h;
        if (ratio > 1.25) {
          container.classList.add("is-landscape");
          container.classList.remove("is-square");
        } else if (ratio >= 0.88 && ratio <= 1.15) {
          container.classList.add("is-square");
          container.classList.remove("is-landscape");
        } else {
          container.classList.remove("is-landscape", "is-square");
        }
      }
    };

    container.appendChild(video);
  }

  // Requirement 4: Strictly guarantee that ONLY the active video post plays audio
  video.muted = false;

  video.onplaying = () => {
    container.classList.add("is-playing");
    currentlyPlayingHomeVideo = video;
  };

  video.play().then(() => {
    container.classList.add("is-playing");
    currentlyPlayingHomeVideo = video;
  }).catch(() => {
    // If unmuted autoplay blocked by browser policy, fallback to muted
    video.muted = true;
    video.play().then(() => {
      container.classList.add("is-playing");
      currentlyPlayingHomeVideo = video;
    }).catch(() => {});
  });
}

function unmountAndCleanupVideo(container) {
  if (!container) return;
  const video = container.querySelector("video");
  if (video) {
    try {
      video.pause();
      video.muted = true; // Requirement 4: Force muted={true}
      video.onplaying = null;
      video.onloadeddata = null;
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src"); // Detach video buffer
      video.load(); // Aggressively flush hardware video decoders and RAM
      video.remove(); // Fully unmount DOM element
    } catch (e) {
      console.warn("Video cleanup notice:", e);
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
  if (!homeView) return;

  const videoBoxes = Array.from(document.querySelectorAll(".home-video-container"));
  if (videoBoxes.length === 0) return;

  const visibilityMap = new Map();

  const evaluateCenterVideo = () => {
    isScrollScheduled = false;

    // If home view is not active, unmount all video decoders immediately
    if (!homeView.classList.contains("active") && window.activeNavId !== "home") {
      pauseAllHomeVideos();
      return;
    }

    const homeRect = homeView.getBoundingClientRect();
    const homeCenterY = homeRect.top + homeRect.height / 2;

    let bestBox = null;
    let minDistance = Infinity;

    videoBoxes.forEach(box => {
      const ratio = visibilityMap.get(box) || 0;
      // Requirement 4: IntersectionObserver threshold: 0.7 to detect exact video centered in screen
      if (ratio >= 0.7) {
        const rect = box.getBoundingClientRect();
        const boxCenterY = rect.top + rect.height / 2;
        const dist = Math.abs(homeCenterY - boxCenterY);
        if (dist < minDistance) {
          minDistance = dist;
          bestBox = box;
        }
      }
    });

    if (bestBox) {
      mountAndPlayVideo(bestBox);
    } else {
      // If no box is centered >= 0.7, pause and mute outgoing video
      if (currentlyPlayingBox) {
        unmountAndCleanupVideo(currentlyPlayingBox);
      }
    }
  };

  // Requirement 4: IntersectionObserver (threshold: 0.7)
  homeFeedObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      visibilityMap.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
      // Immediately mute and pause outgoing posts when dropping below 0.7
      if (!entry.isIntersecting || entry.intersectionRatio < 0.7) {
        const v = entry.target.querySelector("video");
        if (v) {
          v.pause();
          v.muted = true;
        }
        if (currentlyPlayingBox === entry.target || entry.target.dataset.postId === activePlayingId) {
          unmountAndCleanupVideo(entry.target);
        }
      }
    });
    if (!isScrollScheduled) {
      isScrollScheduled = true;
      requestAnimationFrame(evaluateCenterVideo);
    }
  }, {
    root: homeView,
    threshold: [0, 0.35, 0.7, 1.0]
  });

  videoBoxes.forEach(box => homeFeedObserver.observe(box));

  // Requirement 4: Scrolling up or down immediately mutes and pauses outgoing posts before starting audio for the next post
  const onHomeScroll = () => {
    if (currentlyPlayingBox) {
      const rect = currentlyPlayingBox.getBoundingClientRect();
      const homeRect = homeView.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(rect.bottom, homeRect.bottom) - Math.max(rect.top, homeRect.top));
      const ratio = rect.height > 0 ? (overlap / rect.height) : 0;
      if (ratio < 0.65) {
        const vid = currentlyPlayingBox.querySelector("video");
        if (vid) {
          vid.pause();
          vid.muted = true;
        }
      }
    }

    if (!isScrollScheduled) {
      isScrollScheduled = true;
      requestAnimationFrame(evaluateCenterVideo);
    }
  };

  homeView.addEventListener("scroll", onHomeScroll, { passive: true });
  scrollListenerCleanup = () => {
    homeView.removeEventListener("scroll", onHomeScroll);
  };

  // Initial evaluation after DOM paint
  setTimeout(evaluateCenterVideo, 100);
}

function pauseAllHomeVideos() {
  activePlayingId = null;
  if (currentlyPlayingBox) {
    unmountAndCleanupVideo(currentlyPlayingBox);
  }
  // Remove any orphan video tags and force muted=true & paused
  document.querySelectorAll(".home-video-player").forEach(v => {
    try {
      v.pause();
      v.muted = true;
      v.removeAttribute("src");
      v.load();
      v.remove();
    } catch (_) {}
  });
  currentlyPlayingHomeVideo = null;
  currentlyPlayingBox = null;
}

export { renderHomeFeed, setupHomeFeedObserver, pauseAllHomeVideos, prependPostToHomeFeed };


