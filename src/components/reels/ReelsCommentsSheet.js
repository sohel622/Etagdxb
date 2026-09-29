// ReelsCommentsSheet Component (Half-Panel Comments Drawer, Video Resizing & Own Comment Interactions)
import { SHABNAM_AI_PROFILE } from "../../utils/mockData.js";
import { UserProfileStore, showInstagramToast } from "../../utils/storage.js";

let activeReelId = null;
let activeReelData = null;
let currentComments = [];

function getStoredComments(reelId) {
  try {
    const data = localStorage.getItem(`flashgram_reel_comments_${reelId}`);
    if (data) {
      return JSON.parse(data);
    }
  } catch (_) {}

  // Default initial comments with Shabnam AI pinned at top
  return [
    {
      id: "shabnam_default_" + reelId,
      user: "shabnam_ai",
      username: "shabnam_ai",
      avatar: SHABNAM_AI_PROFILE.avatar,
      isVerified: true,
      text: "Loving this creative reel! ✨ Feel free to ask me for any editing tips or music suggestions!",
      time: "2h",
      likes: 54,
      isLiked: false,
      isOwn: false
    },
    {
      id: "alex_default_" + reelId,
      user: "alex_r",
      username: "alex_r",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80",
      isVerified: false,
      text: "The energy on this is unmatched! 🔥 Keep these coming.",
      time: "1h",
      likes: 14,
      isLiked: false,
      isOwn: false
    }
  ];
}

function saveComments(reelId, comments) {
  try {
    localStorage.setItem(`flashgram_reel_comments_${reelId}`, JSON.stringify(comments));
  } catch (_) {}
}

function createCommentsSheetDOM() {
  let backdrop = document.getElementById("reelsCommentsSheetBackdrop");
  if (backdrop) return backdrop;

  backdrop = document.createElement("div");
  backdrop.id = "reelsCommentsSheetBackdrop";
  backdrop.className = "reels-sheet-backdrop";
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeReelsCommentsSheet();
  };

  backdrop.innerHTML = `
    <div class="reels-comments-top-dismiss-area" onclick="closeReelsCommentsSheet()"></div>
    <div class="reels-comments-drawer" onclick="event.stopPropagation()">
      <div class="sheet-drag-handle"></div>
      
      <div class="comments-header">
        <div style="width: 28px;"></div>
        <div class="comments-title">Comments</div>
        <button type="button" class="share-sheet-close-btn" id="commentsSheetCloseBtn" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="comments-list" id="reelsCommentsList"></div>

      <!-- Fixed Bottom Input Box -->
      <form class="comments-input-bar" id="commentsInputForm">
        <img src="${UserProfileStore.state.avatar}" class="comments-input-avatar current-user-avatar" alt="Avatar" />
        <input type="text" class="comments-input" id="commentsTextInput" placeholder="Comment as ${UserProfileStore.state.username || 'user'}..." autocomplete="off" />
        <button type="submit" class="comments-post-btn" id="commentsPostBtn" disabled>Post</button>
      </form>
    </div>

    <!-- Long-press / Options Modal for User's Own Comment -->
    <div class="comment-options-modal" id="commentOptionsModal">
      <div class="comment-options-sheet" onclick="event.stopPropagation()">
        <button type="button" class="comment-option-btn" id="commentOptionEditBtn">Edit Comment</button>
        <button type="button" class="comment-option-btn danger" id="commentOptionDeleteBtn">Delete Comment</button>
        <button type="button" class="comment-option-btn" id="commentOptionCancelBtn">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  setupCommentsSheetListeners(backdrop);
  return backdrop;
}

let selectedCommentForOptions = null;

function setupCommentsSheetListeners(backdrop) {
  const closeBtn = backdrop.querySelector("#commentsSheetCloseBtn");
  if (closeBtn) closeBtn.onclick = closeReelsCommentsSheet;

  const form = backdrop.querySelector("#commentsInputForm");
  const input = backdrop.querySelector("#commentsTextInput");
  const postBtn = backdrop.querySelector("#commentsPostBtn");

  if (input && postBtn) {
    input.addEventListener("input", () => {
      postBtn.disabled = !input.value.trim();
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || !activeReelId) return;

      const newComment = {
        id: "own_" + Date.now(),
        user: UserProfileStore.state.username || "sohel_077",
        username: UserProfileStore.state.username || "sohel_077",
        avatar: UserProfileStore.state.avatar,
        isVerified: false,
        text: text,
        time: "Just now",
        likes: 0,
        isLiked: false,
        isOwn: true
      };

      currentComments.push(newComment);
      saveComments(activeReelId, currentComments);
      input.value = "";
      postBtn.disabled = true;
      renderCommentsList();

      // Scroll to bottom
      const list = document.getElementById("reelsCommentsList");
      if (list) {
        list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
      }

      // Update badge count on current reel item if present
      updateReelItemCommentCount(activeReelId, currentComments.length);
      showInstagramToast("Comment posted ✨");
    });
  }

  // Options Modal Listeners
  const optionsModal = backdrop.querySelector("#commentOptionsModal");
  const cancelBtn = backdrop.querySelector("#commentOptionCancelBtn");
  const deleteBtn = backdrop.querySelector("#commentOptionDeleteBtn");
  const editBtn = backdrop.querySelector("#commentOptionEditBtn");

  if (cancelBtn && optionsModal) {
    cancelBtn.onclick = () => {
      optionsModal.classList.remove("active");
      selectedCommentForOptions = null;
    };
  }

  if (deleteBtn && optionsModal) {
    deleteBtn.onclick = () => {
      if (selectedCommentForOptions && activeReelId) {
        currentComments = currentComments.filter(c => c.id !== selectedCommentForOptions.id);
        saveComments(activeReelId, currentComments);
        renderCommentsList();
        updateReelItemCommentCount(activeReelId, currentComments.length);
        showInstagramToast("Comment deleted");
      }
      optionsModal.classList.remove("active");
      selectedCommentForOptions = null;
    };
  }

  if (editBtn && optionsModal) {
    editBtn.onclick = () => {
      if (selectedCommentForOptions) {
        startInlineEdit(selectedCommentForOptions.id);
      }
      optionsModal.classList.remove("active");
      selectedCommentForOptions = null;
    };
  }
}

function updateReelItemCommentCount(reelId, count) {
  const reelItem = document.querySelector(`.reel-item[data-id="${reelId}"]`);
  if (reelItem) {
    const commentCountSpan = reelItem.querySelector(".reel-action-btn:nth-child(2) span");
    if (commentCountSpan) {
      commentCountSpan.textContent = String(count);
    }
  }
}

function startInlineEdit(commentId) {
  const commentElem = document.getElementById(`commentItem_${commentId}`);
  if (!commentElem) return;
  const commentObj = currentComments.find(c => c.id === commentId);
  if (!commentObj) return;

  const body = commentElem.querySelector(".comment-body");
  if (!body) return;

  body.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:8px; width:100%;">
      <input type="text" class="comments-input" id="editInput_${commentId}" value="${commentObj.text.replace(/"/g, '&quot;')}" style="width:100%; border-radius:10px;" />
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button type="button" class="comment-action-btn" id="cancelEdit_${commentId}">Cancel</button>
        <button type="button" class="comments-post-btn" id="saveEdit_${commentId}" style="padding:0;">Save</button>
      </div>
    </div>
  `;

  const editInput = body.querySelector(`#editInput_${commentId}`);
  const cancelBtn = body.querySelector(`#cancelEdit_${commentId}`);
  const saveBtn = body.querySelector(`#saveEdit_${commentId}`);

  if (editInput) editInput.focus();

  if (cancelBtn) {
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      renderCommentsList();
    };
  }

  if (saveBtn) {
    saveBtn.onclick = (e) => {
      e.stopPropagation();
      const updatedText = editInput.value.trim();
      if (!updatedText) return;
      commentObj.text = updatedText;
      saveComments(activeReelId, currentComments);
      renderCommentsList();
      showInstagramToast("Comment updated ✨");
    };
  }
}

function renderCommentsList() {
  const list = document.getElementById("reelsCommentsList");
  if (!list) return;
  list.innerHTML = "";

  currentComments.forEach(comment => {
    const item = document.createElement("div");
    item.id = `commentItem_${comment.id}`;
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

    // Heart Like toggle
    const likeBtn = item.querySelector(".comment-like");
    if (likeBtn) {
      likeBtn.onclick = (e) => {
        e.stopPropagation();
        comment.isLiked = !comment.isLiked;
        comment.likes = (comment.likes || 0) + (comment.isLiked ? 1 : -1);
        saveComments(activeReelId, currentComments);
        renderCommentsList();
      };
    }

    // Inline Edit Button
    const inlineEditBtn = item.querySelector(".inline-edit-trigger");
    if (inlineEditBtn) {
      inlineEditBtn.onclick = (e) => {
        e.stopPropagation();
        startInlineEdit(comment.id);
      };
    }

    // Long-Press Interaction on user's own comment (> 400ms)
    if (comment.isOwn) {
      let holdTimer = null;
      let startX = 0;
      let startY = 0;
      let isMoved = false;

      const triggerOptions = () => {
        selectedCommentForOptions = comment;
        const optionsModal = document.getElementById("commentOptionsModal");
        if (optionsModal) optionsModal.classList.add("active");
      };

      item.addEventListener("touchstart", (e) => {
        if (e.target.closest(".comment-action-btn") || e.target.closest(".comment-like")) return;
        if (e.touches && e.touches[0]) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          isMoved = false;
          clearTimeout(holdTimer);
          holdTimer = setTimeout(triggerOptions, 400);
        }
      }, { passive: true });

      item.addEventListener("touchmove", (e) => {
        if (e.touches && e.touches[0]) {
          const dx = Math.abs(e.touches[0].clientX - startX);
          const dy = Math.abs(e.touches[0].clientY - startY);
          if (dx > 10 || dy > 10) {
            isMoved = true;
            clearTimeout(holdTimer);
          }
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

function openReelsCommentsSheet(reelId, reelData = null) {
  activeReelId = reelId;
  activeReelData = reelData;
  const backdrop = createCommentsSheetDOM();

  currentComments = getStoredComments(reelId);
  renderCommentsList();

  // Update input placeholder with current username
  const input = backdrop.querySelector("#commentsTextInput");
  if (input) {
    input.placeholder = `Comment as ${UserProfileStore.state.username || 'user'}...`;
  }
  const avatarImg = backdrop.querySelector(".comments-input-avatar");
  if (avatarImg) {
    avatarImg.src = UserProfileStore.state.avatar;
  }

  // Smoothly translate active reel video to upper half without cropping
  const reelsView = document.getElementById("reelsView");
  if (reelsView) {
    reelsView.classList.add("comments-sheet-open");
  }

  // Target current reel item
  const allReelItems = document.querySelectorAll("#reelsFeedWrapper .reel-item");
  allReelItems.forEach(item => item.classList.remove("active-comment-reel"));
  const currentItem = document.querySelector(`.reel-item[data-id="${reelId}"]`) || allReelItems[0];
  if (currentItem) {
    currentItem.classList.add("active-comment-reel");
  }

  backdrop.style.display = "flex";
  requestAnimationFrame(() => {
    backdrop.classList.add("active");
  });
}

function closeReelsCommentsSheet() {
  const backdrop = document.getElementById("reelsCommentsSheetBackdrop");
  if (!backdrop) return;

  const reelsView = document.getElementById("reelsView");
  if (reelsView) {
    reelsView.classList.remove("comments-sheet-open");
  }

  const allReelItems = document.querySelectorAll("#reelsFeedWrapper .reel-item");
  allReelItems.forEach(item => item.classList.remove("active-comment-reel"));

  backdrop.classList.remove("active");
  setTimeout(() => {
    backdrop.style.display = "none";
  }, 260);
}

if (typeof window !== "undefined") {
  window.openReelsCommentsSheet = openReelsCommentsSheet;
  window.closeReelsCommentsSheet = closeReelsCommentsSheet;
}

export {
  openReelsCommentsSheet,
  closeReelsCommentsSheet
};
