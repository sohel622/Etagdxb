// PostOptionsSheet Component (Instagram-Style Three-Dot Options, Contextual Shabnam AI & Report Sub-sheet)
import { showInstagramToast, UserProfileStore } from "../../utils/storage.js";
import { openShabnamChat, sendShabnamMessage } from "../ShabnamAI.js";
import { generateSmartInAppAIResponse } from "../../services/aiService.js";

let activePostData = null;
let activePostElement = null;

function getSavedReelsList() {
  try {
    const list = localStorage.getItem("flashgram_saved_reels");
    return list ? JSON.parse(list) : [];
  } catch (_) {
    return [];
  }
}

function isPostSaved(postId) {
  if (!postId) return false;
  const list = getSavedReelsList();
  return list.includes(String(postId));
}

function toggleSavePost(postId) {
  if (!postId) return false;
  let list = getSavedReelsList();
  const sid = String(postId);
  const exists = list.includes(sid);
  if (exists) {
    list = list.filter(id => id !== sid);
  } else {
    list.push(sid);
  }
  try {
    localStorage.setItem("flashgram_saved_reels", JSON.stringify(list));
  } catch (_) {}
  return !exists;
}

function generatePostSummary(post) {
  if (!post) return "Creative video post on Flashgram ✨";
  const caption = post.caption || "";
  const user = post.user || "creator";
  const id = String(post.id || "");

  if (id === "sample_1" || id.includes("sample_1")) {
    return "Tokyo Shibuya neon night vibes with energetic street culture, vivid lights, and cinematic grading 🌃⚡";
  }
  if (id === "shabnam_reel_1" || user === "shabnam_ai") {
    return "Shabnam AI creative spotlight exploring digital companion features, viral video hooks, and aesthetic vibes ✨🎬";
  }
  if (caption.includes("lifestyle") || id.startsWith("local_")) {
    return "Aesthetic lifestyle video capturing everyday moments, crisp angles, and authentic creators ✨";
  }
  if (caption) {
    return `"${caption}" • Created by @${user} featuring original audio and creative visuals ✨`;
  }
  return `Trending video by @${user} showcasing creative visual pacing and popular audio 🎬`;
}

function resolveVideoThumbnail(post) {
  if (!post) return "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80";
  if (post.thumbnail && typeof post.thumbnail === "string" && !post.thumbnail.endsWith(".mp4") && !post.thumbnail.endsWith(".webm")) {
    return post.thumbnail;
  }
  const id = String(post.id || "");
  const user = String(post.user || "");
  if (id === "sample_1" || id.includes("sample_1")) {
    return "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80";
  }
  if (id === "shabnam_reel_1" || user === "shabnam_ai") {
    return "https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/IMG_20260921_164350.png";
  }
  if (post.avatar && !post.avatar.includes("default")) {
    return post.avatar;
  }
  return "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&auto=format&fit=crop&q=80";
}

function createPostOptionsDOM() {
  let backdrop = document.getElementById("postOptionsSheetBackdrop");
  if (backdrop) return backdrop;

  backdrop = document.createElement("div");
  backdrop.id = "postOptionsSheetBackdrop";
  backdrop.className = "reels-sheet-backdrop post-options-backdrop";
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closePostOptionsSheet();
  };

  backdrop.innerHTML = `
    <div class="post-options-drawer" onclick="event.stopPropagation()">
      <div class="sheet-drag-handle"></div>

      <!-- Views Sliding Track -->
      <div class="post-options-track" id="postOptionsTrack">

        <!-- VIEW 1: MAIN OPTIONS (Clean Match to Reference Image 1) -->
        <div class="post-options-subview active" id="postOptionsViewMain">
          <!-- Contextual Ask Shabnam AI Card -->
          <div class="ask-shabnam-context-card">
            <div class="ask-shabnam-card-header">
              <div class="flex items-center gap-1.5 text-[13px] font-bold text-neutral-900 dark:text-white">
                <span class="text-sky-500"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
                <span id="postOptionsSummaryTitle">About this reel</span>
              </div>
            </div>
            <p class="ask-shabnam-card-summary" id="postOptionsSummaryText">
              Tokyo Shibuya neon night vibes with energetic street culture, vivid lights, and cinematic grading 🌃⚡
            </p>

            <form class="ask-shabnam-input-box" id="askShabnamContextForm" onsubmit="event.preventDefault(); window.submitAskShabnamContext();">
              <span class="text-sky-500 text-[14px] shrink-0 pl-1"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
              <input type="text" id="askShabnamContextInput" class="ask-shabnam-input" placeholder="Ask Shabnam AI..." autocomplete="off" />
              <button type="submit" class="ask-shabnam-send-btn" title="Send question">
                <i class="fa-solid fa-arrow-up text-[12px]"></i>
              </button>
            </form>
          </div>

          <!-- Actions List (Reference Image 1 & 3) -->
          <div class="post-options-actions-list">
            <!-- Save -->
            <button type="button" class="post-options-item" id="postOptionsBtnSave" onclick="window.handlePostOptionsSave()">
              <div class="post-options-item-left">
                <i class="fa-regular fa-bookmark post-options-icon" id="postOptionsSaveIcon"></i>
                <span id="postOptionsSaveLabel">Save</span>
              </div>
            </button>

            <!-- Playback -->
            <button type="button" class="post-options-item" id="postOptionsBtnPlayback" onclick="window.switchPostOptionsSubview('playback')">
              <div class="post-options-item-left">
                <i class="fa-solid fa-gauge-high post-options-icon"></i>
                <span>Playback</span>
              </div>
              <div class="post-options-item-right">
                <span class="text-[12px] text-neutral-400 font-medium" id="postOptionsSpeedCurrent">1.0x</span>
                <i class="fa-solid fa-chevron-right text-[11px] text-neutral-400"></i>
              </div>
            </button>

            <!-- Why you're seeing this post -->
            <button type="button" class="post-options-item" id="postOptionsBtnWhy" onclick="window.switchPostOptionsSubview('why')">
              <div class="post-options-item-left">
                <i class="fa-solid fa-circle-info post-options-icon"></i>
                <span>Why you're seeing this post</span>
              </div>
              <i class="fa-solid fa-chevron-right text-[11px] text-neutral-400"></i>
            </button>

            <!-- Interested -->
            <button type="button" class="post-options-item" id="postOptionsBtnInterested" onclick="window.handlePostOptionsInterested()">
              <div class="post-options-item-left">
                <i class="fa-regular fa-star post-options-icon text-amber-500"></i>
                <span>Interested</span>
              </div>
            </button>

            <!-- Not interested -->
            <button type="button" class="post-options-item" id="postOptionsBtnNotInterested" onclick="window.handlePostOptionsNotInterested()">
              <div class="post-options-item-left">
                <i class="fa-regular fa-eye-slash post-options-icon"></i>
                <span>Not interested</span>
              </div>
            </button>

            <!-- Report (Red Exclamation) -->
            <button type="button" class="post-options-item report-item" id="postOptionsBtnReport" onclick="window.switchPostOptionsSubview('report')">
              <div class="post-options-item-left text-red-500">
                <i class="fa-solid fa-circle-exclamation post-options-icon text-red-500"></i>
                <span class="font-semibold text-red-500">Report</span>
              </div>
              <i class="fa-solid fa-chevron-right text-[11px] text-neutral-400"></i>
            </button>
          </div>
        </div>

        <!-- VIEW 2: PLAYBACK SPEED SUB-VIEW -->
        <div class="post-options-subview" id="postOptionsViewPlayback">
          <div class="subview-header">
            <button type="button" class="subview-back-btn" onclick="window.switchPostOptionsSubview('main')">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <div class="subview-title">Playback speed</div>
            <div class="w-7"></div>
          </div>
          <div class="post-options-actions-list px-2 py-2">
            <button type="button" class="post-options-item speed-opt" data-speed="0.5" onclick="window.applyPlaybackSpeed(0.5)">
              <span>0.5x (Slow)</span>
              <i class="fa-solid fa-check text-sky-500 speed-check" style="display:none;"></i>
            </button>
            <button type="button" class="post-options-item speed-opt" data-speed="1.0" onclick="window.applyPlaybackSpeed(1.0)">
              <span>1.0x (Normal)</span>
              <i class="fa-solid fa-check text-sky-500 speed-check"></i>
            </button>
            <button type="button" class="post-options-item speed-opt" data-speed="1.25" onclick="window.applyPlaybackSpeed(1.25)">
              <span>1.25x</span>
              <i class="fa-solid fa-check text-sky-500 speed-check" style="display:none;"></i>
            </button>
            <button type="button" class="post-options-item speed-opt" data-speed="1.5" onclick="window.applyPlaybackSpeed(1.5)">
              <span>1.5x</span>
              <i class="fa-solid fa-check text-sky-500 speed-check" style="display:none;"></i>
            </button>
            <button type="button" class="post-options-item speed-opt" data-speed="2.0" onclick="window.applyPlaybackSpeed(2.0)">
              <span>2.0x (Fast)</span>
              <i class="fa-solid fa-check text-sky-500 speed-check" style="display:none;"></i>
            </button>
          </div>
        </div>

        <!-- VIEW 3: WHY SEEING THIS POST -->
        <div class="post-options-subview" id="postOptionsViewWhy">
          <div class="subview-header">
            <button type="button" class="subview-back-btn" onclick="window.switchPostOptionsSubview('main')">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <div class="subview-title">Why you're seeing this post</div>
            <div class="w-7"></div>
          </div>
          <div class="p-5 text-sm space-y-4">
            <p class="text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Flashgram customizes your feed and reels using recommendations tailored to your activity:
            </p>
            <div class="space-y-3">
              <div class="flex items-start gap-3">
                <i class="fa-solid fa-eye text-sky-500 mt-1"></i>
                <span class="text-neutral-700 dark:text-neutral-200">You watched or engaged with creative reels in this category.</span>
              </div>
              <div class="flex items-start gap-3">
                <i class="fa-solid fa-music text-purple-500 mt-1"></i>
                <span class="text-neutral-700 dark:text-neutral-200">This post uses trending audio that is popular among people you follow.</span>
              </div>
              <div class="flex items-start gap-3">
                <i class="fa-solid fa-chart-line text-emerald-500 mt-1"></i>
                <span class="text-neutral-700 dark:text-neutral-200">The post has high completion rate and community interest.</span>
              </div>
            </div>
            <button type="button" class="w-full py-2.5 mt-4 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-colors" onclick="window.switchPostOptionsSubview('main')">
              Done
            </button>
          </div>
        </div>

        <!-- VIEW 4: REPORT DRAWER / SUB-SHEET (Reference Image 5) -->
        <div class="post-options-subview" id="postOptionsViewReport">
          <div class="subview-header">
            <button type="button" class="subview-back-btn" onclick="window.switchPostOptionsSubview('main')">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <div class="subview-title font-bold">Report</div>
            <button type="button" class="subview-close-btn" onclick="closePostOptionsSheet()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="px-5 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <div class="font-bold text-[15px] text-neutral-900 dark:text-white">Why are you reporting this post?</div>
            <p class="text-[12px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
              Your report is anonymous, except if you're reporting an intellectual property infringement.
            </p>
          </div>

          <!-- Report Reasons List (Exact Reference Image 5) -->
          <div class="report-reasons-list">
            <button type="button" class="report-reason-item" onclick="window.submitReportReason('Suicide, self-injury or eating disorders')">
              <span>Suicide, self-injury or eating disorders</span>
              <i class="fa-solid fa-chevron-right text-[11px] text-neutral-400"></i>
            </button>
            <button type="button" class="report-reason-item" onclick="window.submitReportReason('False information')">
              <span>False information</span>
              <i class="fa-solid fa-chevron-right text-[11px] text-neutral-400"></i>
            </button>
            <button type="button" class="report-reason-item" onclick="window.submitReportReason('Selling or promoting restricted items')">
              <span>Selling or promoting restricted items</span>
              <i class="fa-solid fa-chevron-right text-[11px] text-neutral-400"></i>
            </button>
            <button type="button" class="report-reason-item" onclick="window.submitReportReason('Nudity or sexual activity')">
              <span>Nudity or sexual activity</span>
              <i class="fa-solid fa-chevron-right text-[11px] text-neutral-400"></i>
            </button>
            <button type="button" class="report-reason-item" onclick="window.submitReportReason('Bullying or unwanted contact')">
              <span>Bullying or unwanted contact</span>
              <i class="fa-solid fa-chevron-right text-[11px] text-neutral-400"></i>
            </button>
            <button type="button" class="report-reason-item" onclick="window.submitReportReason('Violence, hate or exploitation')">
              <span>Violence, hate or exploitation</span>
              <i class="fa-solid fa-chevron-right text-[11px] text-neutral-400"></i>
            </button>
            <button type="button" class="report-reason-item" onclick="window.submitReportReason('Scam, fraud or spam')">
              <span>Scam, fraud or spam</span>
              <i class="fa-solid fa-chevron-right text-[11px] text-neutral-400"></i>
            </button>
            <button type="button" class="report-reason-item" onclick="window.submitReportReason('other')">
              <span>other</span>
              <i class="fa-solid fa-chevron-right text-[11px] text-neutral-400"></i>
            </button>
            <button type="button" class="report-reason-item" onclick="window.submitReportReason('I just don\\'t like it')">
              <span>I just don't like it</span>
              <i class="fa-solid fa-chevron-right text-[11px] text-neutral-400"></i>
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  bindPostOptionsEvents(backdrop);
  return backdrop;
}

function bindPostOptionsEvents(backdrop) {
  // Save button
  const saveBtn = backdrop.querySelector("#postOptionsBtnSave");
  if (saveBtn) {
    saveBtn.onclick = () => {
      handlePostOptionsSave();
    };
  }

  // Playback button
  const playbackBtn = backdrop.querySelector("#postOptionsBtnPlayback");
  if (playbackBtn) {
    playbackBtn.onclick = () => {
      switchPostOptionsSubview("playback");
    };
  }

  // Why seeing button
  const whyBtn = backdrop.querySelector("#postOptionsBtnWhy");
  if (whyBtn) {
    whyBtn.onclick = () => {
      switchPostOptionsSubview("why");
    };
  }

  // Interested button
  const interestedBtn = backdrop.querySelector("#postOptionsBtnInterested");
  if (interestedBtn) {
    interestedBtn.onclick = () => {
      handlePostOptionsInterested();
    };
  }

  // Not interested button
  const notInterestedBtn = backdrop.querySelector("#postOptionsBtnNotInterested");
  if (notInterestedBtn) {
    notInterestedBtn.onclick = () => {
      handlePostOptionsNotInterested();
    };
  }

  // Report button
  const reportBtn = backdrop.querySelector("#postOptionsBtnReport");
  if (reportBtn) {
    reportBtn.onclick = () => {
      switchPostOptionsSubview("report");
    };
  }
}

function updateSaveItemState(isSaved) {
  const icon = document.getElementById("postOptionsSaveIcon");
  const label = document.getElementById("postOptionsSaveLabel");
  if (icon) {
    icon.className = isSaved ? "fa-solid fa-bookmark post-options-icon text-sky-500" : "fa-regular fa-bookmark post-options-icon";
  }
  if (label) {
    label.textContent = isSaved ? "Saved" : "Save";
  }
}

function switchPostOptionsSubview(viewName) {
  const track = document.getElementById("postOptionsTrack");
  if (!track) return;

  const viewMap = {
    main: 0,
    playback: 1,
    why: 2,
    report: 3
  };

  const index = viewMap[viewName] !== undefined ? viewMap[viewName] : 0;
  track.style.transform = `translateX(-${index * 100}%)`;

  const allSubviews = track.querySelectorAll(".post-options-subview");
  allSubviews.forEach((v, i) => {
    v.classList.toggle("active", i === index);
  });
}

function openPostOptionsSheet(postData, postElement = null) {
  activePostData = postData;
  activePostElement = postElement;

  const backdrop = createPostOptionsDOM();

  // Reset to main view
  switchPostOptionsSubview("main");

  // Populate Summary
  const titleEl = backdrop.querySelector("#postOptionsSummaryTitle");
  const summaryEl = backdrop.querySelector("#postOptionsSummaryText");
  const isReel = postData.location || postData.shares !== undefined || postData.comments !== undefined;
  if (titleEl) {
    titleEl.textContent = isReel ? "About this reel" : "About this post";
  }
  if (summaryEl) {
    summaryEl.textContent = generatePostSummary(postData);
  }

  // Clear input
  const input = backdrop.querySelector("#askShabnamContextInput");
  if (input) input.value = "";

  // Check saved state
  if (postData && postData.id) {
    updateSaveItemState(isPostSaved(postData.id));
  }

  // Check current video playback speed
  const activeVideo = findActiveVideo(postData);
  const currentSpeed = activeVideo ? (activeVideo.playbackRate || 1.0) : 1.0;
  const speedLabel = backdrop.querySelector("#postOptionsSpeedCurrent");
  if (speedLabel) speedLabel.textContent = `${currentSpeed}x`;

  const speedChecks = backdrop.querySelectorAll(".speed-opt");
  speedChecks.forEach(opt => {
    const s = parseFloat(opt.dataset.speed || "1.0");
    const check = opt.querySelector(".speed-check");
    if (check) check.style.display = Math.abs(s - currentSpeed) < 0.05 ? "block" : "none";
  });

  backdrop.style.display = "flex";
  requestAnimationFrame(() => {
    backdrop.classList.add("active");
  });
}

function closePostOptionsSheet() {
  const backdrop = document.getElementById("postOptionsSheetBackdrop");
  if (!backdrop) return;
  backdrop.classList.remove("active");
  setTimeout(() => {
    backdrop.style.display = "none";
    switchPostOptionsSubview("main");
  }, 260);
}

function findActiveVideo(postData) {
  if (postData && postData.id) {
    const postCard = document.querySelector(`.post-card[data-id="${postData.id}"]`);
    if (postCard) {
      const v = postCard.querySelector("video");
      if (v) return v;
    }
    const reelItem = document.querySelector(`.reel-item[data-id="${postData.id}"]`);
    if (reelItem) {
      const v = reelItem.querySelector("video");
      if (v) return v;
    }
  }
  // Fallback to currently playing or visible video
  return document.querySelector("video:not([paused])") || document.querySelector(".home-video-player") || document.querySelector(".reel-video");
}

function applyPlaybackSpeed(speed) {
  const video = findActiveVideo(activePostData);
  if (video) {
    video.playbackRate = speed;
  }
  const speedLabel = document.getElementById("postOptionsSpeedCurrent");
  if (speedLabel) speedLabel.textContent = `${speed}x`;

  const speedChecks = document.querySelectorAll(".speed-opt");
  speedChecks.forEach(opt => {
    const s = parseFloat(opt.dataset.speed || "1.0");
    const check = opt.querySelector(".speed-check");
    if (check) check.style.display = Math.abs(s - speed) < 0.05 ? "block" : "none";
  });

  showInstagramToast(`<i class="fa-solid fa-gauge-high text-[13px]"></i> ${speed}x`, { duration: 1500 });
  closePostOptionsSheet();
}

function submitReportReason(reason) {
  closePostOptionsSheet();
  showInstagramToast('<i class="fa-solid fa-check text-[14px]"></i> Reported', { center: true, duration: 1500 });
}

/**
 * Handle "Ask Shabnam AI" from this video's context:
 * 1. Dismiss bottom sheet
 * 2. Navigate immediately to Shabnam AI DM screen (Image 4)
 * 3. Automatically append a rich preview card of the current video at the top of the conversation
 * 4. Display user's question, show typing indicator, and trigger context-aware smart response from Shabnam AI
 */
function handlePostOptionsSave() {
  if (!activePostData) return;
  const isNowSaved = toggleSavePost(activePostData.id);
  showInstagramToast(isNowSaved ? '<i class="fa-solid fa-bookmark text-[13px]"></i> Saved' : '<i class="fa-regular fa-bookmark text-[13px]"></i> Removed', { duration: 1500 });
  updateSaveItemState(isNowSaved);
  closePostOptionsSheet();
}

function handlePostOptionsInterested() {
  if (activePostData) {
    try {
      localStorage.setItem(`affinity_${activePostData.id}`, "interested");
    } catch (_) {}
  }
  showInstagramToast('<i class="fa-solid fa-star text-amber-400 text-[13px]"></i> Interested', { duration: 1500 });
  closePostOptionsSheet();
}

function handlePostOptionsNotInterested() {
  if (activePostData) {
    try {
      localStorage.setItem(`affinity_${activePostData.id}`, "not_interested");
    } catch (_) {}
  }
  if (activePostElement && activePostElement.classList.contains("post-card")) {
    activePostElement.style.opacity = "0.3";
    activePostElement.style.pointerEvents = "none";
    activePostElement.style.filter = "grayscale(100%)";
  }
  showInstagramToast('<i class="fa-solid fa-eye-slash text-[13px]"></i> Not interested', { duration: 1500 });
  closePostOptionsSheet();
}

function handleAskShabnamContext(customPrompt) {
  if (!activePostData) return;

  const input = document.getElementById("askShabnamContextInput");
  const query = customPrompt || (input ? input.value.trim() : "");
  if (!query) return;

  const currentPost = { ...activePostData };

  // 1. Dismiss bottom sheet
  closePostOptionsSheet();

  // 2. Navigate immediately to Shabnam AI DM screen
  openShabnamChat();

  // 3. Construct rich preview card message using verified image thumbnail
  const videoCard = {
    id: currentPost.id || "post_" + Date.now(),
    url: currentPost.url || "",
    user: currentPost.user || "creator",
    avatar: currentPost.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    caption: currentPost.caption || "Flashgram Reel",
    thumbnail: resolveVideoThumbnail(currentPost)
  };

  // 4. Pass contextual prompt to Shabnam AI
  const promptText = query;
  const contextInstruction = `[Context: User is asking about video "${videoCard.caption}" by @${videoCard.user}]: ${promptText}`;

  // Use specialized sender in ShabnamAI
  if (typeof window !== "undefined" && typeof window.sendShabnamVideoContextMessage === "function") {
    window.sendShabnamVideoContextMessage(promptText, videoCard, contextInstruction);
  } else if (typeof sendShabnamMessage === "function") {
    sendShabnamMessage(promptText);
  }
}

// Global hooks for inline event handlers
if (typeof window !== "undefined") {
  window.openPostOptionsSheet = openPostOptionsSheet;
  window.closePostOptionsSheet = closePostOptionsSheet;
  window.switchPostOptionsSubview = switchPostOptionsSubview;
  window.applyPlaybackSpeed = applyPlaybackSpeed;
  window.submitReportReason = submitReportReason;
  window.handlePostOptionsSave = handlePostOptionsSave;
  window.handlePostOptionsInterested = handlePostOptionsInterested;
  window.handlePostOptionsNotInterested = handlePostOptionsNotInterested;
  window.submitAskShabnamContext = () => handleAskShabnamContext();
  window.submitAskShabnamPrompt = (prompt) => handleAskShabnamContext(prompt);
}

export {
  openPostOptionsSheet,
  closePostOptionsSheet,
  applyPlaybackSpeed,
  submitReportReason,
  handleAskShabnamContext,
  handlePostOptionsSave,
  handlePostOptionsInterested,
  handlePostOptionsNotInterested,
  resolveVideoThumbnail
};
