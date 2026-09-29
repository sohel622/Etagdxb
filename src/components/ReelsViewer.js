// ReelsViewer Component (Fullscreen Reels Player, Observer & Progress Bar)
import { db } from "../services/database.js";
import { UserProfileStore, showInstagramToast, isFollowingShabnam, toggleFollowShabnam } from "../utils/storage.js";

    /* =======================================================
       ৮. রিলস ভিডিও লোডিং
    ======================================================= */
    const reelsFeedWrapper = document.getElementById("reelsFeedWrapper");

    function openMyProfileTab() {
      switchTab('profile');
    }
    window.openMyProfileTab = openMyProfileTab;

    function toggleReelFollowBtn(btn) {
      if (!btn) return;
      btn.innerText = btn.innerText === 'Follow' ? 'Following' : 'Follow';
    }
    window.toggleReelFollowBtn = toggleReelFollowBtn;

    function playShabnamReelVideo() {
      const reelsBtn = document.querySelector('.nav-btn[data-id="reels"]');
      switchTab("reels", reelsBtn);

      const focusShabnam = () => {
        const items = Array.from(document.querySelectorAll("#reelsFeedWrapper .reel-item"));
        const target = items.find(item => {
          const v = item.querySelector("video");
          const u = item.querySelector(".reels-username");
          return (v && v.src && v.src.includes("0chichan077")) || (u && u.textContent.includes("shabnam_ai"));
        });

        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          const targetVid = target.querySelector("video");
          if (targetVid) {
            pauseAllReels(targetVid);
            targetVid.muted = isGlobalAudioMuted;
            targetVid.currentTime = 0;
            targetVid.play().catch(() => {});
            attachVideoProgressTracker(targetVid);
          }
        }
      };

      setTimeout(focusShabnam, 80);
      setTimeout(focusShabnam, 280);
    }
    window.playShabnamReelVideo = playShabnamReelVideo;

    async function loadReels() {
      reelsFeedWrapper.innerHTML = "";
      const localVideos = await getSavedVideos();

      if (localVideos.length === 0) {
        reelsFeedWrapper.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#888;">
            <i class="fa-solid fa-film" style="font-size:48px; margin-bottom:12px; color:#555;"></i>
            <p style="font-size:15px; font-weight:600; color:#eee;">কোনো রিলস ভিডিও নেই</p>
            <p style="font-size:12px; margin-top:4px; color:#888;">উপরের ক্যামেরা বা হোম + বাটনে চাপ দিয়ে ভিডিও আপলোড করুন।</p>
          </div>
        `;
        return;
      }

      localVideos.forEach((reel, index) => {
        const isCurrentUserReel = reel.isCurrentUser || reel.user === 'my_profile' || reel.user === 'arya.gmr_' || reel.user === UserProfileStore.state.username || (reel.id && String(reel.id).startsWith('local_'));
        const isShabnamReel = reel.user === 'shabnam_ai' || (reel.id && reel.id === 'shabnam_reel_1');
        const displayUser = isCurrentUserReel ? UserProfileStore.state.username : reel.user;
        const displayAvatar = isCurrentUserReel ? UserProfileStore.state.avatar : reel.avatar;
        const avatarClass = isCurrentUserReel ? "reels-user-avatar current-user-avatar current-user-reel-avatar" : "reels-user-avatar";
        const usernameClass = isCurrentUserReel ? "reels-username current-user-username current-user-reel-username" : "reels-username";

        const item = document.createElement("div");
        item.className = "reel-item";
        item.dataset.index = index;

        let userClickAttr = "";
        if (isCurrentUserReel) {
          userClickAttr = 'onclick="openMyProfileTab()" style="cursor:pointer;" title="View Profile"';
        } else if (isShabnamReel) {
          userClickAttr = 'onclick="openProfile(\'shabnam_ai\')" style="cursor:pointer;" title="View Shabnam AI Profile"';
        }

        let followBtnHtml = "";
        if (!isCurrentUserReel) {
          if (isShabnamReel) {
            const isFoll = isFollowingShabnam();
            followBtnHtml = `<button type="button" class="follow-btn ${isFoll ? 'following' : ''}" onclick="toggleFollowShabnam(); this.innerText = isFollowingShabnam() ? 'Following' : 'Follow';">${isFoll ? 'Following' : 'Follow'}</button>`;
          } else {
            followBtnHtml = '<button type="button" class="follow-btn" onclick="toggleReelFollowBtn(this)">Follow</button>';
          }
        }

        item.innerHTML = `
          <div class="reel-video-wrapper">
            <video class="reel-video" src="${reel.url}" loop playsinline preload="metadata" ${isGlobalAudioMuted ? 'muted' : ''}></video>
            
            <div class="sound-status-badge"><i class="fa-solid fa-volume-xmark"></i></div>

            <div class="reels-bottom-info">
              <div class="reels-user-row">
                <img src="${displayAvatar}" class="${avatarClass}" ${userClickAttr} />
                <span class="${usernameClass}" ${userClickAttr}>${displayUser}</span>
                ${isShabnamReel ? '<span class="text-sky-400 text-[12px] ml-1" title="Verified"><i class="fa-solid fa-circle-check"></i></span>' : ''}
                ${followBtnHtml}
              </div>
              <div class="reels-caption">${reel.caption}</div>
            </div>

            <div class="reels-sidebar">
              <div class="reel-action-btn like-btn">
                <i class="fa-solid fa-heart"></i>
                <span>${reel.likes}</span>
              </div>
              <div class="reel-action-btn" onclick="alert('Comments')">
                <i class="fa-solid fa-comment-dots"></i>
                <span>${reel.comments}</span>
              </div>
              <div class="reel-action-btn" onclick="alert('Reels Shared!')">
                <i class="fa-regular fa-paper-plane"></i>
                <span>${reel.shares}</span>
              </div>
              <div class="reel-action-btn">
                <i class="fa-solid fa-ellipsis"></i>
              </div>
            </div>
          </div>
        `;

        const wrapper = item.querySelector(".reel-video-wrapper");
        const video = item.querySelector(".reel-video");
        const likeIcon = item.querySelector(".like-btn i");

        let lastTap = 0;
        wrapper.addEventListener("click", (e) => {
          const currentTime = new Date().getTime();
          const tapLength = currentTime - lastTap;
          
          if (tapLength < 300 && tapLength > 0) {
            spawnFloatingHeart(e, wrapper);
            likeIcon.classList.add("liked");
            e.preventDefault();
          } else {
            setTimeout(() => {
              if (new Date().getTime() - lastTap >= 300) {
                toggleGlobalAudio();
              }
            }, 300);
          }
          lastTap = currentTime;
        });

        likeIcon.onclick = (e) => {
          e.stopPropagation();
          likeIcon.classList.toggle("liked");
        };

        reelsFeedWrapper.appendChild(item);
      });

      setupReelObserver();
    }

    function spawnFloatingHeart(e, container) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX ? (e.clientX - rect.left) : (rect.width / 2);
      const y = e.clientY ? (e.clientY - rect.top) : (rect.height / 2);

      const heart = document.createElement("div");
      heart.className = "floating-heart";
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;

      heart.innerHTML = `
        <svg viewBox="0 0 32 29.6">
          <path fill="url(#instaHeartGrad)" d="M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4c0,9.4,16,21.2,16,21.2s16-11.8,16-21.2C32,3.8,28.2,0,23.6,0z"/>
        </svg>
      `;

      container.appendChild(heart);
      setTimeout(() => heart.remove(), 800);
    }

    /* =======================================================
       ৮.১ রিলস ভিডিও প্রোগ্রেস বার ট্র্যাকার
    ======================================================= */
    const reelsProgressBarContainer = document.getElementById("reelsProgressBarContainer");
    const reelsProgressBarFill = document.getElementById("reelsProgressBarFill");
    let videoProgressRAF = null;
    let boundVideoProgressHandler = null;
    let boundVideoSeekingHandler = null;
    let boundVideoEndedHandler = null;
    let boundVideoPlayHandler = null;
    let boundVideoPauseHandler = null;
    let currentActiveReelVideo = null;
    let reelObserverInstance = null;

    function resetVideoProgressBar() {
      if (videoProgressRAF) {
        cancelAnimationFrame(videoProgressRAF);
        videoProgressRAF = null;
      }
      if (reelsProgressBarFill) {
        reelsProgressBarFill.style.width = "0%";
      }
    }

    function detachVideoProgressTracker(video) {
      if (!video) return;
      if (boundVideoProgressHandler) {
        video.removeEventListener("timeupdate", boundVideoProgressHandler);
      }
      if (boundVideoSeekingHandler) {
        video.removeEventListener("seeking", boundVideoSeekingHandler);
        video.removeEventListener("seeked", boundVideoSeekingHandler);
      }
      if (boundVideoEndedHandler) {
        video.removeEventListener("ended", boundVideoEndedHandler);
      }
      if (boundVideoPlayHandler) {
        video.removeEventListener("play", boundVideoPlayHandler);
      }
      if (boundVideoPauseHandler) {
        video.removeEventListener("pause", boundVideoPauseHandler);
      }
    }

    function attachVideoProgressTracker(video) {
      if (!video || !reelsProgressBarFill) return;

      // 1. Cleanly detach prior video if switching
      if (currentActiveReelVideo && currentActiveReelVideo !== video) {
        detachVideoProgressTracker(currentActiveReelVideo);
      }

      currentActiveReelVideo = video;
      resetVideoProgressBar();

      const updateProgress = () => {
        if (!video || !reelsProgressBarFill) return;
        if (video.duration && !isNaN(video.duration) && video.duration > 0) {
          const progressPercent = Math.min(100, Math.max(0, (video.currentTime / video.duration) * 100));
          reelsProgressBarFill.style.width = `${progressPercent}%`;
        }
      };

      const startProgressLoop = () => {
        if (videoProgressRAF) cancelAnimationFrame(videoProgressRAF);
        const loop = () => {
          if (!video || video !== currentActiveReelVideo) return;
          updateProgress();
          if (!video.paused && !video.ended) {
            videoProgressRAF = requestAnimationFrame(loop);
          }
        };
        videoProgressRAF = requestAnimationFrame(loop);
      };

      const stopProgressLoop = () => {
        if (videoProgressRAF) {
          cancelAnimationFrame(videoProgressRAF);
          videoProgressRAF = null;
        }
        updateProgress();
      };

      boundVideoProgressHandler = updateProgress;
      boundVideoSeekingHandler = updateProgress;
      boundVideoEndedHandler = () => {
        if (reelsProgressBarFill) {
          reelsProgressBarFill.style.width = "100%";
        }
        // When looped, seamlessly reset and track next cycle
        setTimeout(() => {
          if (video && !video.paused) {
            updateProgress();
          }
        }, 80);
      };
      boundVideoPlayHandler = startProgressLoop;
      boundVideoPauseHandler = stopProgressLoop;

      video.addEventListener("timeupdate", boundVideoProgressHandler);
      video.addEventListener("seeking", boundVideoSeekingHandler);
      video.addEventListener("seeked", boundVideoSeekingHandler);
      video.addEventListener("ended", boundVideoEndedHandler);
      video.addEventListener("play", boundVideoPlayHandler);
      video.addEventListener("pause", boundVideoPauseHandler);

      // Immediately sync initial progress
      if (!video.paused) {
        startProgressLoop();
      } else {
        updateProgress();
      }
    }

    // Interactive seeking & drag-scrubbing on the progress bar
    let isProgressBarScrubbing = false;

    function handleProgressBarSeek(clientX) {
      if (!currentActiveReelVideo || !currentActiveReelVideo.duration) return;
      const rect = reelsProgressBarContainer.getBoundingClientRect();
      if (rect.width <= 0) return;
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const targetPercent = clickX / rect.width;
      currentActiveReelVideo.currentTime = targetPercent * currentActiveReelVideo.duration;
      if (reelsProgressBarFill) {
        reelsProgressBarFill.style.width = `${targetPercent * 100}%`;
      }
    }

    if (reelsProgressBarContainer) {
      reelsProgressBarContainer.addEventListener("mousedown", (e) => {
        isProgressBarScrubbing = true;
        reelsProgressBarContainer.classList.add("seeking");
        handleProgressBarSeek(e.clientX);
      });

      window.addEventListener("mousemove", (e) => {
        if (isProgressBarScrubbing) {
          handleProgressBarSeek(e.clientX);
        }
      });

      window.addEventListener("mouseup", () => {
        if (isProgressBarScrubbing) {
          isProgressBarScrubbing = false;
          reelsProgressBarContainer.classList.remove("seeking");
        }
      });

      reelsProgressBarContainer.addEventListener("touchstart", (e) => {
        if (e.touches && e.touches[0]) {
          isProgressBarScrubbing = true;
          reelsProgressBarContainer.classList.add("seeking");
          handleProgressBarSeek(e.touches[0].clientX);
        }
      }, { passive: true });

      window.addEventListener("touchmove", (e) => {
        if (isProgressBarScrubbing && e.touches && e.touches[0]) {
          handleProgressBarSeek(e.touches[0].clientX);
        }
      }, { passive: true });

      window.addEventListener("touchend", () => {
        if (isProgressBarScrubbing) {
          isProgressBarScrubbing = false;
          reelsProgressBarContainer.classList.remove("seeking");
        }
      });
    }

    // Global Dynamic Sync across All Reels
    function setupReelObserver() {
      if (reelObserverInstance) {
        reelObserverInstance.disconnect();
      }

      const reelsContainer = document.getElementById("reelsView");

      reelObserverInstance = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const video = entry.target.querySelector("video");
          if (!video) return;

          if (entry.isIntersecting) {
            pauseAllReels(video);
            video.currentTime = 0;
            video.muted = isGlobalAudioMuted;
            video.play().catch(() => {});
            attachVideoProgressTracker(video);
          } else {
            video.pause();
          }
        });
      }, {
        root: reelsContainer,
        threshold: 0.55
      });

      document.querySelectorAll(".reel-item").forEach(item => reelObserverInstance.observe(item));

      // Auto-sync active reel if reels view is currently showing
      if (reelsView && reelsView.classList.contains("active")) {
        syncActiveReel();
      }
    }

    // Scroll sync detection for snap scrolling between reels
    let reelScrollDebounce = null;
    reelsView.addEventListener("scroll", () => {
      if (!reelsView.classList.contains("active")) return;
      clearTimeout(reelScrollDebounce);
      reelScrollDebounce = setTimeout(syncActiveReel, 60);
    }, { passive: true });

    function syncActiveReel() {
      const items = Array.from(document.querySelectorAll("#reelsFeedWrapper .reel-item"));
      if (items.length === 0) return;

      const containerRect = reelsView.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      let closestItem = null;
      let minDiff = Infinity;

      items.forEach(item => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.top + rect.height / 2;
        const diff = Math.abs(centerY - itemCenter);
        if (diff < minDiff) {
          minDiff = diff;
          closestItem = item;
        }
      });

      if (closestItem) {
        const video = closestItem.querySelector("video");
        if (video) {
          if (video !== currentActiveReelVideo || video.paused) {
            pauseAllReels(video);
            video.muted = isGlobalAudioMuted;
            video.play().catch(() => {});
            attachVideoProgressTracker(video);
          }
        }
      }
    }

    // Capture any play event inside reelsView to guarantee progress bar sync
    reelsView.addEventListener("play", (e) => {
      if (e.target && e.target.classList.contains("reel-video")) {
        if (currentActiveReelVideo !== e.target) {
          attachVideoProgressTracker(e.target);
        }
      }
    }, true);

    function playCurrentReel() {
      if (currentActiveReelVideo && !currentActiveReelVideo.paused) {
        attachVideoProgressTracker(currentActiveReelVideo);
      } else {
        syncActiveReel();
      }
    }

    function pauseAllReels(excludeVideo = null) {
      document.querySelectorAll(".reel-video").forEach(v => {
        if (v !== excludeVideo) {
          v.pause();
        }
      });
    }



export { loadReels, setupReelObserver, syncActiveReel, playCurrentReel, pauseAllReels, attachVideoProgressTracker, handleProgressBarSeek, resetVideoProgressBar, detachVideoProgressTracker, spawnFloatingHeart, openMyProfileTab, toggleReelFollowBtn, playShabnamReelVideo };
