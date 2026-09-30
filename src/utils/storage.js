// LocalStorage Helpers and UserProfileStore
import { DEFAULT_USER_PROFILE, SAMPLE_VIDEOS } from "./mockData.js";
import { db } from "../services/database.js";

    window.alert = function(msg) {
      try {
        const existing = document.querySelector(".app-toast-popup");
        if (existing) existing.remove();
        const toast = document.createElement("div");
        toast.className = "app-toast-popup";
        toast.textContent = msg;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add("show"));
        setTimeout(() => {
          toast.classList.remove("show");
          setTimeout(() => toast.remove(), 300);
        }, 2200);
      } catch (e) {
        console.log(msg);
      }
    };


    const UserProfileStore = {
      state: (() => {
        let avatar = DEFAULT_USER_PROFILE.avatar;
        let info = { ...DEFAULT_USER_PROFILE };
        try {
          const savedAvatar = localStorage.getItem("user_custom_avatar_data");
          if (savedAvatar) avatar = savedAvatar;
          const savedInfo = localStorage.getItem("user_profile_info");
          if (savedInfo) {
            const parsed = JSON.parse(savedInfo);
            if (parsed && parsed.username && !parsed.username.includes("arya")) {
              info = { ...info, ...parsed };
            }
          }
        } catch (_) {}
        return {
          ...info,
          avatar
        };
      })(),
      listeners: new Set(),

      getState() {
        return this.state;
      },

      subscribe(listener) {
        this.listeners.add(listener);
        try { listener(this.state); } catch (e) { console.error(e); }
        return () => this.listeners.delete(listener);
      },

      setState(updates) {
        this.state = { ...this.state, ...updates };

        try {
          if (updates.avatar !== undefined && updates.avatar) {
            localStorage.setItem("user_custom_avatar_data", this.state.avatar);
          }
          localStorage.setItem("user_profile_info", JSON.stringify({
            name: this.state.name,
            username: this.state.username,
            pronouns: this.state.pronouns,
            bio: this.state.bio,
            link: this.state.link
          }));
        } catch (e) {
          console.warn("Storage write warning:", e);
        }

        this.notify();
      },

      notify() {
        this.syncDOM();
        this.listeners.forEach(fn => {
          try { fn(this.state); } catch (e) { console.error("UserProfileStore listener error:", e); }
        });
      },

      syncDOM() {
        const { username, name, avatar } = this.state;

        // 1. All Current User Avatar Elements Across App (Feed Post headers, Story bubbles, Bottom nav)
        document.querySelectorAll(".current-user-avatar, .current-user-post-avatar, .current-user-reel-avatar").forEach(el => {
          if (el.tagName === "IMG" && el.id !== "mainProfileAvatarImg" && el.src !== avatar) {
            el.src = avatar;
          }
        });
        document.querySelectorAll(".profile-nav-circle img").forEach(img => {
          if (img.src !== avatar) img.src = avatar;
        });

        // 2. All Current User Username Elements Across App (Feed Post headers, Post captions, Story bubbles)
        document.querySelectorAll(".current-user-username, .current-user-post-username, .current-user-reel-username").forEach(el => {
          if (el.id !== "profileHeaderUsername") {
            el.textContent = username;
          }
        });

        // 3. All Current User Display Name Elements
        document.querySelectorAll(".current-user-displayname").forEach(el => {
          el.textContent = name;
        });

        // 4. Specific Key Elements
        const editAvatarPreview = document.getElementById("editProfileAvatarPreview");
        if (editAvatarPreview && editAvatarPreview.src !== avatar) editAvatarPreview.src = avatar;
        const viewerAvatar = document.getElementById("avatarViewerImg");
        if (viewerAvatar && viewerAvatar.src !== avatar) viewerAvatar.src = avatar;
        const myStoryImg = document.getElementById("myStoryAvatarImg");
        if (myStoryImg && myStoryImg.src !== avatar) myStoryImg.src = avatar;
        const myStoryBubbleImg = document.getElementById("myStoryBubbleAvatarImg");
        if (myStoryBubbleImg && myStoryBubbleImg.src !== avatar) myStoryBubbleImg.src = avatar;
        const myStoryBubbleUser = document.getElementById("myStoryBubbleUsername");
        if (myStoryBubbleUser) myStoryBubbleUser.textContent = username;

        const viewerUser = document.getElementById("viewerUsername");
        if (viewerUser) viewerUser.textContent = name;
        const chatsHeaderUser = document.getElementById("chatsHeaderUsername");
        if (chatsHeaderUser) chatsHeaderUser.textContent = username;

        // 5. PROFILE VIEW ELEMENTS - Only update if viewing own profile (NEVER touch when viewing Shabnam AI!)
        const isSelfProfile = (typeof window !== "undefined" && window.viewingProfileUserId === "shabnam_ai") ? false : true;
        if (isSelfProfile) {
          const mainAvatar = document.getElementById("mainProfileAvatarImg");
          if (mainAvatar && mainAvatar.src !== avatar) mainAvatar.src = avatar;
          const profileHeaderUser = document.getElementById("profileHeaderUsername");
          if (profileHeaderUser) profileHeaderUser.textContent = username;
          const profileDisplay = document.getElementById("profileDisplayName");
          if (profileDisplay) profileDisplay.textContent = name;
          const profileHandle = document.getElementById("profileHandleText");
          if (profileHandle) profileHandle.textContent = `@${username}`;
          const profileBio = document.getElementById("profileBioText");
          if (profileBio) profileBio.textContent = this.state.bio;
          const profileLink = document.getElementById("profileBioLinkText");
          if (profileLink) profileLink.textContent = this.state.link;
          const profileCategory = document.getElementById("profileCategoryTag");
          if (profileCategory) profileCategory.textContent = "Digital Creator • Video";
          const verifiedBadge = document.getElementById("profileVerifiedBadge");
          if (verifiedBadge) verifiedBadge.style.display = "inline-flex";
          const primaryPillBtn = document.getElementById("profilePrimaryPillBtn");
          if (primaryPillBtn) {
            primaryPillBtn.textContent = "Edit profile";
            primaryPillBtn.className = "yt-full-pill-btn";
          }
          const profileBackBtn = document.getElementById("profileBackBtn");
          if (profileBackBtn) profileBackBtn.style.display = "none";
          const profileHeaderChevron = document.getElementById("profileHeaderChevron");
          if (profileHeaderChevron) profileHeaderChevron.style.display = "inline-block";
          const profileHeaderActions = document.getElementById("profileHeaderActions");
          if (profileHeaderActions) profileHeaderActions.style.display = "flex";
          if (typeof updateProfilePostsCount === "function") {
            updateProfilePostsCount();
          }
        }
      },

      getFollowingCount() {
        return typeof isFollowingShabnam === "function" && isFollowingShabnam() ? 1 : 0;
      }
    };
    window.UserProfileStore = UserProfileStore;



    function getShabnamUnread() {
      try {
        return localStorage.getItem("flashgram_shabnam_unread") === "true";
      } catch (_) {
        return false;
      }
    }
    window.getShabnamUnread = getShabnamUnread;

    function setShabnamUnread(val) {
      try {
        localStorage.setItem("flashgram_shabnam_unread", val ? "true" : "false");
      } catch (_) {}
      const dot = document.getElementById("shabnamUnreadDot");
      if (dot) {
        dot.style.display = val ? "inline-block" : "none";
      }
    }
    window.setShabnamUnread = setShabnamUnread;

    function markShabnamChatAsRead() {
      setShabnamUnread(false);
      const dot = document.getElementById("shabnamUnreadDot");
      if (dot) dot.style.display = "none";
    }
    window.markShabnamChatAsRead = markShabnamChatAsRead;

    /* Pinned Conversations Storage */
    function getPinnedConversations() {
      try {
        const raw = localStorage.getItem("flashgram_pinned_conversations");
        return raw ? JSON.parse(raw) : [];
      } catch (_) {
        return [];
      }
    }

    function setPinnedConversations(list) {
      try {
        localStorage.setItem("flashgram_pinned_conversations", JSON.stringify(list));
      } catch (_) {}
    }

    /* Muted Conversations Storage */
    function getMutedConversations() {
      try {
        const raw = localStorage.getItem("flashgram_muted_conversations");
        return raw ? JSON.parse(raw) : [];
      } catch (_) {
        return [];
      }
    }

    function setMutedConversations(list) {
      try {
        localStorage.setItem("flashgram_muted_conversations", JSON.stringify(list));
      } catch (_) {}
    }

    /* Deleted Conversations Storage */
    function getDeletedConversations() {
      try {
        const raw = localStorage.getItem("flashgram_deleted_conversations");
        return raw ? JSON.parse(raw) : [];
      } catch (_) {
        return [];
      }
    }

    function setDeletedConversations(list) {
      try {
        localStorage.setItem("flashgram_deleted_conversations", JSON.stringify(list));
      } catch (_) {}
    }

    /* Blocked Conversations Storage */
    function getBlockedConversations() {
      try {
        const raw = localStorage.getItem("flashgram_blocked_conversations");
        return raw ? JSON.parse(raw) : [];
      } catch (_) {
        return [];
      }
    }

    function setBlockedConversations(list) {
      try {
        localStorage.setItem("flashgram_blocked_conversations", JSON.stringify(list));
      } catch (_) {}
    }

    function getShabnamHistory() {
      try {
        const raw = localStorage.getItem("flashgram_shabnam_history_v2");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // Clean up legacy auto-generated single welcome message if present so user sees empty intro
            if (parsed.length === 1 && parsed[0].role === "assistant" && parsed[0].text && (parsed[0].text.startsWith("Hi ") || parsed[0].text.includes("friendly companion on Flashgram"))) {
              localStorage.removeItem("flashgram_shabnam_history_v2");
              return [];
            }
            return parsed;
          }
        }
      } catch (_) {}
      return [];
    }

    const SHABNAM_SESSIONS_STORAGE_KEY = "flashgram_shabnam_sessions_v1";
    const SHABNAM_ACTIVE_SESSION_KEY = "flashgram_shabnam_active_session_id";

    function getAllShabnamSessions() {
      try {
        const raw = localStorage.getItem(SHABNAM_SESSIONS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (_) {}
      return [];
    }

    function saveAllShabnamSessions(sessions) {
      try {
        localStorage.setItem(SHABNAM_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
      } catch (_) {}
    }

    function getActiveSessionId() {
      try {
        return localStorage.getItem(SHABNAM_ACTIVE_SESSION_KEY) || null;
      } catch (_) {
        return null;
      }
    }

    function setActiveSessionId(id) {
      try {
        if (id) {
          localStorage.setItem(SHABNAM_ACTIVE_SESSION_KEY, id);
        } else {
          localStorage.removeItem(SHABNAM_ACTIVE_SESSION_KEY);
        }
      } catch (_) {}
    }

    function saveShabnamHistory(hist) {
      try {
        localStorage.setItem("flashgram_shabnam_history_v2", JSON.stringify(hist));
      } catch (_) {}

      // Automatically sync active session
      if (!Array.isArray(hist) || hist.length === 0) return;

      try {
        let sessions = getAllShabnamSessions();
        let activeId = getActiveSessionId();
        let session = activeId ? sessions.find(s => s.id === activeId) : null;

        const firstUserMsg = hist.find(m => m.role === "user");
        let sessionTitle = firstUserMsg && firstUserMsg.text && firstUserMsg.text !== "(Attached a photo)"
          ? (firstUserMsg.text.length > 28 ? firstUserMsg.text.slice(0, 28) + "..." : firstUserMsg.text)
          : (firstUserMsg ? "Photo conversation 📸" : "Conversation");

        if (session) {
          session.messages = hist;
          session.updatedAt = Date.now();
          if (!session.title || session.title === "Conversation" || session.title === "New Chat") {
            session.title = sessionTitle;
          }
        } else {
          activeId = "sess_" + Date.now();
          setActiveSessionId(activeId);
          session = {
            id: activeId,
            title: sessionTitle,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: hist
          };
          sessions.unshift(session);
        }
        saveAllShabnamSessions(sessions);
      } catch (_) {}
    }



      function showInstagramToast(content, options = {}) {
        let toast = document.getElementById("inAppNotificationToast");
        if (!toast) {
          toast = document.createElement("div");
          toast.id = "inAppNotificationToast";
          document.body.appendChild(toast);
        }

        const isCenter = options.center !== false;
        const duration = options.duration || 1500;

        toast.style.position = "fixed";
        if (isCenter) {
          toast.style.top = "50%";
          toast.style.bottom = "auto";
          toast.style.left = "50%";
          toast.style.transform = "translate(-50%, -50%) scale(0.92)";
        } else {
          toast.style.top = "70px";
          toast.style.bottom = "auto";
          toast.style.left = "50%";
          toast.style.transform = "translateX(-50%) translateY(-10px)";
        }

        toast.style.background = "rgba(30, 30, 30, 0.85)";
        toast.style.backdropFilter = "blur(8px)";
        toast.style.webkitBackdropFilter = "blur(8px)";
        toast.style.color = "#ffffff";
        toast.style.padding = "8px 16px";
        toast.style.borderRadius = "9999px";
        toast.style.fontSize = "14px";
        toast.style.fontWeight = "500";
        toast.style.zIndex = "9999999";
        toast.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.4)";
        toast.style.pointerEvents = "none";
        toast.style.transition = "opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)";
        toast.style.opacity = "0";
        toast.style.whiteSpace = "nowrap";
        toast.style.display = "inline-flex";
        toast.style.alignItems = "center";
        toast.style.justifyContent = "center";
        toast.style.gap = "6px";

        if (typeof content === "string" && content.includes("<")) {
          toast.innerHTML = content;
        } else {
          toast.textContent = content;
        }

        requestAnimationFrame(() => {
          toast.style.opacity = "1";
          if (isCenter) {
            toast.style.transform = "translate(-50%, -50%) scale(1)";
          } else {
            toast.style.transform = "translateX(-50%) translateY(0)";
          }
        });

        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
          toast.style.opacity = "0";
          if (isCenter) {
            toast.style.transform = "translate(-50%, -50%) scale(0.94)";
          } else {
            toast.style.transform = "translateX(-50%) translateY(-8px)";
          }
        }, duration);
      }
      window.showInstagramToast = showInstagramToast;

      // Profile Screen Header & Action Buttons Handlers
      const profileCreatePostBtn = document.getElementById("profileCreatePostBtn");
      const shareProfileBtn = document.getElementById("shareProfileBtn");
      const profileAddFriendBtn = document.getElementById("profileAddFriendBtn");

      if (profileCreatePostBtn) {
        profileCreatePostBtn.onclick = () => {
          if (typeof openMediaCreationPrompt === "function") {
            openMediaCreationPrompt();
          }
        };
      }
      if (shareProfileBtn) {
        shareProfileBtn.onclick = () => {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(window.location.href).catch(() => {});
          }
          showInstagramToast("Profile link copied to clipboard");
        };
      }
      if (profileAddFriendBtn) {
        profileAddFriendBtn.onclick = () => {
          showInstagramToast("Discover people • Suggested accounts");
        };
      }



    function getSavedVideos() {
      return new Promise((resolve) => {
        try {
          const activeDb = db || (typeof window !== "undefined" && window.db);
          if (!activeDb || typeof activeDb.transaction !== "function") {
            return resolve(SAMPLE_VIDEOS);
          }
          const tx = activeDb.transaction("videos", "readonly");
          const req = tx.objectStore("videos").getAll();
          req.onsuccess = () => {
            const list = (req.result || []).map(p => ({
              id: 'local_' + p.id,
              url: p.blob ? URL.createObjectURL(p.blob) : (p.url || ''),
              user: UserProfileStore.state.username,
              avatar: UserProfileStore.state.avatar,
              isCurrentUser: true,
              location: 'Original Audio',
              caption: 'Uploaded Reel Video! ✨ #trending',
              likes: '2.5K',
              likesCount: 2500,
              comments: '64',
              commentsCount: 64,
              shares: '120',
              time: 'JUST NOW'
            }));

            const shabnamReelObj = SAMPLE_VIDEOS.find(v => v.id === "shabnam_reel_1") || {
              id: "shabnam_reel_1",
              url: "https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/0chichan077-20260921-0001.mp4",
              user: "shabnam_ai",
              avatar: "https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/IMG_20260921_164350.png",
              location: "AI Studio",
              caption: "Hi everyone! ✨ Meet Shabnam AI, your friendly AI assistant right on Flashgram! Ask me anything in DMs or share your photos!",
              likes: "142K",
              likesCount: 142000,
              comments: "1.8K",
              commentsCount: 1800,
              shares: "5.4K",
              time: "1 DAY AGO"
            };

            if (list.length > 0) {
              // Include Shabnam's reel seamlessly in the feed alongside user uploaded videos
              resolve([...list, shabnamReelObj, ...SAMPLE_VIDEOS.filter(v => v.id !== "shabnam_reel_1")]);
            } else {
              resolve(SAMPLE_VIDEOS);
            }
          };
          req.onerror = () => resolve(SAMPLE_VIDEOS);
        } catch (err) {
          console.warn("getSavedVideos execution error:", err);
          resolve(SAMPLE_VIDEOS);
        }
      });
    }

// Follow Shabnam helpers
    function isFollowingShabnam() {
      try {
        return localStorage.getItem("flashgram_following_shabnam") === "true";
      } catch (_) {
        return false;
      }
    }

    function toggleFollowShabnam() {
      const currentlyFollowing = isFollowingShabnam();
      const next = !currentlyFollowing;
      try {
        localStorage.setItem("flashgram_following_shabnam", String(next));
      } catch (_) {}

      const pillBtn = document.getElementById("profilePrimaryPillBtn");
      const isViewingShabnam = (typeof window !== "undefined" && window.viewingProfileUserId === "shabnam_ai");
      if (pillBtn && isViewingShabnam) {
        if (next) {
          pillBtn.textContent = "Message";
          pillBtn.className = "yt-full-pill-btn";
        } else {
          pillBtn.textContent = "Follow";
          pillBtn.className = "yt-full-pill-btn yt-follow-btn";
        }
      }

      // Sync any follow buttons in reels or home feeds
      document.querySelectorAll(".follow-btn").forEach(btn => {
        const row = btn.closest(".reels-user-row, .post-user, .post-header");
        if (row && (row.textContent.includes("shabnam_ai") || row.innerHTML.includes("shabnam_ai"))) {
          btn.classList.toggle("following", next);
          btn.innerText = next ? "Following" : "Follow";
        }
      });

      // Update background following counter without re-triggering DOM resets
      const userFollowingEl = document.getElementById("profileFollowingCount");
      if (userFollowingEl) {
        userFollowingEl.textContent = String(next ? 1 : 0);
      }

      if (next) {
        if (typeof showInstagramToast === "function") {
          showInstagramToast("You are now following Shabnam AI ✨");
        }
      } else {
        if (typeof showInstagramToast === "function") {
          showInstagramToast("Unfollowed Shabnam AI");
        }
      }
    }
    window.toggleFollowShabnam = toggleFollowShabnam;



export { UserProfileStore, showInstagramToast, getSavedVideos, getPinnedConversations, setPinnedConversations, getMutedConversations, setMutedConversations, getDeletedConversations, setDeletedConversations, getBlockedConversations, setBlockedConversations, getShabnamUnread, setShabnamUnread, markShabnamChatAsRead, getShabnamHistory, saveShabnamHistory, getAllShabnamSessions, saveAllShabnamSessions, getActiveSessionId, setActiveSessionId, isFollowingShabnam, toggleFollowShabnam };
