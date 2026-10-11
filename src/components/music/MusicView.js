// Flashgram Music View Component
// Clean YouTube Music Styled UI with Categorized Feeds, Search, Mini Player & Full-Screen Now Playing View

import { youtubeMusicService } from "../../services/youtubeMusicService.js";

let isMusicInitialized = false;
let currentActiveChip = "Quick picks";
let isScrubbing = false;

export function initMusicView() {
  if (isMusicInitialized) return;
  isMusicInitialized = true;

  // Initialize YouTube IFrame player lazily in background
  youtubeMusicService.initPlayer();

  // Subscribe to playback changes to keep UI reactive
  youtubeMusicService.subscribe((state) => {
    updateMiniPlayerUI(state);
    updateNowPlayingUI(state);
    updateFeedTrackPlayingIndicators(state);
  });

  // Setup scrubber drag events
  setupScrubberInteractions();

  // Load initial music feeds
  loadMusicFeedCategory(currentActiveChip);
}

// ========================================================
// 1. Navigation & Screen Toggles
// ========================================================

export function openFlashgramMusicView() {
  const musicScreen = document.getElementById("flashgramMusicScreen");
  if (!musicScreen) return;

  initMusicView();
  musicScreen.classList.add("active");
  document.body.classList.add("in-music-screen");

  // Keep mini-player synced if track is already loaded
  updateMiniPlayerUI(youtubeMusicService.getState());
}

export function closeFlashgramMusicView() {
  const musicScreen = document.getElementById("flashgramMusicScreen");
  if (!musicScreen) return;

  musicScreen.classList.remove("active");
  document.body.classList.remove("in-music-screen");
}

export function closeAndStopMusicPlayer() {
  youtubeMusicService.stopAndDismissPlayer();
  const miniPlayer = document.getElementById("musicMiniPlayer");
  if (miniPlayer) {
    miniPlayer.classList.remove("active");
  }
  const musicScreen = document.getElementById("flashgramMusicScreen");
  if (musicScreen) {
    musicScreen.classList.remove("has-mini-player");
  }
}

export function openNowPlayingModal() {
  const modal = document.getElementById("musicNowPlayingModal");
  if (!modal) return;
  modal.classList.add("active");
  updateNowPlayingUI(youtubeMusicService.getState());
}

export function closeNowPlayingModal() {
  const modal = document.getElementById("musicNowPlayingModal");
  if (!modal) return;
  modal.classList.remove("active");
}

// ========================================================
// 2. Music Feed Loading & Rendering
// ========================================================

export async function loadMusicFeedCategory(categoryName) {
  currentActiveChip = categoryName;

  // Update chips styling
  document.querySelectorAll(".music-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.category === categoryName);
  });

  // Load category feeds
  try {
    const quickPicks = await youtubeMusicService.fetchCategoryFeed("Quick picks");
    renderQuickPicks(quickPicks);

    const trending = await youtubeMusicService.fetchCategoryFeed("Trending Tracks");
    renderTrending(trending);

    const remixes = await youtubeMusicService.fetchCategoryFeed("Remixes");
    renderRemixes(remixes);
  } catch (err) {
    console.warn("Error loading category feed:", err);
  }
}

function renderTrackItem(track, category, isCurrent, isPlaying) {
  const isBookmarked = youtubeMusicService.isTrackBookmarked(track.id);
  const formattedDuration = youtubeMusicService.formatTime(track.duration || 215);

  return `
    <div class="music-track-item ${isCurrent && isPlaying ? 'playing' : ''}" data-track-id="${track.id}" onclick="window.handlePlayTrackClick('${track.id}', '${category}')">
      <!-- Album art: sleek square thumbnail with subtle rounded corners -->
      <div class="music-track-thumb-box">
        <img src="${track.thumbnail}" alt="${escapeHtml(track.title)}" loading="lazy" />
        ${isCurrent && isPlaying ? `
          <div class="music-track-playing-indicator">
            <div class="music-wave-bar"></div>
            <div class="music-wave-bar"></div>
            <div class="music-wave-bar"></div>
          </div>
        ` : ''}
      </div>

      <!-- High-contrast sharp typography & muted compact subtitle with duration bullet -->
      <div class="music-track-info">
        <div class="music-track-title ${isCurrent && isPlaying ? 'text-rose-400' : ''}">
          ${escapeHtml(track.title)}
        </div>
        <div class="music-track-artist">
          <span class="truncate">${escapeHtml(track.channelTitle)}</span>
          <span class="text-neutral-500 font-bold">•</span>
          <span class="shrink-0 text-neutral-400">${formattedDuration}</span>
        </div>
      </div>

      <!-- Action buttons: Clean bookmark/save icon + Modern accent play icon button -->
      <div class="music-track-actions" onclick="event.stopPropagation()">
        <button type="button" class="music-bookmark-btn ${isBookmarked ? 'text-rose-500' : 'text-neutral-400 hover:text-white'}" data-track-id="${track.id}" onclick="window.toggleMusicBookmark('${track.id}')" title="${isBookmarked ? 'Remove Bookmark' : 'Save Track'}" aria-label="Bookmark">
          <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark text-sm"></i>
        </button>
        <button type="button" class="music-play-accent-btn ${isCurrent && isPlaying ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30' : 'bg-white/10 hover:bg-white/20 text-white'}" onclick="window.handlePlayTrackClick('${track.id}', '${category}')" title="${isCurrent && isPlaying ? 'Pause' : 'Play'}" aria-label="Play">
          <i class="fa-solid ${isCurrent && isPlaying ? 'fa-pause text-xs' : 'fa-play text-xs ml-0.5'}"></i>
        </button>
      </div>
    </div>
  `;
}

function renderQuickPicks(tracks) {
  const container = document.getElementById("musicQuickPicksContainer");
  if (!container) return;

  const currentTrackId = youtubeMusicService.currentTrack?.id;
  const isPlaying = youtubeMusicService.isPlaying;

  container.innerHTML = tracks.map((track) => {
    const isCurrent = track.id === currentTrackId;
    return renderTrackItem(track, 'quickPicks', isCurrent, isPlaying);
  }).join("");
}

function renderTrending(tracks) {
  const container = document.getElementById("musicTrendingContainer");
  if (!container) return;

  const currentTrackId = youtubeMusicService.currentTrack?.id;
  const isPlaying = youtubeMusicService.isPlaying;

  container.innerHTML = tracks.map((track, idx) => {
    const isCurrent = track.id === currentTrackId;
    const formattedDuration = youtubeMusicService.formatTime(track.duration || 220);
    return `
      <div class="music-card ${isCurrent && isPlaying ? 'playing' : ''}" data-track-id="${track.id}" onclick="window.handlePlayTrackClick('${track.id}', 'trending')">
        <div class="music-card-thumb-wrap">
          <img class="music-card-thumb" src="${track.thumbnail}" alt="${escapeHtml(track.title)}" loading="lazy" />
          <div class="music-card-play-overlay">
            <div class="music-card-play-btn ${isCurrent && isPlaying ? '!bg-rose-500 !text-white' : ''}">
              <i class="fa-solid ${isCurrent && isPlaying ? 'fa-pause' : 'fa-play'}"></i>
            </div>
          </div>
          <div class="absolute bottom-1.5 left-2 bg-black/75 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs">
            #${idx + 1}
          </div>
        </div>
        <div class="music-card-meta">
          <div class="music-card-title font-semibold text-sm text-white truncate leading-snug">${escapeHtml(track.title)}</div>
          <div class="music-card-artist text-xs text-neutral-400 font-normal truncate mt-1 flex items-center gap-1.5">
            <span class="truncate">${escapeHtml(track.channelTitle)}</span>
            <span class="text-neutral-500">•</span>
            <span class="shrink-0">${formattedDuration}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderRemixes(tracks) {
  const container = document.getElementById("musicRemixesContainer");
  if (!container) return;

  const currentTrackId = youtubeMusicService.currentTrack?.id;
  const isPlaying = youtubeMusicService.isPlaying;

  container.innerHTML = tracks.map((track) => {
    const isCurrent = track.id === currentTrackId;
    return renderTrackItem(track, 'remixes', isCurrent, isPlaying);
  }).join("");
}

export function toggleMusicBookmark(trackId) {
  if (!trackId) return;
  const isSaved = youtubeMusicService.toggleBookmark(trackId);

  // Synchronize all bookmark buttons with this track ID
  document.querySelectorAll(`.music-bookmark-btn[data-track-id="${trackId}"]`).forEach(btn => {
    btn.classList.toggle("text-rose-500", isSaved);
    btn.classList.toggle("text-neutral-400", !isSaved);
    const icon = btn.querySelector("i");
    if (icon) {
      icon.className = isSaved ? "fa-solid fa-bookmark text-sm" : "fa-regular fa-bookmark text-sm";
    }
  });

  if (typeof window.showInstagramToast === 'function') {
    window.showInstagramToast(isSaved ? "Saved to your Flashgram Music library" : "Removed from saved tracks");
  }
}

// Track Click Handler from UI
export function handlePlayTrackClick(trackId, sourceCategory) {
  let targetQueue = [];
  if (sourceCategory === 'quickPicks') {
    targetQueue = youtubeMusicService.cachedCategoryFeeds["Quick picks"] || [];
  } else if (sourceCategory === 'trending') {
    targetQueue = youtubeMusicService.cachedCategoryFeeds["Trending Tracks"] || [];
  } else if (sourceCategory === 'remixes') {
    targetQueue = youtubeMusicService.cachedCategoryFeeds["Remixes"] || [];
  } else if (sourceCategory === 'search') {
    targetQueue = window.__lastMusicSearchResults || [];
  }

  const track = targetQueue.find(t => t.id === trackId) || youtubeMusicService.queue.find(t => t.id === trackId);
  if (track) {
    if (youtubeMusicService.currentTrack?.id === track.id) {
      youtubeMusicService.togglePlayPause();
    } else {
      youtubeMusicService.playTrack(track, targetQueue);
    }
  }
}

// ========================================================
// 3. Mini Player UI Sync (Scoped strictly to Music Screen)
// ========================================================

function updateMiniPlayerUI(state) {
  const miniPlayer = document.getElementById("musicMiniPlayer");
  const musicScreen = document.getElementById("flashgramMusicScreen");
  if (!miniPlayer) return;

  if (!state.currentTrack) {
    miniPlayer.classList.remove("active");
    if (musicScreen) musicScreen.classList.remove("has-mini-player");
    return;
  }

  miniPlayer.classList.add("active");
  if (musicScreen) musicScreen.classList.add("has-mini-player");

  const thumb = document.getElementById("musicMiniThumb");
  const title = document.getElementById("musicMiniTitle");
  const artist = document.getElementById("musicMiniArtist");
  const playBtnIcon = document.getElementById("musicMiniPlayIcon");
  const progressFill = document.getElementById("musicMiniProgressFill");

  if (thumb && state.currentTrack.thumbnail) {
    thumb.src = state.currentTrack.thumbnail;
  }
  if (title) {
    title.textContent = state.currentTrack.title || "Unknown Title";
  }
  if (artist) {
    artist.textContent = state.currentTrack.channelTitle || "Unknown Artist";
  }
  if (playBtnIcon) {
    playBtnIcon.className = state.isPlaying ? "fa-solid fa-pause text-base" : "fa-solid fa-play text-sm ml-0.5";
  }

  if (progressFill && state.duration > 0) {
    const pct = Math.min(100, Math.max(0, (state.currentTime / state.duration) * 100));
    progressFill.style.width = `${pct}%`;
  }
}

// ========================================================
// 4. Full-Screen Now Playing UI Sync
// ========================================================

function updateNowPlayingUI(state) {
  const modal = document.getElementById("musicNowPlayingModal");
  if (!modal) return;

  if (!state.currentTrack) return;

  const backdrop = document.getElementById("musicNowPlayingBackdrop");
  const artImg = document.getElementById("musicNowPlayingArtworkImg");
  const title = document.getElementById("musicNowPlayingTitle");
  const artist = document.getElementById("musicNowPlayingArtist");
  const playIcon = document.getElementById("musicNowPlayingPlayIcon");
  const heartBtn = document.getElementById("musicNowPlayingHeartBtn");
  const shuffleBtn = document.getElementById("musicNowPlayingShuffleBtn");
  const repeatBtn = document.getElementById("musicNowPlayingRepeatBtn");
  const timeCurrent = document.getElementById("musicNowPlayingTimeCurrent");
  const timeTotal = document.getElementById("musicNowPlayingTimeTotal");
  const scrubberFill = document.getElementById("musicScrubberFill");

  if (backdrop) {
    backdrop.style.backgroundImage = `url('${state.currentTrack.thumbnail}')`;
  }
  if (artImg) {
    artImg.src = state.currentTrack.thumbnail;
  }
  if (title) {
    title.textContent = state.currentTrack.title;
  }
  if (artist) {
    artist.textContent = state.currentTrack.channelTitle;
  }
  if (playIcon) {
    playIcon.className = state.isPlaying ? "fa-solid fa-pause text-2xl" : "fa-solid fa-play text-2xl ml-1";
  }
  if (heartBtn) {
    heartBtn.classList.toggle("liked", Boolean(state.isLiked));
    const icon = heartBtn.querySelector("i");
    if (icon) {
      icon.className = state.isLiked ? "fa-solid fa-heart text-rose-500" : "fa-regular fa-heart";
    }
  }
  if (shuffleBtn) {
    shuffleBtn.classList.toggle("active", Boolean(state.isShuffle));
  }
  if (repeatBtn) {
    repeatBtn.classList.toggle("active", state.repeatMode !== 'none');
    const icon = repeatBtn.querySelector("i");
    if (icon) {
      if (state.repeatMode === 'one') {
        icon.className = "fa-solid fa-repeat text-rose-500";
        repeatBtn.setAttribute("title", "Repeat One");
      } else if (state.repeatMode === 'all') {
        icon.className = "fa-solid fa-repeat text-rose-500";
        repeatBtn.setAttribute("title", "Repeat All");
      } else {
        icon.className = "fa-solid fa-repeat text-neutral-400";
        repeatBtn.setAttribute("title", "Repeat Off");
      }
    }
  }

  if (!isScrubbing) {
    if (timeCurrent) timeCurrent.textContent = youtubeMusicService.formatTime(state.currentTime);
    if (timeTotal) timeTotal.textContent = youtubeMusicService.formatTime(state.duration);
    if (scrubberFill && state.duration > 0) {
      const pct = Math.min(100, Math.max(0, (state.currentTime / state.duration) * 100));
      scrubberFill.style.width = `${pct}%`;
    }
  }
}

function updateFeedTrackPlayingIndicators(state) {
  const currentId = state.currentTrack?.id;
  const isPlaying = state.isPlaying;

  // Update song list items
  document.querySelectorAll(".music-track-item").forEach(item => {
    const trackId = item.dataset.trackId || "";
    const isThisTrack = trackId === currentId;
    item.classList.toggle("playing", isThisTrack && isPlaying);

    const titleEl = item.querySelector(".music-track-title");
    if (titleEl) {
      titleEl.classList.toggle("text-rose-400", isThisTrack && isPlaying);
    }

    const thumbBox = item.querySelector(".music-track-thumb-box");
    if (thumbBox) {
      let wave = thumbBox.querySelector(".music-track-playing-indicator");
      if (isThisTrack && isPlaying) {
        if (!wave) {
          wave = document.createElement("div");
          wave.className = "music-track-playing-indicator";
          wave.innerHTML = `
            <div class="music-wave-bar"></div>
            <div class="music-wave-bar"></div>
            <div class="music-wave-bar"></div>
          `;
          thumbBox.appendChild(wave);
        }
      } else if (wave) {
        wave.remove();
      }
    }

    const playAccentBtn = item.querySelector(".music-play-accent-btn");
    if (playAccentBtn) {
      if (isThisTrack && isPlaying) {
        playAccentBtn.className = "music-play-accent-btn bg-rose-500 text-white shadow-md shadow-rose-500/30";
        playAccentBtn.innerHTML = '<i class="fa-solid fa-pause text-xs"></i>';
      } else {
        playAccentBtn.className = "music-play-accent-btn bg-white/10 hover:bg-white/20 text-white";
        playAccentBtn.innerHTML = '<i class="fa-solid fa-play text-xs ml-0.5"></i>';
      }
    }
  });

  // Update trending cards
  document.querySelectorAll(".music-card").forEach(card => {
    const trackId = card.dataset.trackId || "";
    const isThisCard = trackId === currentId;
    card.classList.toggle("playing", isThisCard && isPlaying);

    const playBtn = card.querySelector(".music-card-play-btn");
    if (playBtn) {
      playBtn.classList.toggle("!bg-rose-500", isThisCard && isPlaying);
      playBtn.classList.toggle("!text-white", isThisCard && isPlaying);
      const icon = playBtn.querySelector("i");
      if (icon) {
        icon.className = `fa-solid ${isThisCard && isPlaying ? 'fa-pause' : 'fa-play'}`;
      }
    }
  });
}

// ========================================================
// 5. Scrubber Interactions
// ========================================================

function setupScrubberInteractions() {
  const track = document.getElementById("musicScrubberTrack");
  if (!track) return;

  const onSeek = (clientX) => {
    const rect = track.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetSeconds = pos * (youtubeMusicService.duration || 100);

    const scrubberFill = document.getElementById("musicScrubberFill");
    const timeCurrent = document.getElementById("musicNowPlayingTimeCurrent");

    if (scrubberFill) scrubberFill.style.width = `${pos * 100}%`;
    if (timeCurrent) timeCurrent.textContent = youtubeMusicService.formatTime(targetSeconds);

    return targetSeconds;
  };

  track.addEventListener("click", (e) => {
    const sec = onSeek(e.clientX);
    youtubeMusicService.seekTo(sec);
  });

  const onTouchMove = (e) => {
    if (!isScrubbing) return;
    const touch = e.touches[0];
    if (touch) onSeek(touch.clientX);
  };

  const onTouchEnd = (e) => {
    if (!isScrubbing) return;
    isScrubbing = false;
    const touch = e.changedTouches ? e.changedTouches[0] : null;
    if (touch) {
      const sec = onSeek(touch.clientX);
      youtubeMusicService.seekTo(sec);
    }
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
  };

  track.addEventListener("touchstart", (e) => {
    isScrubbing = true;
    const touch = e.touches[0];
    if (touch) onSeek(touch.clientX);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
  }, { passive: true });
}

// ========================================================
// 6. Search View Implementation
// ========================================================

let searchDebounceTimer = null;

export function openMusicSearch() {
  const searchOverlay = document.getElementById("musicSearchOverlay");
  const input = document.getElementById("musicSearchInput");
  if (!searchOverlay) return;

  searchOverlay.classList.add("active");
  if (input) {
    input.focus();
    if (!input.value.trim()) {
      executeMusicSearch("Top Music Hits 2026");
    }
  }
}

export function closeMusicSearch() {
  const searchOverlay = document.getElementById("musicSearchOverlay");
  if (!searchOverlay) return;
  searchOverlay.classList.remove("active");
}

export function handleMusicSearchInput(event) {
  const query = event.target.value.trim();
  const clearBtn = document.getElementById("musicSearchClearBtn");
  if (clearBtn) {
    clearBtn.style.display = query ? "block" : "none";
  }

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    if (query) {
      executeMusicSearch(query);
    }
  }, 400);
}

export function clearMusicSearchInput() {
  const input = document.getElementById("musicSearchInput");
  const clearBtn = document.getElementById("musicSearchClearBtn");
  if (input) {
    input.value = "";
    input.focus();
  }
  if (clearBtn) clearBtn.style.display = "none";
}

export async function executeMusicSearch(query) {
  const resultsContainer = document.getElementById("musicSearchResultsContainer");
  if (!resultsContainer) return;

  resultsContainer.innerHTML = `
    <div class="flex items-center justify-center p-8 text-neutral-400 gap-2">
      <i class="fa-solid fa-spinner fa-spin text-rose-500 text-lg"></i>
      <span class="text-xs">Searching YouTube Music...</span>
    </div>
  `;

  try {
    const tracks = await youtubeMusicService.searchYouTubeMusic(query, 12, 'Search');
    window.__lastMusicSearchResults = tracks;

    if (tracks.length === 0) {
      resultsContainer.innerHTML = `
        <div class="text-center p-8 text-neutral-400">
          <i class="fa-solid fa-compact-disc text-3xl mb-2 text-neutral-600"></i>
          <p class="text-sm font-medium">No results found for "${escapeHtml(query)}"</p>
        </div>
      `;
      return;
    }

    const currentTrackId = youtubeMusicService.currentTrack?.id;
    const isPlaying = youtubeMusicService.isPlaying;

    resultsContainer.innerHTML = tracks.map((track) => {
      const isCurrent = track.id === currentTrackId;
      return renderTrackItem(track, 'search', isCurrent, isPlaying);
    }).join("");
  } catch (err) {
    console.warn("Search error:", err);
    resultsContainer.innerHTML = `
      <div class="text-center p-8 text-neutral-400 text-xs">
        Failed to fetch search results. Please try again.
      </div>
    `;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Global attachments for HTML onclick compatibility
if (typeof window !== "undefined") {
  window.openFlashgramMusicView = openFlashgramMusicView;
  window.closeFlashgramMusicView = closeFlashgramMusicView;
  window.closeAndStopMusicPlayer = closeAndStopMusicPlayer;
  window.openNowPlayingModal = openNowPlayingModal;
  window.closeNowPlayingModal = closeNowPlayingModal;
  window.handlePlayTrackClick = handlePlayTrackClick;
  window.loadMusicFeedCategory = loadMusicFeedCategory;
  window.toggleMusicBookmark = toggleMusicBookmark;
  window.openMusicSearch = openMusicSearch;
  window.closeMusicSearch = closeMusicSearch;
  window.handleMusicSearchInput = handleMusicSearchInput;
  window.clearMusicSearchInput = clearMusicSearchInput;
  window.executeMusicSearch = executeMusicSearch;
}
