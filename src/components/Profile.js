// Profile Component (YouTube Style Channel Header, Stats, Tabs & Grid)
import { db } from "../services/database.js";
import { UserProfileStore, showInstagramToast, isFollowingShabnam, toggleFollowShabnam } from "../utils/storage.js";
import { SHABNAM_AI_PROFILE } from "../utils/mockData.js";
import { switchTab, activeNavId } from "./BottomNavigation.js";
import { openShabnamChat } from "./ShabnamAI.js";
import { playShabnamReelVideo, navigateToReel } from "./ReelsViewer.js";
import { openEditProfileScreen, openMediaCreationPrompt } from "./Modals.js";
import { fetchSupabasePosts, deriveCloudinaryThumbnailUrl, getOptimizedVideoUrl } from "../services/cloudinaryService.js";
import { supabase } from "../supabaseClient.js";
import { getCurrentUserId } from "../services/avatarService.js";
import { isFollowingUser, toggleFollowUser } from "../services/followService.js";
import { openDirectChatWithUser } from "./DirectChat.js";

let viewingProfileUserId = null;
let previousScreenBeforeProfile = "home";

if (typeof window !== "undefined") {
  window.viewingProfileUserId = viewingProfileUserId;
  window.previousScreenBeforeProfile = previousScreenBeforeProfile;
}

let viewingOtherUserObj = null;

function handleProfilePrimaryPillAction() {
  if (viewingProfileUserId === "shabnam_ai") {
    if (isFollowingShabnam()) {
      if (typeof openShabnamChat === "function") {
        openShabnamChat();
      } else if (typeof window !== "undefined" && typeof window.openShabnamChat === "function") {
        window.openShabnamChat();
      }
    } else {
      toggleFollowShabnam();
    }
  } else if (viewingOtherUserObj) {
    handleMessageOtherUser();
  } else {
    if (typeof openEditProfileScreen === "function") {
      openEditProfileScreen();
    } else if (typeof window !== "undefined" && typeof window.openEditProfileScreen === "function") {
      window.openEditProfileScreen();
    }
  }
}
window.handleProfilePrimaryPillAction = handleProfilePrimaryPillAction;

function handleMessageOtherUser() {
  if (viewingOtherUserObj) {
    if (typeof openDirectChatWithUser === "function") {
      openDirectChatWithUser(viewingOtherUserObj);
    }
  }
}
window.handleMessageOtherUser = handleMessageOtherUser;

async function handleToggleFollowOtherUser(userId, username) {
  const isNowFoll = await toggleFollowUser(userId, username);
  renderOtherUserPillActions(userId, username);
}
window.handleToggleFollowOtherUser = handleToggleFollowOtherUser;

function renderOtherUserPillActions(userId, username) {
  const container = document.getElementById("profilePillActionContainer");
  if (!container) return;

  const isFoll = isFollowingUser(userId);

  container.innerHTML = `
    <div class="flex items-center gap-2.5 w-full">
      <button 
        type="button" 
        data-follow-user-id="${userId}"
        class="profile-follow-btn flex-1 py-2 px-4 rounded-xl font-semibold text-[14px] transition-all cursor-pointer ${isFoll ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'bg-[#0095f6] hover:bg-sky-600 text-white'}"
        onclick="handleToggleFollowOtherUser('${userId}', '${username}')"
      >
        ${isFoll ? 'Following' : 'Follow'}
      </button>

      <button 
        type="button" 
        class="flex-1 py-2 px-4 rounded-xl font-semibold text-[14px] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
        onclick="handleMessageOtherUser()"
      >
        <i class="fa-regular fa-paper-plane text-[13px]"></i>
        <span>Message</span>
      </button>
    </div>
  `;
}

async function loadAndRenderOtherUserProfile(userId, fallbackUsername, fallbackAvatar) {
  let targetProfile = null;
  const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400";

  if (supabase) {
    try {
      const { data: profRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profRow) {
        targetProfile = profRow;
      } else {
        const { data: profs } = await supabase.from('profiles').select('*');
        if (Array.isArray(profs)) {
          targetProfile = profs.find(p => 
            String(p.id) === String(userId) ||
            (p.avatar_url && String(userId) && p.avatar_url.includes(String(userId))) ||
            (fallbackUsername && (p.username === fallbackUsername || p.display_name === fallbackUsername))
          );
        }
      }
    } catch (_) {}
  }

  // Strictly render authentic username - eliminate any generic 'user' fallback
  const username = targetProfile?.username || targetProfile?.display_name || fallbackUsername || 'creator';
  const displayName = targetProfile?.display_name || targetProfile?.full_name || username;
  const avatarUrl = targetProfile?.avatar_url || fallbackAvatar || defaultAvatar;
  const bio = targetProfile?.bio || "Digital Creator ✨ Daily reels & updates!";
  const link = targetProfile?.website || targetProfile?.link || `flashgram.me/${username}`;

  viewingOtherUserObj = {
    id: userId,
    username,
    name: displayName,
    avatar: avatarUrl
  };

  const headerUsername = document.getElementById("profileHeaderUsername");
  if (headerUsername) headerUsername.textContent = username;
  const mainAvatar = document.getElementById("mainProfileAvatarImg");
  if (mainAvatar) mainAvatar.src = avatarUrl;
  const profileDisplay = document.getElementById("profileDisplayName");
  if (profileDisplay) profileDisplay.textContent = displayName;
  const verifiedBadge = document.getElementById("profileVerifiedBadge");
  if (verifiedBadge) {
    const isVerified = Boolean(targetProfile?.is_verified || username === "sohelmommy_077");
    verifiedBadge.style.display = isVerified ? "inline-flex" : "none";
  }
  const profileHandle = document.getElementById("profileHandleText");
  if (profileHandle) profileHandle.textContent = `@${username}`;
  const profileCategory = document.getElementById("profileCategoryTag");
  if (profileCategory) profileCategory.textContent = "Creator";
  const profileBio = document.getElementById("profileBioText");
  if (profileBio) profileBio.textContent = bio;
  const profileLink = document.getElementById("profileBioLinkText");
  if (profileLink) profileLink.textContent = link;

  // Follower count display from Supabase follows table
  const followersInline = document.getElementById("profileFollowersInline");
  if (followersInline) {
    followersInline.textContent = "0 followers";
    if (supabase) {
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)
        .then(({ count, error }) => {
          if (!error && count !== null) {
            followersInline.textContent = `${count} followers`;
          } else {
            followersInline.textContent = "0 followers";
          }
        })
        .catch(() => {
          followersInline.textContent = "0 followers";
        });
    }
  }

  renderOtherUserPillActions(userId, username);
  renderProfileGrid();
}

function setBottomNavVisible(visible) {
  const bottomNav = document.getElementById("bottomNavBar");
  if (bottomNav) {
    if (visible) {
      bottomNav.style.display = "";
      bottomNav.classList.remove("nav-hidden", "translate-y-full", "opacity-0");
      bottomNav.classList.add("translate-y-0");
    } else {
      bottomNav.style.display = "none";
      bottomNav.classList.add("nav-hidden", "translate-y-full", "opacity-0");
      bottomNav.classList.remove("translate-y-0");
    }
  }
}
window.setBottomNavVisible = setBottomNavVisible;

function openProfile(userId, fallbackUsername, fallbackAvatar) {
  const currentUserId = getCurrentUserId();
  const currentNav = (typeof activeNavId !== "undefined" && activeNavId) || (typeof window !== "undefined" && window.activeNavId) || "home";

  if (userId === "shabnam_ai") {
    previousScreenBeforeProfile = currentNav;
    viewingProfileUserId = "shabnam_ai";
    viewingOtherUserObj = null;
    if (typeof window !== "undefined") {
      window.viewingProfileUserId = viewingProfileUserId;
      window.previousScreenBeforeProfile = previousScreenBeforeProfile;
    }
    try {
      window.history.pushState({ profile: "shabnam_ai", from: previousScreenBeforeProfile }, "", "/profile/shabnam_ai");
    } catch (_) {}
    
    if (typeof switchTab === "function") {
      switchTab("profile");
    } else if (typeof window !== "undefined" && typeof window.switchTab === "function") {
      window.switchTab("profile");
    }

    // Completely HIDE the bottom navigation bar for other user profile view
    setBottomNavVisible(false);
    
    const profileBackBtn = document.getElementById("profileBackBtn");
    if (profileBackBtn) profileBackBtn.style.display = "inline-flex";
    const profileHeaderChevron = document.getElementById("profileHeaderChevron");
    if (profileHeaderChevron) profileHeaderChevron.style.display = "none";
    const profileHeaderActions = document.getElementById("profileHeaderActions");
    if (profileHeaderActions) profileHeaderActions.style.display = "none";
    
    const headerUsername = document.getElementById("profileHeaderUsername");
    if (headerUsername) headerUsername.textContent = SHABNAM_AI_PROFILE.username;
    const mainAvatar = document.getElementById("mainProfileAvatarImg");
    if (mainAvatar) mainAvatar.src = SHABNAM_AI_PROFILE.avatar;
    const profileDisplay = document.getElementById("profileDisplayName");
    if (profileDisplay) profileDisplay.textContent = SHABNAM_AI_PROFILE.name;
    const verifiedBadge = document.getElementById("profileVerifiedBadge");
    if (verifiedBadge) verifiedBadge.style.display = "inline-flex";
    const profileHandle = document.getElementById("profileHandleText");
    if (profileHandle) profileHandle.textContent = SHABNAM_AI_PROFILE.handle;
    const profileCategory = document.getElementById("profileCategoryTag");
    if (profileCategory) profileCategory.textContent = SHABNAM_AI_PROFILE.category;
    const profileBio = document.getElementById("profileBioText");
    if (profileBio) profileBio.textContent = SHABNAM_AI_PROFILE.bio;
    const profileLink = document.getElementById("profileBioLinkText");
    if (profileLink) profileLink.textContent = SHABNAM_AI_PROFILE.link;

    const followersInline = document.getElementById("profileFollowersInline");
    if (followersInline) followersInline.textContent = `${SHABNAM_AI_PROFILE.followersCount} followers`;
    const postsInline = document.getElementById("profilePostsInline");
    if (postsInline) postsInline.innerHTML = `<span>1</span> post`;

    const pillBtn = document.getElementById("profilePrimaryPillBtn");
    if (pillBtn) {
      if (isFollowingShabnam()) {
        pillBtn.textContent = "Message";
        pillBtn.className = "yt-full-pill-btn";
      } else {
        pillBtn.textContent = "Follow";
        pillBtn.className = "yt-full-pill-btn yt-follow-btn";
      }
    }

    renderProfileGrid();
  } else if (userId && String(userId) !== String(currentUserId)) {
    // Other Creator Profile View: Hide bottom navbar and show back button
    previousScreenBeforeProfile = currentNav;
    viewingProfileUserId = String(userId);
    if (typeof window !== "undefined") {
      window.viewingProfileUserId = viewingProfileUserId;
      window.previousScreenBeforeProfile = previousScreenBeforeProfile;
    }

    if (typeof switchTab === "function") {
      switchTab("profile");
    }

    // Completely HIDE the bottom navigation bar for other user profile view
    setBottomNavVisible(false);

    const profileBackBtn = document.getElementById("profileBackBtn");
    if (profileBackBtn) profileBackBtn.style.display = "inline-flex";
    const profileHeaderChevron = document.getElementById("profileHeaderChevron");
    if (profileHeaderChevron) profileHeaderChevron.style.display = "none";
    const profileHeaderActions = document.getElementById("profileHeaderActions");
    if (profileHeaderActions) profileHeaderActions.style.display = "none";

    loadAndRenderOtherUserProfile(userId, fallbackUsername, fallbackAvatar);
  } else {
    // Current User's Own Profile: Keep bottom navigation bar visible
    closeUserProfile();
    setBottomNavVisible(true);
    syncCurrentLoggedInUserProfile();
    if (typeof switchTab === "function") {
      switchTab("profile");
    } else if (typeof window !== "undefined" && typeof window.switchTab === "function") {
      window.switchTab("profile");
    }
  }
}
window.openProfile = openProfile;
if (typeof window !== "undefined") {
  window.__realOpenProfile = openProfile;
  if (window.__pendingProfileTarget) {
    const pending = window.__pendingProfileTarget;
    window.__pendingProfileTarget = null;
    setTimeout(() => {
      openProfile(pending.userId, pending.fallbackUsername, pending.fallbackAvatar);
    }, 50);
  }
}

export async function syncCurrentLoggedInUserProfile() {
  let currentAuthUser = null;
  if (supabase && supabase.auth) {
    try {
      const { data } = await supabase.auth.getUser();
      currentAuthUser = data?.user || null;
    } catch (_) {}
    if (!currentAuthUser) {
      try {
        const { data: sessData } = await supabase.auth.getSession();
        currentAuthUser = sessData?.session?.user || null;
      } catch (_) {}
    }
  }

  const currentUserId = currentAuthUser?.id || (typeof getCurrentUserId === "function" ? getCurrentUserId() : null);
  if (!currentUserId || !supabase) return;

  // Requirement 2: Load Authoritative Profile from Supabase on Mount (Fix Refresh Wipeout)
  let profileData = null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUserId)
      .single();

    if (!error && data) {
      profileData = data;
    } else {
      const { data: maybeData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .maybeSingle();
      if (maybeData) {
        profileData = maybeData;
      } else if (currentAuthUser?.email) {
        const { data: emailData } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', currentAuthUser.email)
          .maybeSingle();
        if (emailData) profileData = emailData;
      }
    }
  } catch (e) {
    console.warn("Notice querying profileData from Supabase on mount:", e);
  }

  const cleanAvatarFallback = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400";

  // Bind state directly to profileData.username, profileData.full_name, and profileData.avatar_url
  const finalUsername = profileData?.username || profileData?.display_name || UserProfileStore.state.username || (currentAuthUser?.email ? currentAuthUser.email.split('@')[0] : 'creator');
  const finalFullName = profileData?.full_name || profileData?.display_name || finalUsername;
  const finalAvatarUrl = (profileData?.avatar_url && profileData.avatar_url.trim()) ? profileData.avatar_url : cleanAvatarFallback;
  const finalBio = profileData?.bio !== undefined ? profileData.bio : (UserProfileStore.state.bio || "");
  const finalLink = profileData?.website || profileData?.link || `flashgram.me/${finalUsername}`;

  UserProfileStore.setState({
    username: finalUsername,
    name: finalFullName,
    avatar: finalAvatarUrl,
    email: currentAuthUser?.email || profileData?.email || UserProfileStore.state.email || "",
    bio: finalBio,
    link: finalLink,
    website: finalLink
  });

  // Force DOM sync strictly with currently logged-in user's database entry
  UserProfileStore.syncDOM();

  const headerUsername = document.getElementById("profileHeaderUsername");
  if (headerUsername) headerUsername.textContent = finalUsername;

  const profileDisplay = document.getElementById("profileDisplayName");
  if (profileDisplay) profileDisplay.textContent = finalFullName;

  const profileHandle = document.getElementById("profileHandleText");
  if (profileHandle) profileHandle.textContent = `@${finalUsername}`;

  // Set the avatar <img> source to profileData.avatar_url with an onError fallback to a clean avatar icon if the image URL is empty
  const profileAvatar = document.getElementById("mainProfileAvatarImg");
  if (profileAvatar) {
    profileAvatar.onerror = function() {
      this.onerror = null;
      this.src = cleanAvatarFallback;
    };
    profileAvatar.src = finalAvatarUrl;
  }

  const profileBio = document.getElementById("profileBioText");
  if (profileBio) profileBio.textContent = finalBio;

  const profileLink = document.getElementById("profileBioLinkText");
  if (profileLink) profileLink.textContent = finalLink;

  // Verified checkmark badge: active exclusively on verified profile entries
  const verifiedBadge = document.getElementById("profileVerifiedBadge");
  if (verifiedBadge) {
    const isVerified = Boolean(profileData?.is_verified || finalUsername === "sohelmommy_077" || (profileData?.email && profileData.email.includes("sohelmommy")));
    verifiedBadge.style.display = isVerified ? "inline-flex" : "none";
  }

  // Update dynamic follower & post counts
  await updateProfilePostsCount();
  await renderProfileGrid();
}
window.syncCurrentLoggedInUserProfile = syncCurrentLoggedInUserProfile;

function handleProfileBack() {
  const prev = previousScreenBeforeProfile;
  closeUserProfile();
  setBottomNavVisible(true);
  const target = (prev && prev !== "profile") ? prev : "home";
  if (typeof switchTab === "function") {
    switchTab(target);
  } else if (typeof window !== "undefined" && typeof window.switchTab === "function") {
    window.switchTab(target);
  }
  try {
    if (window.history.state && window.history.state.profile === "shabnam_ai") {
      window.history.back();
    }
  } catch (_) {}
}
window.handleProfileBack = handleProfileBack;

function closeUserProfile() {
  viewingProfileUserId = null;
  viewingOtherUserObj = null;
  if (typeof window !== "undefined") {
    window.viewingProfileUserId = null;
  }
  setBottomNavVisible(true);
  const profileBackBtn = document.getElementById("profileBackBtn");
  if (profileBackBtn) profileBackBtn.style.display = "none";
  const profileHeaderChevron = document.getElementById("profileHeaderChevron");
  if (profileHeaderChevron) profileHeaderChevron.style.display = "inline-block";
  const profileHeaderActions = document.getElementById("profileHeaderActions");
  if (profileHeaderActions) profileHeaderActions.style.display = "flex";

  const container = document.getElementById("profilePillActionContainer");
  if (container) {
    container.innerHTML = `
      <button type="button" class="yt-full-pill-btn" id="profilePrimaryPillBtn" onclick="handleProfilePrimaryPillAction()">
        Edit profile
      </button>
      <button type="button" id="editProfileBtn" style="display:none;" onclick="if (typeof openEditProfileScreen === 'function') openEditProfileScreen();"></button>
    `;
  }

  syncCurrentLoggedInUserProfile();
}
window.closeUserProfile = closeUserProfile;

window.addEventListener("popstate", (e) => {
  if (e.state && e.state.profile === "shabnam_ai") {
    openProfile("shabnam_ai");
  } else if (viewingProfileUserId === "shabnam_ai") {
    closeUserProfile();
    const target = (previousScreenBeforeProfile && previousScreenBeforeProfile !== "profile") ? previousScreenBeforeProfile : "home";
    if (typeof switchTab === "function") {
      switchTab(target);
    } else if (typeof window !== "undefined" && typeof window.switchTab === "function") {
      window.switchTab(target);
    }
  }
});



    /* =======================================================
       ৩.১ প্রোফাইল গ্রিড ও ট্যাব কন্ট্রোলার
    ======================================================= */
    let currentProfileTab = "grid";

    async function updateProfilePostsCount(explicitPostCount) {
      const postsCountEl = document.getElementById("profilePostsCount");
      const postsInlineEl = document.getElementById("profilePostsInline");
      const followersInlineEl = document.getElementById("profileFollowersInline");
      const followersCountEl = document.getElementById("profileFollowersCount");
      const followingCountEl = document.getElementById("profileFollowingCount");

      if (viewingProfileUserId === "shabnam_ai") {
        if (postsCountEl) postsCountEl.textContent = "1";
        if (postsInlineEl) postsInlineEl.innerHTML = `<span>1</span> post`;
        if (followersInlineEl) followersInlineEl.textContent = `${SHABNAM_AI_PROFILE.followersCount} followers`;
        return;
      }

      const activeUid = viewingProfileUserId || getCurrentUserId();
      if (!activeUid) return;

      // 1. Live Post Count (Requirement 3: prevent hardcoded post mismatch)
      let postCount = 0;
      if (typeof explicitPostCount === "number") {
        postCount = explicitPostCount;
      } else if (supabase) {
        try {
          const { count, error } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', activeUid);

          if (!error && count !== null) {
            postCount = count;
          }
        } catch (e) {
          console.warn("Notice querying post count:", e);
        }
      }

      if (postsCountEl) postsCountEl.textContent = String(postCount);
      if (postsInlineEl) postsInlineEl.innerHTML = `<span id="profilePostsCount">${postCount}</span> posts`;

      // 2. Live Follower Count from 'follows' table (Requirement 3: dynamic count)
      let followerCount = 0;
      if (supabase) {
        try {
          const { count, error } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', activeUid);

          if (!error && count !== null) {
            followerCount = count;
          }
        } catch (e) {
          console.warn("Notice querying followers count:", e);
        }
      }

      if (followersInlineEl) followersInlineEl.textContent = `${followerCount} followers`;
      if (followersCountEl) followersCountEl.textContent = String(followerCount);

      // 3. Live Following Count
      let followingCount = 0;
      if (supabase) {
        try {
          const { count, error } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', activeUid);

          if (!error && count !== null) {
            followingCount = count;
          } else {
            followingCount = UserProfileStore.getFollowingCount();
          }
        } catch (_) {
          followingCount = UserProfileStore.getFollowingCount();
        }
      } else {
        followingCount = UserProfileStore.getFollowingCount();
      }

      if (followingCountEl) followingCountEl.textContent = String(followingCount);
    }
    window.updateProfilePostsCount = updateProfilePostsCount;

    function switchProfileTab(tab) {
      currentProfileTab = tab;
      const tabGridBtn = document.getElementById("tabGridBtn");
      const tabReelsBtn = document.getElementById("tabReelsBtn");
      const tabTaggedBtn = document.getElementById("tabTaggedBtn");
      if (tabGridBtn) tabGridBtn.classList.toggle("active", tab === "grid");
      if (tabReelsBtn) tabReelsBtn.classList.toggle("active", tab === "reels");
      if (tabTaggedBtn) tabTaggedBtn.classList.toggle("active", tab === "tagged" || tab === "reposts");
      renderProfileGrid();
    }
    window.switchProfileTab = switchProfileTab;

    async function renderProfileGrid() {
      const container = document.getElementById("profileGridContainer");
      if (!container) return;
      container.innerHTML = "";

      if (viewingProfileUserId === "shabnam_ai") {
        if (currentProfileTab === "tagged" || currentProfileTab === "reposts") {
          container.style.display = "block";
          container.innerHTML = `
            <div style="padding: 48px 24px; text-align: center; color: #8e8e8e;">
              <div style="width: 62px; height: 62px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; opacity: 0.85;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4.5 12a7.5 7.5 0 0 1 13.9-3.8M19 4v4.5h-4.5"></path>
                  <path d="M19.5 12a7.5 7.5 0 0 1-13.9 3.8M5 20v-4.5h4.5"></path>
                </svg>
              </div>
              <div style="font-weight: 700; font-size: 17px; color: currentColor; margin-bottom: 6px;">No Reposts Yet</div>
              <div style="font-size: 13.5px; opacity: 0.75; max-width: 260px; margin: 0 auto; line-height: 1.4;">Posts reposted by Shabnam AI will appear here.</div>
            </div>
          `;
          return;
        }

        container.style.display = "grid";
        const el = document.createElement("div");
        el.className = "profile-grid-item";
        el.innerHTML = `
          <video src="${getOptimizedVideoUrl(SHABNAM_AI_PROFILE.videoUrl)}" poster="${SHABNAM_AI_PROFILE.avatar}" style="width:100%; height:100%; object-fit:cover;" muted preload="metadata" playsinline></video>
          <div class="profile-grid-badge"><i class="fa-solid fa-play"></i></div>
          <div class="profile-grid-overlay">
            <span><i class="fa-solid fa-heart"></i> 142K</span>
          </div>
        `;
        el.onclick = () => {
          if (typeof navigateToReel === "function") {
            navigateToReel("shabnam_reel_1", SHABNAM_AI_PROFILE.videoUrl);
          } else if (typeof playShabnamReelVideo === "function") {
            playShabnamReelVideo();
          } else if (typeof window !== "undefined" && typeof window.playShabnamReelVideo === "function") {
            window.playShabnamReelVideo();
          }
        };
        container.appendChild(el);
        return;
      }

      try {
        let userPosts = [];
        const activeUid = viewingProfileUserId || getCurrentUserId();

        // Requirement 4: Isolate uploaded posts strictly by user_id
        if (supabase && activeUid) {
          const { data, count, error } = await supabase
            .from('posts')
            .select('*', { count: 'exact' })
            .eq('user_id', activeUid)
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            userPosts = data;
          }
        }
        updateProfilePostsCount(userPosts.length);
        renderProfileGridItems(userPosts);
      } catch (e) {
        console.warn("renderProfileGrid error:", e);
        updateProfilePostsCount(0);
        renderProfileGridItems([]);
      }
    }
    window.renderProfileGrid = renderProfileGrid;

    function renderProfileGridItems(userPosts = []) {
      const container = document.getElementById("profileGridContainer");
      if (!container) return;
      container.innerHTML = "";

      const userGridItems = userPosts.map((p, idx) => {
        const rawVidSrc = p.video_url || p.url || (p.blob ? URL.createObjectURL(p.blob) : '');
        const vidSrc = getOptimizedVideoUrl(rawVidSrc);
        const posterUrl = p.thumbnail_url || (rawVidSrc ? deriveCloudinaryThumbnailUrl(rawVidSrc) : '');
        return {
          id: String(p.id || idx),
          type: 'video',
          isLocal: false,
          videoSrc: vidSrc,
          poster: posterUrl,
          badge: '<i class="fa-solid fa-play"></i>',
          likes: p.likes_count ? String(p.likes_count) : '0',
          views: '1'
        };
      });

      if (currentProfileTab === "grid") {
        if (userGridItems.length === 0) {
          container.style.display = "block";
          container.innerHTML = `
            <div style="padding: 48px 24px; text-align: center; color: #8e8e8e;">
              <div style="width: 62px; height: 62px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; opacity: 0.85;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3.5"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                  <line x1="15" y1="3" x2="15" y2="21"></line>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                </svg>
              </div>
              <div style="font-weight: 700; font-size: 17px; color: currentColor; margin-bottom: 6px;">Share Photos & Videos</div>
              <div style="font-size: 13.5px; opacity: 0.75; max-width: 260px; margin: 0 auto; line-height: 1.4;">When you share photos and videos, they will appear on your profile.</div>
              <button onclick="openMediaCreationPrompt()" style="margin-top: 16px; color: #0095f6; font-size: 14px; font-weight: 600; background: none; border: none; cursor: pointer;">Share your first post</button>
            </div>
          `;
          return;
        }

        container.style.display = "grid";
        userGridItems.forEach((item, idx) => {
          const el = document.createElement("div");
          el.className = "profile-grid-item";
          el.innerHTML = `
            <video src="${item.videoSrc}" poster="${item.poster || ''}" style="width:100%; height:100%; object-fit:cover;" muted preload="metadata" playsinline></video>
            <div class="profile-grid-badge"><i class="fa-solid fa-play"></i></div>
            <div class="profile-grid-overlay">
              <span><i class="fa-solid fa-heart"></i> ${item.likes}</span>
            </div>
          `;
          el.onclick = () => {
            if (typeof navigateToReel === "function") {
              navigateToReel(item.id, item.videoSrc);
            } else if (typeof window !== "undefined" && typeof window.navigateToReel === "function") {
              window.navigateToReel(item.id, item.videoSrc);
            } else {
              const reelsBtn = document.querySelector('.nav-btn[data-id="reels"]');
              if (typeof switchTab === "function") {
                switchTab("reels", reelsBtn);
              }
            }
          };
          container.appendChild(el);
        });
      } else if (currentProfileTab === "reels") {
        if (userGridItems.length === 0) {
          container.style.display = "block";
          container.innerHTML = `
            <div style="padding: 48px 24px; text-align: center; color: #8e8e8e;">
              <div style="width: 62px; height: 62px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; opacity: 0.85;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6.5 4.5A1 1 0 0 1 8 3.65l11.5 6.85a1 1 0 0 1 0 1.72L8 19.07a1 1 0 0 1-1.5-.86V4.5z"></path>
                </svg>
              </div>
              <div style="font-weight: 700; font-size: 17px; color: currentColor; margin-bottom: 6px;">Capture and Share Reels</div>
              <div style="font-size: 13.5px; opacity: 0.75; max-width: 260px; margin: 0 auto; line-height: 1.4;">Create short, fun videos and share them with the world.</div>
              <button onclick="openMediaCreationPrompt()" style="margin-top: 16px; color: #0095f6; font-size: 14px; font-weight: 600; background: none; border: none; cursor: pointer;">Record your first reel</button>
            </div>
          `;
          return;
        }

        container.style.display = "grid";
        userGridItems.forEach((item) => {
          const el = document.createElement("div");
          el.className = "profile-grid-item";
          el.innerHTML = `
            <video src="${item.videoSrc}" poster="${item.poster || ''}" style="width:100%; height:100%; object-fit:cover;" muted preload="metadata" playsinline></video>
            <div class="profile-grid-badge"><i class="fa-solid fa-play"></i></div>
            <div class="profile-grid-overlay">
              <span><i class="fa-solid fa-play" style="font-size: 11px;"></i> ${item.views}</span>
            </div>
          `;
          el.onclick = () => {
            if (typeof navigateToReel === "function") {
              navigateToReel(item.id, item.videoSrc);
            } else if (typeof window !== "undefined" && typeof window.navigateToReel === "function") {
              window.navigateToReel(item.id, item.videoSrc);
            } else {
              const reelsBtn = document.querySelector('.nav-btn[data-id="reels"]');
              if (typeof switchTab === "function") {
                switchTab("reels", reelsBtn);
              }
            }
          };
          container.appendChild(el);
        });
      } else if (currentProfileTab === "tagged" || currentProfileTab === "reposts") {
        container.style.display = "block";
        container.innerHTML = `
          <div style="padding: 48px 24px; text-align: center; color: #8e8e8e;">
            <div style="width: 62px; height: 62px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; opacity: 0.85;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.5 12a7.5 7.5 0 0 1 13.9-3.8M19 4v4.5h-4.5"></path>
                <path d="M19.5 12a7.5 7.5 0 0 1-13.9 3.8M5 20v-4.5h4.5"></path>
              </svg>
            </div>
            <div style="font-weight: 700; font-size: 17px; color: currentColor; margin-bottom: 6px;">No Reposts Yet</div>
            <div style="font-size: 13.5px; opacity: 0.75; max-width: 260px; margin: 0 auto; line-height: 1.4;">Posts and reels you repost will appear here.</div>
          </div>
        `;
      }
    }



    /* =======================================================
       ৩.৫ প্রোফাইল অ্যাভাটার ড্র্যাগ ফিজিক্স, স্প্রিং এবং ভিউয়ার
    ======================================================= */
    function initProfileInteractions() {
      const profileAvatarDrag = document.getElementById("profileAvatarDrag");
      const mainProfileAvatarImg = document.getElementById("mainProfileAvatarImg");
      const avatarViewerModal = document.getElementById("avatarViewerModal");
      const avatarViewerBackdrop = document.getElementById("avatarViewerBackdrop");
      const avatarViewerCloseBtn = document.getElementById("avatarViewerCloseBtn");
      const avatarViewerActionBtn = document.getElementById("avatarViewerActionBtn");
      const avatarViewerImg = document.getElementById("avatarViewerImg");
      const avatarViewerFrame = document.getElementById("avatarViewerFrame");
      const viewerUsername = document.getElementById("viewerUsername");
      const viewerDownloadBtn = document.getElementById("viewerDownloadBtn");
      const viewerShareBtn = document.getElementById("viewerShareBtn");

      const btnQuickSetPhoto = document.getElementById("btnQuickSetPhoto");
      const btnQuickEditInfo = document.getElementById("btnQuickEditInfo");
      const btnQuickSettings = document.getElementById("btnQuickSettings");
      const profileAvatarFileInput = document.getElementById("profileAvatarFileInput");

      // Edit Profile Screen Elements
      const editProfileScreen = document.getElementById("editProfileScreen");
      const editProfileCancelBtn = document.getElementById("editProfileCancelBtn");
      const editProfileDoneBtn = document.getElementById("editProfileDoneBtn");
      const editProfileAvatarPreview = document.getElementById("editProfileAvatarPreview");
      const editAvatarPreviewBox = document.getElementById("editAvatarPreviewBox");
      const btnEditPictureOrAvatar = document.getElementById("btnEditPictureOrAvatar");
      const inputEditFirstName = document.getElementById("inputEditFirstName");
      const inputEditLastName = document.getElementById("inputEditLastName");
      const inputEditName = document.getElementById("inputEditName");
      const inputEditUsername = document.getElementById("inputEditUsername");
      const inputEditBio = document.getElementById("inputEditBio");
      const editBioInlineCounter = document.getElementById("editBioInlineCounter");
      const inputEditPronouns = document.getElementById("inputEditPronouns");
      const editProfileBioRow = document.getElementById("editProfileBioRow");
      const editBioPreviewSnippet = document.getElementById("editBioPreviewSnippet");
      const editProfileLinksRow = document.getElementById("editProfileLinksRow");
      const editLinksPreviewSnippet = document.getElementById("editLinksPreviewSnippet");
      const editProfileBtn = document.getElementById("editProfileBtn");

      function splitFullName(fullName) {
        const trimmed = (fullName || "").trim();
        if (!trimmed) return { first: "", last: "" };
        const parts = trimmed.split(/\s+/);
        const first = parts[0] || "";
        const last = parts.slice(1).join(" ") || "";
        return { first, last };
      }

      function updateInlineBioCharCount() {
        if (!inputEditBio) return;
        const count = inputEditBio.value.length;
        if (editBioInlineCounter) {
          editBioInlineCounter.textContent = `${count} / 150`;
          editBioInlineCounter.style.color = count >= 140 ? "#f43f5e" : "#71717a";
        }
      }
      if (inputEditBio) {
        inputEditBio.addEventListener("input", () => {
          updateInlineBioCharCount();
          currentEditingBio = inputEditBio.value;
          if (bioDedicatedTextarea) bioDedicatedTextarea.value = inputEditBio.value;
        });
      }

      // Dedicated Bio Editing Screen Elements
      const bioEditingScreen = document.getElementById("bioEditingScreen");
      const bioEditingCancelBtn = document.getElementById("bioEditingCancelBtn");
      const bioEditingDoneBtn = document.getElementById("bioEditingDoneBtn");
      const bioDedicatedTextarea = document.getElementById("bioDedicatedTextarea");
      const bioCharCounter = document.getElementById("bioCharCounter");

      // Links Modal Elements
      const linksModalOverlay = document.getElementById("linksModalOverlay");
      const closeLinksBtn = document.getElementById("closeLinksBtn");
      const inputLinksUrl = document.getElementById("inputLinksUrl");
      const inputLinksTitle = document.getElementById("inputLinksTitle");
      const saveLinksBtn = document.getElementById("saveLinksBtn");
      const profileBioLink = document.getElementById("profileBioLink");
      const profileBioLinkText = document.getElementById("profileBioLinkText");

      // Interactive Image Pinch-to-Zoom & Crop Modal Elements
      const imageCropModal = document.getElementById("imageCropModal");
      const cropModalCancelBtn = document.getElementById("cropModalCancelBtn");
      const cropModalDoneBtn = document.getElementById("cropModalDoneBtn");
      const cropStageContainer = document.getElementById("cropStageContainer");
      const cropImageLayer = document.getElementById("cropImageLayer");
      const cropTargetImg = document.getElementById("cropTargetImg");
      const cropCircularMask = document.getElementById("cropCircularMask");
      const cropZoomSlider = document.getElementById("cropZoomSlider");

      const profileDisplayName = document.getElementById("profileDisplayName");
      const profileHeaderUsername = document.getElementById("profileHeaderUsername");
      const profileCategoryTag = document.getElementById("profileCategoryTag");
      const profileBioText = document.getElementById("profileBioText");

      let currentEditingBio = null;
      let currentLinkUrl = UserProfileStore.state.link || "flashgram.me";

      // Requirement 2: Load Authoritative Profile from Supabase on Mount (Fix Refresh Wipeout)
      // Never load static mock state or overwrite with placeholders
      syncCurrentLoggedInUserProfile().catch(err => {
        console.warn("Initial syncCurrentLoggedInUserProfile notice:", err);
      });

      if (!profileAvatarDrag) return;

      // ২. ড্র্যাগ এবং ইলাস্টিক স্প্রিং ফিজিক্স (Framer Motion: stiffness 300, damping 20)
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let startTime = 0;
      let currentX = 0;
      let currentY = 0;
      let lastX = 0;
      let lastY = 0;
      let lastTime = 0;
      let velocityX = 0;
      let velocityY = 0;
      let hasMoved = false;
      let springAnimId = null;

      function cancelSpring() {
        if (springAnimId) {
          cancelAnimationFrame(springAnimId);
          springAnimId = null;
        }
      }

      // Spring Solver: Analytic solution to m * x'' + c * x' + k * x = 0
      // stiffness (k) = 300, damping (c) = 20, mass (m) = 1
      function runFramerSpring(initX, initY, initVx, initVy) {
        cancelSpring();
        const k = 300;
        const c = 20;
        const m = 1;

        // Clamp velocities
        const vx0 = Math.max(-1000, Math.min(1000, initVx || 0));
        const vy0 = Math.max(-1000, Math.min(1000, initVy || 0));

        const omega0 = Math.sqrt(k / m); // ~17.32
        const zeta = c / (2 * Math.sqrt(k * m)); // ~0.577 (underdamped harmonic oscillation)
        const omegaD = omega0 * Math.sqrt(1 - zeta * zeta); // ~14.14 rad/s

        const startTimeSpring = performance.now();

        function tickSpring(now) {
          const t = (now - startTimeSpring) / 1000; // in seconds
          const decay = Math.exp(-zeta * omega0 * t);

          const cosVal = Math.cos(omegaD * t);
          const sinVal = Math.sin(omegaD * t);

          const coeffX = (vx0 + zeta * omega0 * initX) / omegaD;
          const coeffY = (vy0 + zeta * omega0 * initY) / omegaD;

          const x = decay * (initX * cosVal + coeffX * sinVal);
          const y = decay * (initY * cosVal + coeffY * sinVal);

          const dist = Math.hypot(x, y);
          const scale = 1 + dist * 0.0006;
          const tilt = x * 0.04;

          profileAvatarDrag.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(3)}) rotate(${tilt.toFixed(2)}deg)`;

          // Terminate when oscillations settle below threshold
          if (decay < 0.004 || (dist < 0.25 && t > 0.3)) {
            profileAvatarDrag.style.transform = "translate3d(0, 0, 0) scale(1) rotate(0deg)";
            springAnimId = null;
            return;
          }

          springAnimId = requestAnimationFrame(tickSpring);
        }

        springAnimId = requestAnimationFrame(tickSpring);
      }

      profileAvatarDrag.addEventListener("pointerdown", (e) => {
        // Only primary pointer
        if (e.button && e.button !== 0) return;
        cancelSpring();

        isDragging = true;
        hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        startTime = performance.now();
        lastTime = startTime;
        lastX = 0;
        lastY = 0;
        currentX = 0;
        currentY = 0;
        velocityX = 0;
        velocityY = 0;

        profileAvatarDrag.classList.add("is-dragging");
        try {
          profileAvatarDrag.setPointerCapture(e.pointerId);
        } catch (_) {}
      });

      profileAvatarDrag.addEventListener("pointermove", (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const rawDist = Math.hypot(deltaX, deltaY);

        if (rawDist > 5) {
          hasMoved = true;
        }

        // Rubber-band stretch resistance effect
        const maxStretch = 85;
        const stretchDist = (rawDist * maxStretch) / (rawDist + maxStretch) * 0.85;
        const angle = Math.atan2(deltaY, deltaX);

        currentX = stretchDist * Math.cos(angle);
        currentY = stretchDist * Math.sin(angle);

        const now = performance.now();
        const dt = (now - lastTime) / 1000;
        if (dt > 0.008) {
          velocityX = (currentX - lastX) / dt;
          velocityY = (currentY - lastY) / dt;
          lastX = currentX;
          lastY = currentY;
          lastTime = now;
        }

        const scale = 1 + stretchDist * 0.0009;
        const tilt = currentX * 0.045;
        profileAvatarDrag.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) scale(${scale.toFixed(3)}) rotate(${tilt.toFixed(2)}deg)`;
      });

      function handleDragEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        profileAvatarDrag.classList.remove("is-dragging");

        try {
          profileAvatarDrag.releasePointerCapture(e.pointerId);
        } catch (_) {}

        const elapsed = performance.now() - startTime;
        const totalDist = Math.hypot(e.clientX - startX, e.clientY - startY);

        // Tap Detection: If not dragged and released quickly, expand to full-screen viewer
        if (!hasMoved && totalDist < 8 && elapsed < 320) {
          profileAvatarDrag.style.transform = "translate3d(0, 0, 0) scale(1) rotate(0deg)";
          openAvatarViewerModal();
          return;
        }

        // Rubber-band release: spring back cleanly into its resting position with fluid spring physics
        runFramerSpring(currentX, currentY, velocityX, velocityY);
      }

      profileAvatarDrag.addEventListener("pointerup", handleDragEnd);
      profileAvatarDrag.addEventListener("pointercancel", handleDragEnd);

      // ৩. এক্সপ্যান্ডেড ফুলস্ক্রিন অ্যাভাটার ভিউয়ার
      function openAvatarViewerModal() {
        if (!avatarViewerModal || !avatarViewerFrame) return;

        // Bounding rect for smooth zoom origin
        const avatarRect = profileAvatarDrag.getBoundingClientRect();
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        const avatarCenterX = avatarRect.left + avatarRect.width / 2;
        const avatarCenterY = avatarRect.top + avatarRect.height / 2;
        const screenCenterX = screenW / 2;
        const screenCenterY = screenH / 2;

        const deltaX = avatarCenterX - screenCenterX;
        const deltaY = avatarCenterY - screenCenterY;
        const targetFrameSize = Math.min(screenW * 0.82, 290);
        const initialScale = Math.max(0.2, avatarRect.width / targetFrameSize);

        // Ensure current image is synced
        if (avatarViewerImg && mainProfileAvatarImg) {
          avatarViewerImg.src = mainProfileAvatarImg.src;
        }

        avatarViewerModal.classList.add("active");
        avatarViewerModal.setAttribute("aria-hidden", "false");

        // Start from avatar coordinates
        avatarViewerFrame.style.transition = "none";
        avatarViewerFrame.style.transform = `translate3d(${deltaX.toFixed(1)}px, ${deltaY.toFixed(1)}px, 0) scale(${initialScale.toFixed(3)})`;
        avatarViewerFrame.style.borderRadius = "50%";

        // Trigger reflow
        void avatarViewerFrame.offsetHeight;

        // Smooth zoom/scale spring transition into full-screen view
        requestAnimationFrame(() => {
          avatarViewerModal.classList.add("visible");
          avatarViewerFrame.style.transition = "transform 0.4s cubic-bezier(0.18, 0.92, 0.32, 1.15), border-radius 0.4s ease";
          avatarViewerFrame.style.transform = "translate3d(0, 0, 0) scale(1)";
        });
      }

      function closeAvatarViewerModal() {
        if (!avatarViewerModal || !avatarViewerFrame) return;

        const avatarRect = profileAvatarDrag.getBoundingClientRect();
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;

        const deltaX = (avatarRect.left + avatarRect.width / 2) - screenCenterX;
        const deltaY = (avatarRect.top + avatarRect.height / 2) - screenCenterY;
        const targetFrameSize = Math.min(window.innerWidth * 0.82, 290);
        const targetScale = Math.max(0.2, avatarRect.width / targetFrameSize);

        avatarViewerModal.classList.remove("visible");
        avatarViewerFrame.style.transition = "transform 0.32s cubic-bezier(0.36, 0, 0.66, -0.15), border-radius 0.32s ease";
        avatarViewerFrame.style.transform = `translate3d(${deltaX.toFixed(1)}px, ${deltaY.toFixed(1)}px, 0) scale(${targetScale.toFixed(3)})`;

        setTimeout(() => {
          avatarViewerModal.classList.remove("active");
          avatarViewerModal.setAttribute("aria-hidden", "true");
          avatarViewerFrame.style.transform = "";
          avatarViewerFrame.style.transition = "";
        }, 320);
      }

      if (avatarViewerCloseBtn) avatarViewerCloseBtn.onclick = closeAvatarViewerModal;
      if (avatarViewerBackdrop) avatarViewerBackdrop.onclick = closeAvatarViewerModal;

      // Swipe down in viewer to dismiss
      let viewerStartY = 0;
      let viewerIsDragging = false;
      if (avatarViewerFrame) {
        avatarViewerFrame.addEventListener("pointerdown", (e) => {
          viewerStartY = e.clientY;
          viewerIsDragging = true;
        });
        avatarViewerFrame.addEventListener("pointermove", (e) => {
          if (!viewerIsDragging) return;
          const dy = e.clientY - viewerStartY;
          if (dy > 0) {
            const scale = Math.max(0.75, 1 - dy * 0.001);
            avatarViewerFrame.style.transform = `translate3d(0, ${dy * 0.75}px, 0) scale(${scale})`;
          }
        });
        const onViewerEnd = (e) => {
          if (!viewerIsDragging) return;
          viewerIsDragging = false;
          const dy = e.clientY - viewerStartY;
          if (dy > 100) {
            closeAvatarViewerModal();
          } else {
            avatarViewerFrame.style.transition = "transform 0.25s ease";
            avatarViewerFrame.style.transform = "translate3d(0, 0, 0) scale(1)";
          }
        };
        avatarViewerFrame.addEventListener("pointerup", onViewerEnd);
        avatarViewerFrame.addEventListener("pointercancel", onViewerEnd);
      }
    }

export { viewingProfileUserId, setBottomNavVisible, openProfile, handleProfileBack, closeUserProfile, handleProfilePrimaryPillAction, updateProfilePostsCount, switchProfileTab, renderProfileGrid, renderProfileGridItems, initProfileInteractions };
