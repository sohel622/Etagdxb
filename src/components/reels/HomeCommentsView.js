// HomeCommentsView Component (Dedicated Full-Screen Comments View for Home Feed Posts)
import { SHABNAM_AI_PROFILE } from "../../utils/mockData.js";
import { UserProfileStore, showInstagramToast } from "../../utils/storage.js";
import { pauseAllHomeVideos, setupHomeFeedObserver } from "../Feed.js";

let activePostId = null;
let activePostData = null;
let currentHomeComments = [];
let selectedCommentForHomeOptions = null;

function getStoredHomeComments(postId) {
  try {
    const data = localStorage.getItem(`flashgram_post_comments_${postId}`);
    if (data) {
      return JSON.parse(data);
    }
  } catch (_) {}

  return [
    {
      id: "shabnam_post_" + postId,
      username: "shabnam_ai",
      avatar: SHABNAM_AI_PROFILE.avatar,
      isVerified: true,
      text: "Loving this post! ✨ Feel free to ask me for any tips or creative captions!",
      time: "2h",
      likes: 38,
      isLiked: false,
      isOwn: false
    },
    {
      id: "sophia_post_" + postId,
      username: "sophiap",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
      isVerified: false,
      text: "Awesome shot! ✨",
      time: "45m",
      likes: 8,
      isLiked: false,
      isOwn: false
    }
  ];
}

function saveHomeComments(postId, comments) {
  try {
    localStorage.setItem(`flashgram_post_comments_${postId}`, JSON.stringify(comments));
  } catch (_) {}
}

function createHomeCommentsDOM() {
  let view = document.getElementById("homeFeedCommentsView");
  if (view) return view;

  view = document.createElement("div");
  view.id = "homeFeedCommentsView";
  view.className = "home-comments-view";

  view.innerHTML = `
    <!-- Top Navigation Bar with Back Arrow -->
    <header class="home-comments-top-bar">
      <button type="button" class="home-comments-back-btn" id="homeCommentsBackBtn" aria-label="Back">
        <i class="fa-solid fa-arrow-left"></i>
      </button>
      <div class="home-comments-title">Comments</div>
      <div style="width: 24px;"></div>
    </header>

    <!-- Post Author Caption Card -->
    <div class="home-comments-caption-card" id="homeCommentsCaptionCard">
      <img src="" class="caption-avatar" id="homeCommentsPostAvatar" alt="Avatar" />
      <div class="comment-body">
        <div class="comment-meta">
          <span class="comment-username" id="homeCommentsPostUsername"></span>
          <span class="comment-time" id="homeCommentsPostTime"></span>
        </div>
        <div class="comment-text" id="homeCommentsPostCaption"></div>
      </div>
    </div>

    <!-- Scrollable Comments List -->
    <div class="home-comments-scroll-list" id="homeCommentsScrollList"></div>

    <!-- Fixed Bottom Comment Input Bar -->
    <form class="home-comments-input-bar" id="homeCommentsInputForm">
      <img src="${UserProfileStore.state.avatar}" class="comments-input-avatar current-user-avatar" alt="Avatar" />
      <input type="text" class="comments-input" id="homeCommentsTextInput" placeholder="Comment as ${UserProfileStore.state.username || 'user'}..." autocomplete="off" />
      <button type="submit" class="comments-post-btn" id="homeCommentsPostBtn" disabled>Post</button>
    </form>

    <!-- Modal for Edit / Delete of User's Own Comment -->
    <div class="comment-options-modal" id="homeCommentOptionsModal">
      <div class="comment-options-sheet" onclick="event.stopPropagation()">
        <button type="button" class="comment-option-btn" id="homeCommentOptionEditBtn">Edit Comment</button>
        <button type="button" class="comment-option-btn danger" id="homeCommentOptionDeleteBtn">Delete Comment</button>
        <button type="button" class="comment-option-btn" id="homeCommentOptionCancelBtn">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(view);
  setupHomeCommentsListeners(view);
  return view;
}

function setupHomeCommentsListeners(view) {
  const backBtn = view.querySelector("#homeCommentsBackBtn");
  if (backBtn) {
    backBtn.onclick = closeHomeFeedComments;
  }

  const form = view.querySelector("#homeCommentsInputForm");
  const input = view.querySelector("#homeCommentsTextInput");
  const postBtn = view.querySelector("#homeCommentsPostBtn");

  if (input && postBtn) {
    input.addEventListener("input", () => {
      postBtn.disabled = !input.value.trim();
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || !activePostId) return;

      const newComment = {
        id: "own_home_" + Date.now(),
        username: UserProfileStore.state.username || "sohel_077",
        avatar: UserProfileStore.state.avatar,
        isVerified: false,
        text: text,
        time: "Just now",
        likes: 0,
        isLiked: false,
        isOwn: true
      };

      currentHomeComments.push(newComment);
      saveHomeComments(activePostId, currentHomeComments);
      input.value = "";
      postBtn.disabled = true;
      renderHomeCommentsList();

      const list = document.getElementById("homeCommentsScrollList");
      if (list) {
        list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
      }

      updateHomePostCommentCount(activePostId, currentHomeComments.length);
      showInstagramToast("Comment posted ✨");
    });
  }

  // Options Modal Listeners
  const modal = view.querySelector("#homeCommentOptionsModal");
  const cancelBtn = view.querySelector("#homeCommentOptionCancelBtn");
  const deleteBtn = view.querySelector("#homeCommentOptionDeleteBtn");
  const editBtn = view.querySelector("#homeCommentOptionEditBtn");

  if (cancelBtn && modal) {
    cancelBtn.onclick = () => {
      modal.classList.remove("active");
      selectedCommentForHomeOptions = null;
    };
  }

  if (deleteBtn && modal) {
    deleteBtn.onclick = () => {
      if (selectedCommentForHomeOptions && activePostId) {
        currentHomeComments = currentHomeComments.filter(c => c.id !== selectedCommentForHomeOptions.id);
        saveHomeComments(activePostId, currentHomeComments);
        renderHomeCommentsList();
        updateHomePostCommentCount(activePostId, currentHomeComments.length);
        showInstagramToast("Comment deleted");
      }
      modal.classList.remove("active");
      selectedCommentForHomeOptions = null;
    };
  }

  if (editBtn && modal) {
    editBtn.onclick = () => {
      if (selectedCommentForHomeOptions) {
        startHomeInlineEdit(selectedCommentForHomeOptions.id);
      }
      modal.classList.remove("active");
      selectedCommentForHomeOptions = null;
    };
  }
}

function updateHomePostCommentCount(postId, count) {
  const cards = document.querySelectorAll(".post-card");
  cards.forEach(card => {
    const video = card.querySelector("video");
    const commentsLink = card.querySelector(".post-comments-link");
    if (commentsLink && (card.dataset.postId === String(postId) || (video && video.src && activePostData && video.src.includes(activePostData.url)))) {
      commentsLink.textContent = `View all ${count} comments`;
    }
  });
}

function startHomeInlineEdit(commentId) {
  const itemElem = document.getElementById(`homeCommentItem_${commentId}`);
  if (!itemElem) return;
  const commentObj = currentHomeComments.find(c => c.id === commentId);
  if (!commentObj) return;

  const body = itemElem.querySelector(".comment-body");
  if (!body) return;

  body.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:8px; width:100%;">
      <input type="text" class="comments-input" id="editHomeInput_${commentId}" value="${commentObj.text.replace(/"/g, '&quot;')}" style="width:100%; border-radius:10px;" />
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button type="button" class="comment-action-btn" id="cancelHomeEdit_${commentId}">Cancel</button>
        <button type="button" class="comments-post-btn" id="saveHomeEdit_${commentId}" style="padding:0;">Save</button>
      </div>
    </div>
  `;

  const input = body.querySelector(`#editHomeInput_${commentId}`);
  const cancelBtn = body.querySelector(`#cancelHomeEdit_${commentId}`);
  const saveBtn = body.querySelector(`#saveHomeEdit_${commentId}`);

  if (input) input.focus();

  if (cancelBtn) {
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      renderHomeCommentsList();
    };
  }

  if (saveBtn) {
    saveBtn.onclick = (e) => {
      e.stopPropagation();
      const updated = input.value.trim();
      if (!updated) return;
      commentObj.text = updated;
      saveHomeComments(activePostId, currentHomeComments);
      renderHomeCommentsList();
      showInstagramToast("Comment updated ✨");
    };
  }
}

function renderHomeCommentsList() {
  const list = document.getElementById("homeCommentsScrollList");
  if (!list) return;
  list.innerHTML = "";

  currentHomeComments.forEach(comment => {
    const item = document.createElement("div");
    item.id = `homeCommentItem_${comment.id}`;
    item.className = `comment-item ${comment.isOwn ? 'user-own-comment' : ''}`;

    item.innerHTML = `
      <img src="${comment.avatar}" class="comment-avatar" alt="${comment.username}" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';" />
      <div class="comment-body">
        <div class="comment-meta">
          <span class="comment-username">${comment.username}</span>
          ${comment.isVerified ? '<span class="text-sky-400 text-[11px]"><i class="fa-solid fa-circle-check"></i></span>' : ''}
          <span class="comment-time">${comment.time}</span>
        </div>
        <div class="comment-text">${comment.text}</div>
        <div class="comment-actions">
          <button type="button" class="comment-action-btn">Reply</button>
          ${comment.isOwn ? `<button type="button" class="comment-action-btn inline-edit-trigger" style="color:#0095f6;">Edit</button>` : ''}
        </div>
      </div>
      <div class="comment-like ${comment.isLiked ? 'liked' : ''}">
        <i class="${comment.isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i>
        <span>${comment.likes || ''}</span>
      </div>
    `;

    const likeBtn = item.querySelector(".comment-like");
    if (likeBtn) {
      likeBtn.onclick = (e) => {
        e.stopPropagation();
        comment.isLiked = !comment.isLiked;
        comment.likes = (comment.likes || 0) + (comment.isLiked ? 1 : -1);
        saveHomeComments(activePostId, currentHomeComments);
        renderHomeCommentsList();
      };
    }

    const inlineEditBtn = item.querySelector(".inline-edit-trigger");
    if (inlineEditBtn) {
      inlineEditBtn.onclick = (e) => {
        e.stopPropagation();
        startHomeInlineEdit(comment.id);
      };
    }

    // Long-Press (> 400ms) on own comment
    if (comment.isOwn) {
      let holdTimer = null;
      let startX = 0;
      let startY = 0;

      const triggerOptions = () => {
        selectedCommentForHomeOptions = comment;
        const modal = document.getElementById("homeCommentOptionsModal");
        if (modal) modal.classList.add("active");
      };

      item.addEventListener("touchstart", (e) => {
        if (e.target.closest(".comment-action-btn") || e.target.closest(".comment-like")) return;
        if (e.touches && e.touches[0]) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          clearTimeout(holdTimer);
          holdTimer = setTimeout(triggerOptions, 400);
        }
      }, { passive: true });

      item.addEventListener("touchmove", (e) => {
        if (e.touches && e.touches[0]) {
          const dx = Math.abs(e.touches[0].clientX - startX);
          const dy = Math.abs(e.touches[0].clientY - startY);
          if (dx > 10 || dy > 10) clearTimeout(holdTimer);
        }
      }, { passive: true });

      item.addEventListener("touchend", () => clearTimeout(holdTimer), { passive: true });
      item.addEventListener("touchcancel", () => clearTimeout(holdTimer), { passive: true });

      item.addEventListener("mousedown", (e) => {
        if (e.target.closest(".comment-action-btn") || e.target.closest(".comment-like")) return;
        clearTimeout(holdTimer);
        holdTimer = setTimeout(triggerOptions, 400);
      });
      item.addEventListener("mouseup", () => clearTimeout(holdTimer));
      item.addEventListener("mouseleave", () => clearTimeout(holdTimer));
    }

    list.appendChild(item);
  });
}

import { openReelsCommentsSheet, closeReelsCommentsSheet } from "./ReelsCommentsSheet.js";

function openHomeFeedComments(post) {
  if (!post) return;
  const postId = post.id || "post_" + Date.now();
  openReelsCommentsSheet(postId, post);
}

function closeHomeFeedComments() {
  closeReelsCommentsSheet();
}

// Window popstate handler
if (typeof window !== "undefined") {
  window.addEventListener("popstate", (e) => {
    const view = document.getElementById("homeFeedCommentsView");
    if (view && view.classList.contains("active")) {
      closeHomeFeedComments();
    }
  });

  window.openHomeFeedComments = openHomeFeedComments;
  window.closeHomeFeedComments = closeHomeFeedComments;
}

export {
  openHomeFeedComments,
  closeHomeFeedComments
};
