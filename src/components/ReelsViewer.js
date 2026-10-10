// ReelsViewer Component (Fullscreen Reels Player, Observer & Progress Bar)
import { db } from "../services/database.js";
import { UserProfileStore, showInstagramToast, isFollowingShabnam, toggleFollowShabnam } from "../utils/storage.js";
import { openReelsShareSheet, openReelsCommentsSheet, disableReelsClearMode, setActiveClearModeReelId, openPostOptionsSheet } from "./reels/index.js";
import { fetchSupabasePosts, deriveCloudinaryThumbnailUrl, getOptimizedVideoUrl } from "../services/cloudinaryService.js";
import { openProfile } from "./Profile.js";
import { isFollowingUser, toggleFollowUser } from "../services/followService.js";
import { getCurrentUserId } from "../services/avatarService.js";
import { supabase } from "../supabaseClient.js";
import { setActiveReelVideo, initReelsPipHandler, triggerReelPiP } from "../services/pipService.js";
import { initReelsVolumeHUD } from "./reels/ReelsVolumeHUD.js";

    /* =======================================================
       Web Video Picture-in-Picture (PiP) Helper
    ======================================================= */
    const enableVideoPiP = async (videoElement) => {
      if (document.pictureInPictureEnabled && videoElement) {
        try {
          if (document.pictureInPictureElement !== videoElement) {
            await videoElement.requestPictureInPicture();
          }
        } catch (err) {
          console.log('PiP not triggered:', err);
        }
      }
    };
    if (typeof window !== "undefined") {
      window.enableVideoPiP = enableVideoPiP;
    }

    /* =======================================================
       HTML5 Video Fullscreen & Orientation Lock Helper
    ======================================================= */
    const toggleFullScreen = async (elem) => {
      const target = elem || document.documentElement;
      try {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          if (target.requestFullscreen) {
            await target.requestFullscreen();
          } else if (target.webkitRequestFullscreen) {
            await target.webkitRequestFullscreen();
          }
          // When entering full screen on horizontal/landscape video reels, auto-rotate orientation smoothly
          const video = target.querySelector ? target.querySelector("video") : (target.tagName === 'VIDEO' ? target : null);
          if (video) {
            const isLandscape = (video.videoWidth && video.videoHeight && video.videoWidth > video.videoHeight);
            if (isLandscape && window.screen && window.screen.orientation && window.screen.orientation.lock) {
              try {
                await window.screen.orientation.lock("landscape");
              } catch (_) {}
            }
          }
        } else {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            await document.webkitExitFullscreen();
          }
          if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
            try {
              window.screen.orientation.unlock();
            } catch (_) {}
          }
        }
      } catch (err) {
        console.log("Fullscreen toggle error:", err);
      }
    };
    if (typeof window !== "undefined") {
      window.toggleFullScreen = toggleFullScreen;
    }

    /* =======================================================
       ৮. রিলস ভিডিও লোডিং
    ======================================================= */
    const reelsFeedWrapper = document.getElementById("reelsFeedWrapper");

    function openMyProfileTab() {
      if (typeof window.closeUserProfile === "function") {
        window.closeUserProfile();
      } else {
        window.viewingProfileUserId = null;
      }
      switchTab('profile');
      if (typeof window.syncCurrentLoggedInUserProfile === "function") {
        window.syncCurrentLoggedInUserProfile();
      }
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

    async function navigateToReel(videoId, videoUrl) {
      setActiveClearModeReelId(null);
      if (typeof pauseAllHomeVideos === "function") {
        pauseAllHomeVideos();
      }

      const reelsBtn = document.querySelector('.nav-btn[data-id="reels"]');
      if (typeof switchTab === "function") {
        switchTab("reels", reelsBtn);
      } else if (typeof window !== "undefined" && typeof window.switchTab === "function") {
        window.switchTab("reels", reelsBtn);
      }

      if (videoId) {
        try {
          window.history.pushState({ reelId: videoId }, "", "/reels/" + encodeURIComponent(videoId));
        } catch (_) {}
      }

      const container = document.getElementById("reelsFeedWrapper");
      let items = Array.from(container ? container.querySelectorAll(".reel-item") : []);
      if (items.length === 0) {
        await loadReels();
        items = Array.from(container ? container.querySelectorAll(".reel-item") : []);
      }

      const focusTargetReel = () => {
        const currentItems = Array.from(document.querySelectorAll("#reelsFeedWrapper .reel-item"));
        if (currentItems.length === 0) return;

        let target = null;
        if (videoId) {
          target = currentItems.find(it => it.dataset.id === String(videoId));
        }
        if (!target && videoUrl) {
          target = currentItems.find(it => {
            const v = it.querySelector("video");
            return (it.dataset.url && it.dataset.url === videoUrl) ||
                   (v && v.src && (v.src === videoUrl || v.src.endsWith(videoUrl) || videoUrl.endsWith(v.src)));
          });
        }
        if (!target) {
          target = currentItems[0];
        }

        if (target) {
          target.scrollIntoView({ behavior: "instant", block: "start" });
          const targetVid = target.querySelector("video");
          if (targetVid) {
            pauseAllReels(targetVid);
            targetVid.currentTime = 0;
            targetVid.muted = false;
            targetVid.play().catch(() => {
              targetVid.muted = true;
              targetVid.play().catch(() => {});
            });
            attachVideoProgressTracker(targetVid);
          }
        }
      };

      requestAnimationFrame(focusTargetReel);
      setTimeout(focusTargetReel, 60);
      setTimeout(focusTargetReel, 250);
    }
    window.navigateToReel = navigateToReel;

    async function loadReels() {
      reelsFeedWrapper.innerHTML = "";
      let livePosts = null;

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('posts')
            .select('*, profiles(id, username, avatar_url)')
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data) && data.length > 0) {
            livePosts = data;
          }
        } catch (_) {}
      }

      if (!livePosts || livePosts.length === 0) {
        livePosts = await fetchSupabasePosts();
      }

      if (!livePosts || livePosts.length === 0) {
        reelsFeedWrapper.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#888; padding: 24px; text-align: center;">
            <i class="fa-solid fa-film" style="font-size:48px; margin-bottom:12px; color:#555;"></i>
            <p style="font-size:16px; font-weight:600; color:#eee;">No Reels Posted Yet</p>
            <p style="font-size:13px; margin-top:6px; color:#888; max-width: 260px;">Upload a video to Cloudinary & Supabase to watch it in fullscreen Reels!</p>
            <button type="button" onclick="openMediaCreationPrompt()" style="margin-top: 16px; background: #0095f6; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">Upload a Video</button>
          </div>
        `;
        return;
      }

      const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";

      livePosts.forEach((reel, index) => {
        const rawVidUrl = reel.video_url || reel.url || '';
        const vidUrl = getOptimizedVideoUrl(rawVidUrl);
        const thumbUrl = reel.thumbnail_url || (rawVidUrl ? deriveCloudinaryThumbnailUrl(rawVidUrl) : '');
        const profile = (Array.isArray(reel.profiles) ? reel.profiles[0] : reel.profiles) || {};
        const currentUserId = typeof getCurrentUserId === "function" ? getCurrentUserId() : null;
        const isShabnamReel = reel.user === 'shabnam_ai' || (reel.id && reel.id === 'shabnam_reel_1') || (profile.username === 'shabnam_ai');
        const authorUsername = isShabnamReel
          ? "shabnam_ai"
          : (reel.profiles?.username || profile.username || reel.author_name || "user");
        const authorAvatar = isShabnamReel
          ? "https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/IMG_20260921_164350.png"
          : (reel.profiles?.avatar_url || profile.avatar_url || reel.avatar_url || reel.avatar || defaultAvatar);
        const isCurrentUserReel = !isShabnamReel && Boolean(
          reel.user_id && currentUserId && String(reel.user_id) === String(currentUserId)
        );

        const displayUser = authorUsername;
        const displayAvatar = authorAvatar;
        const avatarClass = "reels-user-avatar";
        const usernameClass = "reels-username";

        const item = document.createElement("div");
        item.className = "reel-item";
        item.dataset.index = index;
        item.dataset.id = String(reel.id || index);
        item.dataset.userId = reel.user_id || '';
        item.dataset.url = vidUrl;
        if (isCurrentUserReel) item.dataset.isCurrentUser = "true";

        const targetUserId = reel.user_id || profile.id;
        let userClickAttr = "";
        if (isCurrentUserReel) {
          userClickAttr = 'onclick="if (typeof openMyProfileTab===\'function\') openMyProfileTab(); else if (window.openMyProfileTab) window.openMyProfileTab();" style="cursor:pointer;" title="View Profile"';
        } else if (isShabnamReel) {
          userClickAttr = 'onclick="if (typeof openProfile===\'function\') openProfile(\'shabnam_ai\'); else if (window.openProfile) window.openProfile(\'shabnam_ai\');" style="cursor:pointer;" title="View Shabnam AI Profile"';
        } else if (targetUserId) {
          userClickAttr = `onclick="if (typeof openProfile===\'function\') openProfile('${targetUserId}', '${displayUser}', '${displayAvatar}'); else if (window.openProfile) window.openProfile('${targetUserId}', '${displayUser}', '${displayAvatar}');" style="cursor:pointer;" title="View ${displayUser}'s Profile"`;
        } else {
          userClickAttr = 'style="cursor:pointer;"';
        }

        let followBtnHtml = "";
        if (!isCurrentUserReel) {
          if (isShabnamReel) {
            const isFoll = isFollowingShabnam();
            followBtnHtml = `<button type="button" class="follow-btn ${isFoll ? 'following' : ''}" onclick="toggleFollowShabnam(); this.innerText = isFollowingShabnam() ? 'Following' : 'Follow';">${isFoll ? 'Following' : 'Follow'}</button>`;
          } else if (targetUserId) {
            const isFoll = isFollowingUser(targetUserId);
            followBtnHtml = `<button type="button" data-follow-user-id="${targetUserId}" data-is-following="${isFoll}" class="follow-btn ${isFoll ? 'following' : ''}" onclick="toggleFollowUser('${targetUserId}', '${displayUser}'); this.innerText = isFollowingUser('${targetUserId}') ? 'Following' : 'Follow';">${isFoll ? 'Following' : 'Follow'}</button>`;
          }
        }

        const likesDisplay = reel.likes || (reel.likes_count ? String(reel.likes_count) : '1.2K');
        const commentsDisplay = reel.comments || (reel.comments_count ? String(reel.comments_count) : '24');
        const sharesDisplay = reel.shares || '18';

        item.innerHTML = `
          <div class="reel-video-wrapper">
            <video class="reel-video" src="${vidUrl}" poster="${thumbUrl}" playsinline webkit-playsinline preload="metadata"></video>
            
            <div class="sound-status-badge"><i class="fa-solid fa-volume-high"></i></div>

            <div class="reels-bottom-info">
              <div class="reels-user-row">
                <img src="${displayAvatar}" class="${avatarClass}" ${userClickAttr} alt="${displayUser}" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';" />
                <span class="${usernameClass}" ${userClickAttr}>${displayUser}</span>
                ${isShabnamReel ? '<span class="text-sky-400 text-[12px] ml-1" title="Verified"><i class="fa-solid fa-circle-check"></i></span>' : ''}
                ${followBtnHtml}
              </div>
              <div class="reels-caption">${reel.caption || 'Flashgram Reel! ✨ #reels'}</div>
            </div>

            <div class="reels-sidebar">
              <div class="reel-action-btn like-btn">
                <i class="fa-solid fa-heart"></i>
                <span>${likesDisplay}</span>
              </div>
              <div class="reel-action-btn comment-btn" title="Comments">
                <i class="fa-solid fa-comment-dots"></i>
                <span>${commentsDisplay}</span>
              </div>
              <div class="reel-action-btn share-btn" title="Share">
                <i class="fa-regular fa-paper-plane"></i>
                <span>${sharesDisplay}</span>
              </div>
              <div class="reel-action-btn pip-btn" title="Picture in Picture">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                <span>PiP</span>
              </div>
              <div class="reel-action-btn fullscreen-btn" title="Fullscreen">
                <i class="fa-solid fa-expand"></i>
                <span>Full</span>
              </div>
              <div class="reel-action-btn more-btn">
                <i class="fa-solid fa-ellipsis"></i>
              </div>
            </div>

            <!-- Independent Per-Card Progress Bar (Moves naturally with card on vertical scroll) -->
            <div class="reel-card-progress-bar-container" title="Video Progress • Click or drag to seek">
              <div class="reel-card-progress-bar-fill"></div>
            </div>
          </div>
        `;

        const wrapper = item.querySelector(".reel-video-wrapper");
        const video = item.querySelector(".reel-video");
        const likeIcon = item.querySelector(".like-btn i");

        // Clear View Mode (Long-press hold > 250ms)
        let holdTimer = null;
        let isHoldingClearView = false;
        let holdStartX = 0;
        let holdStartY = 0;
        let hasTouchMoved = false;

        const startClearViewHold = (x, y) => {
          holdStartX = x;
          holdStartY = y;
          hasTouchMoved = false;
          clearTimeout(holdTimer);
          holdTimer = setTimeout(() => {
            if (hasTouchMoved) return;
            isHoldingClearView = true;
            video.pause();
            wrapper.classList.add("clear-view-mode");
            const rView = document.getElementById("reelsView");
            if (rView) rView.classList.add("clear-view-active");
          }, 250);
        };

        const releaseClearViewHold = () => {
          clearTimeout(holdTimer);
          holdTimer = null;
          if (isHoldingClearView) {
            isHoldingClearView = false;
            wrapper.classList.remove("clear-view-mode");
            const rView = document.getElementById("reelsView");
            if (rView) rView.classList.remove("clear-view-active");
            video.play().catch(() => {});
          }
        };

        const checkHoldMove = (x, y) => {
          const dx = Math.abs(x - holdStartX);
          const dy = Math.abs(y - holdStartY);
          if (dx > 10 || dy > 10) {
            hasTouchMoved = true;
            clearTimeout(holdTimer);
            holdTimer = null;
            if (isHoldingClearView) {
              releaseClearViewHold();
            }
          }
        };

        wrapper.addEventListener("touchstart", (e) => {
          if (e.target.closest(".reels-sidebar") || e.target.closest(".reels-user-row") || e.target.closest(".follow-btn")) {
            return;
          }
          if (e.touches && e.touches[0]) {
            startClearViewHold(e.touches[0].clientX, e.touches[0].clientY);
          }
        }, { passive: true });

        wrapper.addEventListener("touchmove", (e) => {
          if (e.touches && e.touches[0]) {
            checkHoldMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        }, { passive: true });

        wrapper.addEventListener("touchend", () => {
          releaseClearViewHold();
        }, { passive: true });

        wrapper.addEventListener("touchcancel", () => {
          releaseClearViewHold();
        }, { passive: true });

        wrapper.addEventListener("mousedown", (e) => {
          if (e.button !== 0) return;
          if (e.target.closest(".reels-sidebar") || e.target.closest(".reels-user-row") || e.target.closest(".follow-btn")) {
            return;
          }
          startClearViewHold(e.clientX, e.clientY);
        });

        window.addEventListener("mousemove", (e) => {
          if (holdTimer || isHoldingClearView) {
            checkHoldMove(e.clientX, e.clientY);
          }
        });

        window.addEventListener("mouseup", () => {
          if (holdTimer || isHoldingClearView) {
            releaseClearViewHold();
          }
        });

        // Single tap does NOT pause playback. Double-tap likes the reel.
        let lastTap = 0;
        wrapper.addEventListener("click", (e) => {
          if (isHoldingClearView || hasTouchMoved) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (e.target.closest(".reels-sidebar") || e.target.closest(".reels-user-row") || e.target.closest(".follow-btn")) {
            return;
          }

          const currentTime = Date.now();
          const tapLength = currentTime - lastTap;
          
          if (tapLength < 300 && tapLength > 0) {
            spawnFloatingHeart(e, wrapper);
            likeIcon.classList.add("liked");
            e.preventDefault();
          }
          lastTap = currentTime;
        });

        likeIcon.onclick = (e) => {
          e.stopPropagation();
          likeIcon.classList.toggle("liked");
        };

        const commentBtn = item.querySelector(".comment-btn");
        if (commentBtn) {
          commentBtn.onclick = (e) => {
            e.stopPropagation();
            openReelsCommentsSheet(reel.id || ('sample_' + index), reel);
          };
        }

        const shareBtn = item.querySelector(".share-btn");
        if (shareBtn) {
          shareBtn.onclick = (e) => {
            e.stopPropagation();
            openReelsShareSheet(reel);
          };
        }

        const pipBtn = item.querySelector(".pip-btn");
        if (pipBtn) {
          pipBtn.onclick = (e) => {
            e.stopPropagation();
            enableVideoPiP(video);
          };
        }

        const fullscreenBtn = item.querySelector(".fullscreen-btn");
        if (fullscreenBtn) {
          fullscreenBtn.onclick = (e) => {
            e.stopPropagation();
            toggleFullScreen(wrapper);
          };
        }

        video.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          toggleFullScreen(wrapper);
        });

        const moreBtn = item.querySelector(".more-btn");
        if (moreBtn) {
          moreBtn.onclick = (e) => {
            e.stopPropagation();
            openPostOptionsSheet(reel, item);
          };
        }

        // Independent Progress Bar per Reel Card (Synchronized to this specific video)
        const cardProgressBarContainer = item.querySelector(".reel-card-progress-bar-container");
        const cardProgressBarFill = item.querySelector(".reel-card-progress-bar-fill");

        const updateCardProgress = () => {
          if (video && video.duration && !isNaN(video.duration) && video.duration > 0) {
            const pct = Math.min(100, Math.max(0, (video.currentTime / video.duration) * 100));
            if (cardProgressBarFill) cardProgressBarFill.style.width = `${pct}%`;
          }
        };

        video.addEventListener("timeupdate", updateCardProgress);
        video.addEventListener("seeking", updateCardProgress);
        video.addEventListener("seeked", updateCardProgress);
        video.addEventListener("ended", () => {
          if (cardProgressBarFill) cardProgressBarFill.style.width = "100%";
          setTimeout(() => {
            if (video && !video.paused) updateCardProgress();
          }, 80);
        });

        if (cardProgressBarContainer) {
          let isCardScrubbing = false;
          const handleCardSeek = (clientX) => {
            if (!video || !video.duration) return;
            const rect = cardProgressBarContainer.getBoundingClientRect();
            if (rect.width <= 0) return;
            const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
            const targetPercent = clickX / rect.width;
            video.currentTime = targetPercent * video.duration;
            if (cardProgressBarFill) cardProgressBarFill.style.width = `${targetPercent * 100}%`;
          };

          cardProgressBarContainer.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            isCardScrubbing = true;
            cardProgressBarContainer.classList.add("seeking");
            handleCardSeek(e.clientX);
          });
          window.addEventListener("mousemove", (e) => {
            if (isCardScrubbing) handleCardSeek(e.clientX);
          });
          window.addEventListener("mouseup", () => {
            if (isCardScrubbing) {
              isCardScrubbing = false;
              cardProgressBarContainer.classList.remove("seeking");
            }
          });

          cardProgressBarContainer.addEventListener("touchstart", (e) => {
            e.stopPropagation();
            if (e.touches && e.touches[0]) {
              isCardScrubbing = true;
              cardProgressBarContainer.classList.add("seeking");
              handleCardSeek(e.touches[0].clientX);
            }
          }, { passive: true });
          window.addEventListener("touchmove", (e) => {
            if (isCardScrubbing && e.touches && e.touches[0]) {
              handleCardSeek(e.touches[0].clientX);
            }
          }, { passive: true });
          window.addEventListener("touchend", () => {
            if (isCardScrubbing) {
              isCardScrubbing = false;
              cardProgressBarContainer.classList.remove("seeking");
            }
          });
        }

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
        // Auto-Play Next Reel on Video End (Auto Scroll)
        goToNextReel();
      };
      boundVideoPlayHandler = startProgressLoop;
      boundVideoPauseHandler = stopProgressLoop;

      video.onended = () => {
        goToNextReel();
      };

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
            currentActiveReelVideo = video;
            setActiveReelVideo(video);
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

      // Initialize automatic hardware back button and app leave PiP handling
      initReelsPipHandler();

      // Initialize Instagram-style Custom Reels Volume HUD
      initReelsVolumeHUD();

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
            setActiveClearModeReelId(null);
            pauseAllReels(video);
            video.muted = isGlobalAudioMuted;
            video.play().catch(() => {});
            currentActiveReelVideo = video;
            setActiveReelVideo(video);
          }
        }
      }
    }

    // Capture any play event inside reelsView to guarantee progress bar sync & PiP readiness
    reelsView.addEventListener("play", (e) => {
      if (e.target && (e.target.classList.contains("reel-video") || e.target.tagName === "VIDEO")) {
        setActiveReelVideo(e.target);
        if (currentActiveReelVideo !== e.target) {
          attachVideoProgressTracker(e.target);
        }
      }
    }, true);

    // Auto-Play Next Reel on Video End (Auto Scroll)
    reelsView.addEventListener("ended", (e) => {
      if (e.target && (e.target.classList.contains("reel-video") || e.target.tagName === "VIDEO")) {
        goToNextReel();
      }
    }, true);

    function goToNextReel() {
      const reelsContainer = document.getElementById("reelsView");
      const items = Array.from(document.querySelectorAll("#reelsFeedWrapper .reel-item"));
      if (items.length === 0 || !reelsContainer) return;

      const currentItem = currentActiveReelVideo ? currentActiveReelVideo.closest(".reel-item") : null;
      let nextItem = null;

      if (currentItem) {
        const currentIndex = items.indexOf(currentItem);
        if (currentIndex !== -1 && currentIndex + 1 < items.length) {
          nextItem = items[currentIndex + 1];
        } else {
          nextItem = items[0]; // Loop back to the first reel
        }
      } else {
        nextItem = items[0];
      }

      if (nextItem) {
        const nextVideo = nextItem.querySelector("video");
        if (nextVideo) {
          pauseAllReels(nextVideo);
          nextItem.scrollIntoView({ behavior: "smooth", block: "start" });
          nextVideo.currentTime = 0;
          nextVideo.muted = isGlobalAudioMuted;
          nextVideo.play().catch(() => {});
          currentActiveReelVideo = nextVideo;
          setActiveReelVideo(nextVideo);
          attachVideoProgressTracker(nextVideo);
        }
      }
    }

    function goToPrevReel() {
      const reelsContainer = document.getElementById("reelsView");
      const items = Array.from(document.querySelectorAll("#reelsFeedWrapper .reel-item"));
      if (items.length === 0 || !reelsContainer) return;

      const currentItem = currentActiveReelVideo ? currentActiveReelVideo.closest(".reel-item") : null;
      let prevItem = null;

      if (currentItem) {
        const currentIndex = items.indexOf(currentItem);
        if (currentIndex > 0) {
          prevItem = items[currentIndex - 1];
        } else {
          prevItem = items[items.length - 1];
        }
      } else {
        prevItem = items[0];
      }

      if (prevItem) {
        const prevVideo = prevItem.querySelector("video");
        if (prevVideo) {
          pauseAllReels(prevVideo);
          prevItem.scrollIntoView({ behavior: "smooth", block: "start" });
          prevVideo.currentTime = 0;
          prevVideo.muted = isGlobalAudioMuted;
          prevVideo.play().catch(() => {});
          currentActiveReelVideo = prevVideo;
          setActiveReelVideo(prevVideo);
          attachVideoProgressTracker(prevVideo);
        }
      }
    }

    function toggleCurrentReelPlayback() {
      const currentVideo = currentActiveReelVideo || document.querySelector("video.active-reel") || document.querySelector("#reelsView video");
      if (!currentVideo) return;

      if (currentVideo.paused) {
        currentVideo.play().catch(() => {});
      } else {
        currentVideo.pause();
      }
    }

    if (typeof window !== "undefined") {
      window.goToNextReel = goToNextReel;
      window.goToPrevReel = goToPrevReel;
      window.toggleCurrentReelPlayback = toggleCurrentReelPlayback;
    }

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

    /* Auto Picture-in-Picture when user presses home button or switches apps */
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          const activeVid = currentActiveReelVideo && !currentActiveReelVideo.paused 
            ? currentActiveReelVideo 
            : Array.from(document.querySelectorAll(".reel-video")).find(v => !v.paused);
          if (activeVid) {
            enableVideoPiP(activeVid);
          }
        }
      });

      window.addEventListener("pagehide", () => {
        const activeVid = currentActiveReelVideo && !currentActiveReelVideo.paused 
          ? currentActiveReelVideo 
          : Array.from(document.querySelectorAll(".reel-video")).find(v => !v.paused);
        if (activeVid) {
          enableVideoPiP(activeVid);
        }
      });

      const handleFullscreenChange = () => {
        const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (!isFS && window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          try {
            window.screen.orientation.unlock();
          } catch (_) {}
        }
        document.querySelectorAll(".fullscreen-btn i").forEach(icon => {
          if (isFS) {
            icon.className = "fa-solid fa-compress";
          } else {
            icon.className = "fa-solid fa-expand";
          }
        });
      };
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    }

export { loadReels, setupReelObserver, syncActiveReel, playCurrentReel, pauseAllReels, attachVideoProgressTracker, handleProgressBarSeek, resetVideoProgressBar, detachVideoProgressTracker, spawnFloatingHeart, openMyProfileTab, toggleReelFollowBtn, playShabnamReelVideo, navigateToReel, openReelsShareSheet, openReelsCommentsSheet, enableVideoPiP, toggleFullScreen, goToNextReel, goToPrevReel, toggleCurrentReelPlayback };
