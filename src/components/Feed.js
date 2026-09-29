// Feed Component (Home Post Feed & Observer)
import { db } from "../services/database.js";
import { UserProfileStore, showInstagramToast } from "../utils/storage.js";
import { SAMPLE_VIDEOS, SHABNAM_AI_PROFILE } from "../utils/mockData.js";
import { isGlobalAudioMuted, toggleGlobalAudio } from "./Navbar.js";
import { spawnFloatingHeart, openMyProfileTab } from "./ReelsViewer.js";
import { openProfile } from "./Profile.js";
import { renderSuggestedReels } from "./SuggestedReels.js";

    /* =======================================================
       ৯. হোম ফিড
    ======================================================= */
    function renderHomeFeed() {
      const feedContainer = document.getElementById("feedContainer");
      if (!feedContainer) return;

      const renderPosts = (userPosts = []) => {
        const formattedUserPosts = (userPosts || []).map(p => ({
          id: 'local_' + p.id,
          url: p.blob ? URL.createObjectURL(p.blob) : (p.url || ''),
          user: UserProfileStore.state.username,
          avatar: UserProfileStore.state.avatar,
          isCurrentUser: true,
          location: 'Original Audio',
          caption: 'Uploaded Video Post! ✨ #lifestyle',
          likesCount: 1248,
          commentsCount: 24,
          time: 'JUST NOW'
        })).reverse();

        const allPosts = formattedUserPosts.length > 0 ? [...formattedUserPosts, ...SAMPLE_VIDEOS] : SAMPLE_VIDEOS;
        feedContainer.innerHTML = "";

        allPosts.forEach((post, index) => {
          const isCurrentUser = post.isCurrentUser || post.user === 'my_profile' || post.user === 'sohel_077' || post.user === 'arya.gmr_' || post.user === UserProfileStore.state.username || post.id === 'sample_1' || (post.id && String(post.id).startsWith('local_'));
          const isShabnam = post.user === 'shabnam_ai' || post.id === 'shabnam_reel_1';
          const displayUser = isCurrentUser ? UserProfileStore.state.username : (isShabnam ? "shabnam_ai" : post.user);
          const displayAvatar = isCurrentUser ? UserProfileStore.state.avatar : (isShabnam ? SHABNAM_AI_PROFILE.avatar : post.avatar);
          const avatarClass = isCurrentUser ? "current-user-avatar current-user-post-avatar" : "";
          const usernameClass = isCurrentUser ? "current-user-username current-user-post-username" : "";

          let userClickAttr = "";
          if (isCurrentUser) {
            userClickAttr = 'onclick="openMyProfileTab()" style="cursor: pointer;" title="View Profile"';
          } else if (isShabnam) {
            userClickAttr = 'onclick="openProfile(\'shabnam_ai\')" style="cursor: pointer;" title="View Shabnam AI Profile"';
          }

          const card = document.createElement("div");
          card.className = "post-card";
          if (isCurrentUser) card.dataset.currentUserPost = "true";

          card.innerHTML = `
            <div class="post-header">
              <div class="post-user" ${userClickAttr}>
                <div class="post-avatar">
                  ${displayAvatar ? `<img src="${displayAvatar}" class="${avatarClass}" alt="${displayUser}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : ''}
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
              <i class="fa-solid fa-ellipsis post-more-btn" onclick="alert('Post options')"></i>
            </div>
            <div class="home-video-container">
              <video class="home-video-player" src="${post.url}" loop playsinline preload="metadata" ${isGlobalAudioMuted ? 'muted' : ''}></video>
              <div class="sound-status-badge"><i class="fa-solid fa-volume-xmark"></i></div>
            </div>
            <div class="post-actions">
              <div class="post-actions-left">
                <i class="fa-regular fa-heart action-btn like-btn"></i>
                <i class="fa-regular fa-comment action-btn" onclick="alert('Comments')"></i>
                <i class="fa-regular fa-paper-plane action-btn" onclick="alert('Shared via Direct')"></i>
              </div>
              <i class="fa-regular fa-bookmark action-btn bookmark-btn"></i>
            </div>
            <div class="post-details">
              <div class="post-likes"><span class="likes-count">${(post.likesCount || 1248).toLocaleString()}</span> likes</div>
              <div class="post-caption">
                <span class="caption-user ${usernameClass}" ${userClickAttr}>${displayUser}</span>
                <span>${post.caption}</span>
              </div>
              <div class="post-comments-link" onclick="alert('View all comments')">View all ${post.commentsCount || 18} comments</div>
              <div class="post-time">${post.time || '2 HOURS AGO'}</div>
            </div>
          `;

          const videoBox = card.querySelector(".home-video-container");
          const vid = card.querySelector("video");
          const likeBtn = card.querySelector(".like-btn");
          const bookmarkBtn = card.querySelector(".bookmark-btn");
          const likesSpan = card.querySelector(".likes-count");
          let currentLikes = post.likesCount || 1248;
          let isLiked = false;

          // Automatically adapt aspect ratio to standard Instagram ratios (1:1 square or 4:5 portrait)
          vid.addEventListener('loadedmetadata', () => {
            const w = vid.videoWidth;
            const h = vid.videoHeight;
            if (w && h) {
              const ratio = w / h;
              if (ratio >= 0.88 && ratio <= 1.12) {
                videoBox.style.aspectRatio = "1 / 1";
              } else if (ratio < 0.88) {
                videoBox.style.aspectRatio = "4 / 5";
              } else {
                const clamped = Math.min(1.91, Math.max(1.0, ratio));
                videoBox.style.aspectRatio = clamped.toFixed(3);
              }
            }
          });

          // Tap gesture: double-tap to like with heart animation, single tap to toggle audio
          let lastHomeTap = 0;
          videoBox.addEventListener("click", (e) => {
            const currentTime = Date.now();
            if (currentTime - lastHomeTap < 300) {
              spawnFloatingHeart(e, videoBox);
              if (!isLiked) {
                isLiked = true;
                likeBtn.classList.add("liked", "fa-solid");
                likeBtn.classList.remove("fa-regular");
                currentLikes += 1;
                likesSpan.textContent = currentLikes.toLocaleString();
              }
            } else {
              toggleGlobalAudio();
            }
            lastHomeTap = currentTime;
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

          feedContainer.appendChild(card);
          if (index === 1) {
            renderSuggestedReels(feedContainer);
          }
        });

        setupHomeFeedObserver();
      };

      try {
        const activeDb = db || (typeof window !== "undefined" && window.db);
        if (!activeDb || typeof activeDb.transaction !== "function") {
          renderPosts([]);
          return;
        }
        const tx = activeDb.transaction("videos", "readonly");
        const req = tx.objectStore("videos").getAll();
        req.onsuccess = () => renderPosts(req.result || []);
        req.onerror = () => renderPosts([]);
      } catch (err) {
        console.warn("renderHomeFeed db transaction error:", err);
        renderPosts([]);
      }
    }

    function setupHomeFeedObserver() {
      const homeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const video = entry.target.querySelector("video");
          if (video && entry.isIntersecting) {
            video.muted = isGlobalAudioMuted;
            video.play().catch(() => {});
          } else if (video) {
            video.pause();
          }
        });
      }, { threshold: 0.6 });

      document.querySelectorAll(".home-video-container").forEach(box => homeObserver.observe(box));
    }

    function pauseAllHomeVideos() {
      document.querySelectorAll(".home-video-player").forEach(v => v.pause());
    }



export { renderHomeFeed, setupHomeFeedObserver, pauseAllHomeVideos };
