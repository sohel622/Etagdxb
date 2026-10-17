// Home Feed 4:5 Video & Multi-Photo Carousel Post Card Component
import { getOptimizedVideoUrl } from "../../../services/cloudinaryService.js";
import { audio30sController } from "../../../utils/audioCatalog.js";

/**
 * Builds an Instagram-compliant 4:5 post card (supports single 4:5 video and up to 5 multi-photo carousel)
 */
export function buildPostCardElement(post, options = {}) {
  const isCarousel = Boolean(post.isCarousel && post.carouselItems && post.carouselItems.length > 1);
  const hasMusic = Boolean(post.music);

  const card = document.createElement("article");
  card.className = "post-card";
  card.dataset.postId = String(post.id);
  card.dataset.hasMusic = hasMusic ? "true" : "false";
  card.dataset.isCarousel = isCarousel ? "true" : "false";
  card._postData = post;

  let mediaHtml = "";

  if (isCarousel) {
    mediaHtml = `
      <div class="post-carousel-container relative" data-post-id="${post.id}">
        <div class="carousel-counter-badge">1/${post.carouselItems.length}</div>
        ${post.carouselItems.map((item, idx) => `
          <div class="post-carousel-item" data-index="${idx}">
            ${item.type === 'video'
              ? `<video src="${getOptimizedVideoUrl(item.url)}" poster="${item.thumbnail || ''}" class="w-full h-full object-cover" loop muted playsinline></video>`
              : `<img src="${item.url}" alt="Carousel item ${idx + 1}" class="w-full h-full object-cover" loading="lazy" />`}
          </div>
        `).join('')}
      </div>
      <div class="carousel-dots-container">
        ${post.carouselItems.map((_, idx) => `<span class="carousel-dot ${idx === 0 ? 'active' : ''}"></span>`).join('')}
      </div>
    `;
  } else {
    const mediaUrl = post.video_url || post.media_url || post.url || "";
    const optimizedMediaUrl = getOptimizedVideoUrl(mediaUrl);
    const poster = post.thumbnail_url || post.thumbnail || (mediaUrl ? mediaUrl.replace(/\.[^/.]+$/, ".jpg") : "");
    const isPhoto = post.media_type === "photo" || (!post.media_type && !mediaUrl.match(/\.(mp4|webm|mov|m4v)($|\?)/i) && mediaUrl.match(/\.(jpg|jpeg|png|webp|gif)($|\?)/i));

    if (isPhoto) {
      mediaHtml = `
        <div class="home-post-video-container home-video-container post-video-container relative" data-post-id="${post.id}" style="cursor: pointer;">
          <img class="home-post-video-player w-full h-full object-cover" src="${optimizedMediaUrl || poster}" alt="${post.user || 'post'} photo" loading="lazy" />
        </div>
      `;
    } else {
      mediaHtml = `
        <div class="home-post-video-container home-video-container post-video-container relative" data-post-id="${post.id}" data-video-url="${post.video_url || post.media_url || optimizedMediaUrl}" data-poster-url="${poster}" style="cursor: pointer;" title="Watch Reel">
          <div class="home-video-skeleton"></div>
          <video
            class="home-post-video-player w-full h-full object-cover"
            src="${post.video_url || post.media_url || optimizedMediaUrl}"
            poster="${poster}"
            playsinline
            muted
            loop
            preload="metadata"
          ></video>
          <div class="home-play-badge"><i class="fa-solid fa-play ml-0.5"></i></div>
          <div class="sound-status-badge"><i class="fa-solid fa-volume-high"></i></div>
        </div>
      `;
    }
  }

  const musicHtml = hasMusic ? `
    <div class="post-music-badge cursor-pointer" data-post-id="${post.id}" title="Tap to listen • 30-Second Audio">
      <i class="fa-solid fa-music music-status-icon text-pink-500"></i>
      <span class="truncate max-w-[200px]">${post.music.title} • ${post.music.artist}</span>
      <div class="music-wave-bars"><span></span><span></span><span></span></div>
    </div>
  ` : '';

  card.innerHTML = `
    <div class="post-header">
      <div class="post-user">
        <div class="post-avatar">
          <img src="${post.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" alt="${post.user || 'User'}" />
        </div>
        <div class="post-user-meta">
          <div class="flex items-center gap-1">
            <span class="post-username font-semibold text-[13.5px]">${post.user || 'User'}</span>
          </div>
          <span class="post-location">${post.location || 'Original Audio'}</span>
          ${musicHtml}
        </div>
      </div>
      <i class="fa-solid fa-ellipsis post-more-btn cursor-pointer"></i>
    </div>
    ${mediaHtml}
    <div class="post-actions">
      <div class="post-actions-left">
        <i class="fa-regular fa-heart action-btn like-btn"></i>
        <i class="fa-regular fa-comment action-btn"></i>
        <i class="fa-regular fa-paper-plane action-btn"></i>
      </div>
      <i class="fa-regular fa-bookmark action-btn bookmark-btn"></i>
    </div>
    <div class="post-details">
      <div class="post-likes"><span class="likes-count">${(post.likesCount || 1248).toLocaleString()}</span> likes</div>
      <div class="post-caption">
        <span class="caption-user font-semibold mr-1">${post.user || 'User'}</span>
        <span>${post.caption || ''}</span>
      </div>
      <div class="post-time">${post.time || 'JUST NOW'}</div>
    </div>
  `;

  const videoBox = card.querySelector(".home-post-video-container");
  if (videoBox) {
    const vid = videoBox.querySelector("video");
    const img = videoBox.querySelector("img");
    const adaptLayout = (el) => {
      const w = el.videoWidth || el.naturalWidth || el.width;
      const h = el.videoHeight || el.naturalHeight || el.height;
      if (!w || !h) return;
      const rawRatio = w / h;
      const clampedRatio = Math.max(0.8, Math.min(1.91, rawRatio));
      videoBox.style.aspectRatio = `${clampedRatio}`;
      videoBox.style.height = "auto";
      videoBox.classList.remove("is-landscape", "is-square", "is-portrait");
      if (rawRatio > 1.15) videoBox.classList.add("is-landscape");
      else if (rawRatio >= 0.88 && rawRatio <= 1.15) videoBox.classList.add("is-square");
      else videoBox.classList.add("is-portrait");
    };

    if (vid) {
      if (vid.readyState >= 1) adaptLayout(vid);
      else vid.addEventListener("loadedmetadata", () => adaptLayout(vid), { once: true });
    } else if (img) {
      if (img.complete && img.naturalWidth) adaptLayout(img);
      else img.addEventListener("load", () => adaptLayout(img), { once: true });
    }
  }

  return card;
}
