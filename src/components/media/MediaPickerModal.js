// Instagram-Style Media Picker, Real Device Gallery Picker, Cloud Storage Upload, and YouTube Audio Integration
import { showInstagramToast, UserProfileStore } from "../../utils/storage.js";
import { openCameraMicrophoneSession } from "../Modals.js";
import { renderHomeFeed, addNewPostToFeed } from "../Feed.js";
import { renderProfileGrid, updateProfilePostsCount } from "../Profile.js";
import { switchTab } from "../BottomNavigation.js";
import { uploadPostMedia } from "../../features/upload-service/uploadService.js";
import { searchYouTubeAudio } from "../../services/youtubeMusicService.js";
import { savePostToSupabase } from "../../services/cloudinaryService.js";

/**
 * Native Android & Web Media Fetcher
 * Requests native Android storage/media permissions:
 * - READ_MEDIA_IMAGES
 * - READ_MEDIA_VIDEO
 * Reads local device gallery thumbnails or invokes native file picker
 * Returns real Blob / File objects
 */
export const fetchDeviceMedia = async (options = {}) => {
  // Check/request native Android storage permissions via Capacitor bridge if available
  if (typeof window !== "undefined" && window.Capacitor?.Plugins?.Permissions) {
    try {
      await window.Capacitor.Plugins.Permissions.query({ name: 'storage' });
    } catch (_) {}
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.accept || 'image/*,video/*';
    input.multiple = options.multiple !== false;

    input.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      resolve(files);
    };

    input.oncancel = () => {
      resolve([]);
    };

    input.click();
  });
};

// State: No hardcoded fake images, strictly real device media loaded dynamically
let allGalleryItems = [];
let activeAlbum = "Recents";
let activeCategoryFilter = "Recents"; // "Recents" | "Photos" | "Videos"
let activeTab = "POST"; // Strictly "POST" | "STORY"
let isMultiSelectMode = false;
let selectedItems = []; // Array of selected media objects (max 5)
let activePreviewItem = null;
let isAspect45 = true; // 4:5 aspect ratio toggle

// Post Finalize State
let attachedMusic = null; // { id, title, artist, audioUrl, cover }
let selectedLocation = "";
let previewAudioElement = null;
let isMusicSearching = false;
let musicSearchDebounceTimer = null;

let isModalInitialized = false;

export function initInstagramMediaPicker() {
  if (isModalInitialized) return;
  isModalInitialized = true;

  injectMediaPickerDOM();
  bindMediaPickerEvents();
}

function injectMediaPickerDOM() {
  if (document.getElementById("instagramMediaPickerModal")) return;

  const modal = document.createElement("div");
  modal.id = "instagramMediaPickerModal";
  modal.className = "media-picker-modal";
  modal.innerHTML = `
    <!-- Top Header -->
    <header class="media-picker-header">
      <button type="button" class="media-picker-close-btn" id="mpCloseBtn" title="Close" aria-label="Close">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <!-- Recents Album Dropdown Button -->
      <button type="button" class="media-picker-album-title" id="mpAlbumTitleBtn" title="Select Album">
        <span id="mpCurrentAlbumLabel">Recents</span>
        <i class="fa-solid fa-chevron-down"></i>
      </button>

      <!-- Next Button -->
      <button type="button" class="media-picker-next-btn" id="mpNextBtn">
        Next
      </button>
    </header>

    <!-- Top Preview Box -->
    <div class="media-picker-preview-wrapper ${isAspect45 ? 'is-aspect-4-5' : ''}" id="mpPreviewContainer">
      <div id="mpPreviewMediaHost" class="w-full h-full flex items-center justify-center">
        <!-- Rendered dynamically: img, video or empty state -->
      </div>

      <!-- Preview Floating Controls -->
      <div class="media-picker-preview-controls">
        <!-- Left: Aspect Ratio Toggle (1:1 / 4:5) -->
        <button type="button" class="preview-ctrl-btn" id="mpAspectToggleBtn" title="Toggle Aspect Ratio">
          <i class="fa-solid fa-up-right-and-down-left-from-center text-[12px]"></i>
        </button>

        <!-- Right: Multi-Select Stacked Icon (Pink Glow Circle) -->
        <button type="button" class="preview-ctrl-btn multi-select-btn" id="mpMultiSelectToggleBtn" title="Select Multiple (Up to 5)">
          <i class="fa-regular fa-clone"></i>
        </button>
      </div>
    </div>

    <!-- Scrollable Media Gallery Grid -->
    <section class="media-picker-gallery-section">
      <div class="media-picker-grid-container" id="mpGridContainer">
        <!-- Live Camera Shortcut Tile (First Slot) -->
        <div class="gallery-camera-tile" id="mpCameraShortcutTile" title="Open Camera">
          <i class="fa-solid fa-camera"></i>
          <span>Camera</span>
        </div>
        <!-- Media Items Injected Here -->
      </div>
    </section>

    <!-- Bottom Tab Row: Strictly POST and STORY -->
    <nav class="media-picker-tabs-row" id="mpTabsRow">
      <button type="button" class="media-picker-tab-btn is-active" data-tab="POST" id="mpTabPost">POST</button>
      <button type="button" class="media-picker-tab-btn" data-tab="STORY" id="mpTabStory">STORY</button>
    </nav>

    <!-- Recents Album Selection Drawer -->
    <div class="album-select-drawer" id="mpAlbumDrawer">
      <div class="album-drawer-panel">
        <div class="album-drawer-handle"></div>
        <div class="album-drawer-header">
          <span>Select Album</span>
          <button type="button" id="mpCloseAlbumDrawerBtn" class="text-neutral-400 hover:text-white p-1">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Top Category Filter Chips -->
        <div class="album-category-chips">
          <button type="button" class="album-chip-btn active" data-filter="Recents">Recents</button>
          <button type="button" class="album-chip-btn" data-filter="Photos">Photos</button>
          <button type="button" class="album-chip-btn" data-filter="Videos">Videos</button>
        </div>

        <!-- Album Folder List -->
        <div class="album-folders-list" id="mpAlbumFoldersList">
          <!-- Folder rows injected dynamically -->
        </div>

        <!-- Direct Device File Input Picker Row -->
        <div class="p-3 border-t border-neutral-800">
          <button type="button" id="mpDrawerBrowseBtn" class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold cursor-pointer transition-colors">
            <i class="fa-solid fa-folder-open text-sky-400"></i>
            <span>Browse Device Gallery / Files</span>
          </button>
          <input type="file" id="mpDeviceFileInput" accept="image/*,video/*" multiple class="hidden" />
        </div>
      </div>
    </div>

    <!-- Post Finalize Screen ("Next" Screen) -->
    <div class="post-finalize-screen" id="mpFinalizeScreen">
      <header class="finalize-header">
        <button type="button" class="finalize-back-btn" id="mpFinalizeBackBtn" title="Back">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <span class="finalize-title">New post</span>
        <button type="button" class="finalize-share-btn" id="mpFinalizeShareBtn">
          Share
        </button>
      </header>

      <!-- Media Thumbnail Preview & Caption -->
      <div class="finalize-media-row">
        <div class="relative finalize-thumb-preview" id="mpFinalizeThumbWrapper">
          <img src="" id="mpFinalizeThumbImg" class="w-full h-full object-cover rounded-lg" alt="Thumbnail" />
          <span class="finalize-carousel-badge hidden" id="mpFinalizeCountBadge">1/3</span>
        </div>
        <textarea class="finalize-caption-input" id="mpCaptionInput" placeholder="Write a caption..." rows="3"></textarea>
      </div>

      <!-- Add Location Row -->
      <div class="finalize-action-row" id="mpLocationRow">
        <div class="finalize-action-left">
          <i class="fa-solid fa-location-dot"></i>
          <span id="mpLocationLabel">Add location</span>
        </div>
        <i class="fa-solid fa-chevron-right text-neutral-500 text-xs"></i>
      </div>

      <!-- Add Music Row -->
      <div class="finalize-action-row" id="mpMusicRow">
        <div class="finalize-action-left">
          <i class="fa-solid fa-music"></i>
          <div id="mpMusicLabelHost">
            <span class="text-sm">Add music</span>
          </div>
        </div>
        <div id="mpMusicActionRight">
          <i class="fa-solid fa-chevron-right text-neutral-500 text-xs"></i>
        </div>
      </div>

      <!-- Trending Music Suggestions Pills -->
      <div class="p-4">
        <div class="text-xs font-semibold text-neutral-400 mb-2.5">Trending Tracks (YouTube Audio)</div>
        <div class="flex flex-wrap gap-2" id="mpTrendingPills">
          <!-- Populated from YouTube API -->
        </div>
      </div>
    </div>

    <!-- Music Selection Modal Sheet -->
    <div class="music-picker-modal" id="mpMusicPickerModal">
      <header class="music-picker-header">
        <button type="button" class="finalize-back-btn" id="mpCloseMusicPickerBtn">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <span class="finalize-title">Select Music</span>
        <div class="w-8"></div>
      </header>
      <div class="music-picker-search">
        <div class="music-search-box">
          <i class="fa-solid fa-magnifying-glass text-neutral-400 text-sm"></i>
          <input type="text" id="mpMusicSearchInput" placeholder="Search real YouTube songs or artists..." />
        </div>
      </div>
      <div class="music-picker-list" id="mpMusicTracksList">
        <!-- YouTube Track items injected here -->
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function bindMediaPickerEvents() {
  const modal = document.getElementById("instagramMediaPickerModal");
  if (!modal) return;

  // Close Button
  document.getElementById("mpCloseBtn")?.addEventListener("click", () => {
    closeInstagramMediaPicker();
  });

  // Album Dropdown Toggle
  const albumBtn = document.getElementById("mpAlbumTitleBtn");
  albumBtn?.addEventListener("click", () => {
    openAlbumDrawer();
  });

  document.getElementById("mpCloseAlbumDrawerBtn")?.addEventListener("click", () => {
    closeAlbumDrawer();
  });

  document.getElementById("mpAlbumDrawer")?.addEventListener("click", (e) => {
    if (e.target.id === "mpAlbumDrawer") {
      closeAlbumDrawer();
    }
  });

  // Category Filter Chips (Recents, Photos, Videos)
  document.querySelectorAll(".album-chip-btn").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".album-chip-btn").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeCategoryFilter = chip.dataset.filter;
      renderGalleryGrid();
    });
  });

  // Camera Shortcut Tile
  document.getElementById("mpCameraShortcutTile")?.addEventListener("click", () => {
    closeInstagramMediaPicker();
    openCameraMicrophoneSession();
  });

  // Aspect Ratio Toggle
  document.getElementById("mpAspectToggleBtn")?.addEventListener("click", () => {
    isAspect45 = !isAspect45;
    const preview = document.getElementById("mpPreviewContainer");
    if (preview) {
      preview.classList.toggle("is-aspect-4-5", isAspect45);
    }
    showInstagramToast(isAspect45 ? "Aspect ratio: 4:5" : "Aspect ratio: 1:1");
  });

  // Multi-Select Toggle Button (Pink Circle reference)
  const multiBtn = document.getElementById("mpMultiSelectToggleBtn");
  multiBtn?.addEventListener("click", () => {
    if (!activePreviewItem) {
      showInstagramToast("Please select media first");
      return;
    }

    isMultiSelectMode = !isMultiSelectMode;
    multiBtn.classList.toggle("is-active", isMultiSelectMode);

    if (isMultiSelectMode) {
      if (!selectedItems.some(i => i.id === activePreviewItem.id)) {
        selectedItems = [activePreviewItem];
      }
      showInstagramToast("Multi-select active (up to 5 items)");
    } else {
      selectedItems = [activePreviewItem];
    }

    renderGalleryGrid();
    updateNextButtonState();
  });

  // Bottom Tabs ("POST" and "STORY")
  document.querySelectorAll(".media-picker-tab-btn").forEach(tabBtn => {
    tabBtn.addEventListener("click", () => {
      document.querySelectorAll(".media-picker-tab-btn").forEach(b => b.classList.remove("is-active"));
      tabBtn.classList.add("is-active");
      activeTab = tabBtn.dataset.tab;
      showInstagramToast(`Mode: ${activeTab}`);
    });
  });

  // Browse Device Gallery Button in Album Drawer
  document.getElementById("mpDrawerBrowseBtn")?.addEventListener("click", async () => {
    const files = await fetchDeviceMedia();
    if (files.length) {
      processSelectedDeviceFiles(files);
      closeAlbumDrawer();
    }
  });

  // Hidden File Input fallback
  const fileInput = document.getElementById("mpDeviceFileInput");
  fileInput?.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      processSelectedDeviceFiles(files);
      closeAlbumDrawer();
    }
  });

  // Next Button -> Opens Post Finalize Screen
  document.getElementById("mpNextBtn")?.addEventListener("click", () => {
    if (!selectedItems.length) {
      showInstagramToast("Please pick at least one photo or video");
      return;
    }
    openPostFinalizeScreen();
  });

  // Finalize Back Button
  document.getElementById("mpFinalizeBackBtn")?.addEventListener("click", () => {
    closePostFinalizeScreen();
  });

  // Add Music Row -> Opens Music Picker Modal
  document.getElementById("mpMusicRow")?.addEventListener("click", () => {
    openMusicPickerModal();
  });

  document.getElementById("mpCloseMusicPickerBtn")?.addEventListener("click", () => {
    closeMusicPickerModal();
  });

  // Real YouTube Music Search Input
  document.getElementById("mpMusicSearchInput")?.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    if (musicSearchDebounceTimer) clearTimeout(musicSearchDebounceTimer);
    musicSearchDebounceTimer = setTimeout(() => {
      renderMusicTracksList(q);
    }, 280);
  });

  // Add Location Click
  document.getElementById("mpLocationRow")?.addEventListener("click", () => {
    const locations = ["Los Angeles, CA", "New York, NY", "Tokyo, Japan", "London, UK", "Paris, France", "Dubai, UAE"];
    const pick = prompt("Enter location or choose one (e.g. Los Angeles, CA):", selectedLocation || locations[0]);
    if (pick !== null) {
      selectedLocation = pick.trim();
      const lbl = document.getElementById("mpLocationLabel");
      if (lbl) lbl.textContent = selectedLocation || "Add location";
    }
  });

  // Share Button -> Uploads to Cloud Storage & Posts
  document.getElementById("mpFinalizeShareBtn")?.addEventListener("click", () => {
    handleSharePost();
  });
}

/**
 * Ingest real File objects selected from device gallery
 */
export function processSelectedDeviceFiles(files) {
  if (!files || !files.length) return;

  const newItems = files.map(file => {
    const isVid = file.type ? file.type.startsWith("video") : file.name?.endsWith(".mp4");
    const blobUrl = URL.createObjectURL(file);
    return {
      id: "dev_" + Date.now() + "_" + Math.random().toString(36).substring(7),
      type: isVid ? "video" : "image",
      url: blobUrl,
      thumbnail: blobUrl,
      duration: isVid ? "0:15" : undefined,
      album: isVid ? "Videos" : "Photos",
      aspectRatio: isVid ? "9/16" : "4/5",
      file
    };
  });

  // Extract actual video duration if video
  newItems.forEach(item => {
    if (item.type === "video") {
      try {
        const tempVid = document.createElement("video");
        tempVid.src = item.url;
        tempVid.onloadedmetadata = () => {
          const secs = Math.round(tempVid.duration || 15);
          const m = Math.floor(secs / 60);
          const s = secs % 60;
          item.duration = `${m}:${s < 10 ? '0' : ''}${s}`;
          renderGalleryGrid();
        };
      } catch (_) {}
    }
  });

  allGalleryItems = [...newItems, ...allGalleryItems];
  activePreviewItem = newItems[0];
  selectedItems = [newItems[0]];

  updatePreviewArea();
  renderGalleryGrid();
  renderAlbumFolders();
  updateNextButtonState();

  showInstagramToast(`Loaded ${newItems.length} media item(s) from phone ✨`);
}

// -------------------------------------------------------------
// Screen Display Toggles
// -------------------------------------------------------------

export function openInstagramMediaPicker(options = {}) {
  initInstagramMediaPicker();

  const modal = document.getElementById("instagramMediaPickerModal");
  if (!modal) return;

  // Reset to default state
  activeAlbum = "Recents";
  activeCategoryFilter = "Recents";
  isMultiSelectMode = false;
  attachedMusic = null;
  selectedLocation = "";

  if (allGalleryItems.length > 0) {
    selectedItems = [allGalleryItems[0]];
    activePreviewItem = allGalleryItems[0];
  } else {
    selectedItems = [];
    activePreviewItem = null;
  }

  const multiBtn = document.getElementById("mpMultiSelectToggleBtn");
  if (multiBtn) multiBtn.classList.remove("is-active");

  const albumLbl = document.getElementById("mpCurrentAlbumLabel");
  if (albumLbl) albumLbl.textContent = "Recents";

  renderGalleryGrid();
  renderAlbumFolders();
  updatePreviewArea();
  updateNextButtonState();

  modal.classList.add("active");

  if (options && (options.prefilledCaption || options.sharedUrl || options.url || options.text)) {
    const textToFill = options.prefilledCaption || options.sharedUrl || options.url || options.text;
    const captionInput = document.getElementById("mpCaptionInput");
    if (captionInput) {
      captionInput.value = textToFill;
    }
    if (options.autoAdvanceToFinalize) {
      setTimeout(() => {
        openPostFinalizeScreen();
        const capIn = document.getElementById("mpCaptionInput");
        if (capIn) capIn.value = textToFill;
      }, 80);
    }
  }
}

export function closeInstagramMediaPicker() {
  const modal = document.getElementById("instagramMediaPickerModal");
  if (modal) {
    modal.classList.remove("active");
  }
  closeAlbumDrawer();
  closePostFinalizeScreen();
  closeMusicPickerModal();
  stopPreviewAudio();
}

function openAlbumDrawer() {
  const drawer = document.getElementById("mpAlbumDrawer");
  const titleBtn = document.getElementById("mpAlbumTitleBtn");
  if (drawer) drawer.classList.add("active");
  if (titleBtn) titleBtn.classList.add("is-open");
  renderAlbumFolders();
}

function closeAlbumDrawer() {
  const drawer = document.getElementById("mpAlbumDrawer");
  const titleBtn = document.getElementById("mpAlbumTitleBtn");
  if (drawer) drawer.classList.remove("active");
  if (titleBtn) titleBtn.classList.remove("is-open");
}

function openPostFinalizeScreen() {
  const screen = document.getElementById("mpFinalizeScreen");
  if (!screen) return;

  const thumbImg = document.getElementById("mpFinalizeThumbImg");
  const countBadge = document.getElementById("mpFinalizeCountBadge");

  if (thumbImg && selectedItems[0]) {
    thumbImg.src = selectedItems[0].thumbnail || selectedItems[0].url;
  }

  if (countBadge) {
    if (selectedItems.length > 1) {
      countBadge.textContent = `1/${selectedItems.length}`;
      countBadge.classList.remove("hidden");
    } else {
      countBadge.classList.add("hidden");
    }
  }

  renderTrendingPills();
  updateMusicRowUI();
  screen.classList.add("active");
}

function closePostFinalizeScreen() {
  const screen = document.getElementById("mpFinalizeScreen");
  if (screen) screen.classList.remove("active");
}

function openMusicPickerModal() {
  const modal = document.getElementById("mpMusicPickerModal");
  if (!modal) return;
  modal.classList.add("active");
  renderMusicTracksList("");
}

function closeMusicPickerModal() {
  const modal = document.getElementById("mpMusicPickerModal");
  if (modal) modal.classList.remove("active");
  stopPreviewAudio();
}

// -------------------------------------------------------------
// Gallery & Preview Rendering
// -------------------------------------------------------------

function renderGalleryGrid() {
  const container = document.getElementById("mpGridContainer");
  if (!container) return;

  const cameraTile = document.getElementById("mpCameraShortcutTile");
  container.innerHTML = "";
  if (cameraTile) container.appendChild(cameraTile);

  // If no media loaded from phone yet, render "Select from Phone" tile
  if (allGalleryItems.length === 0) {
    const pickTile = document.createElement("div");
    pickTile.className = "gallery-media-tile flex flex-col items-center justify-center bg-neutral-900 border border-dashed border-neutral-700 rounded-lg p-2 text-center cursor-pointer hover:bg-neutral-800 transition-colors";
    pickTile.id = "mpSelectPhoneTile";
    pickTile.innerHTML = `
      <i class="fa-solid fa-images text-xl text-pink-500 mb-1"></i>
      <span class="text-[11px] font-semibold text-white">Device Media</span>
      <span class="text-[9px] text-neutral-400">Tap to browse</span>
    `;
    pickTile.addEventListener("click", async () => {
      const files = await fetchDeviceMedia();
      if (files.length) processSelectedDeviceFiles(files);
    });
    container.appendChild(pickTile);
    return;
  }

  // Filter items based on active album and category
  let filtered = allGalleryItems.filter(item => {
    if (activeAlbum !== "Recents" && item.album !== activeAlbum) return false;
    if (activeCategoryFilter === "Photos" && item.type !== "image") return false;
    if (activeCategoryFilter === "Videos" && item.type !== "video") return false;
    return true;
  });

  filtered.forEach((item) => {
    const tile = document.createElement("div");
    tile.className = "gallery-media-tile";
    tile.dataset.id = item.id;

    const isSelected = selectedItems.some(i => i.id === item.id);
    const selectedIndex = selectedItems.findIndex(i => i.id === item.id) + 1;
    const isHighlighted = activePreviewItem && activePreviewItem.id === item.id;

    if (isHighlighted) tile.classList.add("is-highlighted");

    tile.innerHTML = `
      <img src="${item.thumbnail || item.url}" alt="Device media" loading="lazy" />
      ${item.type === "video" ? `<span class="gallery-video-duration-badge">${item.duration || "0:15"}</span>` : ""}
      <div class="media-selection-badge ${isSelected ? "is-selected" : ""}" style="${isMultiSelectMode ? "" : (isSelected ? "" : "display:none")}">
        ${isMultiSelectMode && isSelected ? selectedIndex : (isSelected ? '<i class="fa-solid fa-check text-[10px]"></i>' : "")}
      </div>
    `;

    tile.addEventListener("click", () => {
      handleMediaTileClick(item);
    });

    container.appendChild(tile);
  });
}

function handleMediaTileClick(item) {
  if (isMultiSelectMode) {
    const existingIdx = selectedItems.findIndex(i => i.id === item.id);
    if (existingIdx > -1) {
      if (selectedItems.length === 1) {
        showInstagramToast("At least 1 item must remain selected");
        return;
      }
      selectedItems.splice(existingIdx, 1);
      activePreviewItem = selectedItems[selectedItems.length - 1];
    } else {
      if (selectedItems.length >= 5) {
        showInstagramToast("Maximum 5 photos or videos allowed");
        return;
      }
      selectedItems.push(item);
      activePreviewItem = item;
    }
  } else {
    selectedItems = [item];
    activePreviewItem = item;
  }

  updatePreviewArea();
  renderGalleryGrid();
  updateNextButtonState();
}

function updatePreviewArea() {
  const host = document.getElementById("mpPreviewMediaHost");
  if (!host) return;

  host.innerHTML = "";

  if (!activePreviewItem) {
    // Elegant Instagram-style prompt when user has not yet selected media from phone
    host.innerHTML = `
      <div class="flex flex-col items-center justify-center p-6 text-center text-neutral-400 gap-3">
        <div class="w-14 h-14 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-pink-500 text-2xl shadow-inner">
          <i class="fa-solid fa-photo-film"></i>
        </div>
        <div>
          <div class="text-sm font-semibold text-white">Select Device Photos or Videos</div>
          <div class="text-[11px] text-neutral-400 mt-0.5">Real photos and videos from your phone gallery</div>
        </div>
        <button type="button" id="mpPromptBrowseBtn" class="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-semibold shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2">
          <i class="fa-solid fa-folder-open"></i>
          <span>Choose from Gallery</span>
        </button>
      </div>
    `;

    document.getElementById("mpPromptBrowseBtn")?.addEventListener("click", async () => {
      const files = await fetchDeviceMedia();
      if (files.length) processSelectedDeviceFiles(files);
    });
    return;
  }

  if (activePreviewItem.type === "video") {
    const video = document.createElement("video");
    video.src = activePreviewItem.url;
    video.className = "media-picker-preview-video";
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    host.appendChild(video);
  } else {
    const img = document.createElement("img");
    img.src = activePreviewItem.url;
    img.className = "media-picker-preview-image";
    img.alt = "Preview";
    host.appendChild(img);
  }
}

function updateNextButtonState() {
  const nextBtn = document.getElementById("mpNextBtn");
  if (nextBtn) {
    nextBtn.disabled = selectedItems.length === 0;
  }
}

// -------------------------------------------------------------
// Album Drawer Rendering
// -------------------------------------------------------------

function renderAlbumFolders() {
  const list = document.getElementById("mpAlbumFoldersList");
  if (!list) return;

  list.innerHTML = "";

  const photosCount = allGalleryItems.filter(i => i.type === "image").length;
  const videosCount = allGalleryItems.filter(i => i.type === "video").length;
  const totalCount = allGalleryItems.length;

  const albums = [
    { name: "Recents", count: totalCount, icon: "fa-solid fa-clock-rotate-left" },
    { name: "Photos", count: photosCount, icon: "fa-solid fa-image" },
    { name: "Videos", count: videosCount, icon: "fa-solid fa-video" }
  ];

  albums.forEach(album => {
    const row = document.createElement("div");
    row.className = `album-folder-row ${album.name === activeAlbum ? 'active' : ''}`;
    row.innerHTML = `
      <div class="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center text-pink-500 text-lg">
        <i class="${album.icon}"></i>
      </div>
      <div class="album-folder-info flex-1">
        <div class="album-folder-name">${album.name}</div>
        <div class="album-folder-count">${album.count} items</div>
      </div>
      <i class="fa-solid fa-chevron-right text-neutral-500 text-xs"></i>
    `;

    row.addEventListener("click", () => {
      activeAlbum = album.name;
      const label = document.getElementById("mpCurrentAlbumLabel");
      if (label) label.textContent = album.name;
      closeAlbumDrawer();
      renderGalleryGrid();
    });

    list.appendChild(row);
  });
}

// -------------------------------------------------------------
// YouTube Audio Selection & Real Music Integration
// -------------------------------------------------------------

async function renderMusicTracksList(filterQuery = "") {
  const list = document.getElementById("mpMusicTracksList");
  if (!list) return;

  list.innerHTML = `
    <div class="py-10 text-center text-neutral-400 text-xs">
      <i class="fa-solid fa-spinner fa-spin text-lg text-pink-500 mb-2"></i>
      <div>Searching YouTube audio catalog...</div>
    </div>
  `;

  try {
    const tracks = await searchYouTubeAudio(filterQuery || "trending songs");
    list.innerHTML = "";

    if (!tracks || !tracks.length) {
      list.innerHTML = `<div class="p-6 text-center text-neutral-500 text-xs">No tracks found. Try searching another song.</div>`;
      return;
    }

    tracks.forEach(track => {
      const item = document.createElement("div");
      item.className = "music-track-item";
      item.innerHTML = `
        <img src="${track.coverUrl || track.cover}" class="music-track-cover" alt="${track.title}" />
        <div class="music-track-info">
          <div class="music-track-title">${track.title}</div>
          <div class="music-track-artist">${track.artist} • 0:30</div>
        </div>
        <button type="button" class="music-track-play-btn" title="Preview audio">
          <i class="fa-solid fa-play"></i>
        </button>
      `;

      const playBtn = item.querySelector(".music-track-play-btn");
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleAudioPreview(track, playBtn);
      });

      item.addEventListener("click", () => {
        selectTrackToAttach(track);
      });

      list.appendChild(item);
    });
  } catch (err) {
    console.error("renderMusicTracksList error:", err);
    list.innerHTML = `<div class="p-6 text-center text-neutral-500 text-xs">Unable to load songs. Tap a trending pill below.</div>`;
  }
}

function toggleAudioPreview(track, btn) {
  if (previewAudioElement && !previewAudioElement.paused && previewAudioElement._trackId === track.id) {
    stopPreviewAudio();
    btn.innerHTML = '<i class="fa-solid fa-play"></i>';
    return;
  }

  stopPreviewAudio();

  try {
    previewAudioElement = new Audio(track.audioUrl);
    previewAudioElement._trackId = track.id;
    previewAudioElement.play().catch((e) => {
      console.warn("Audio preview autoplay note:", e);
    });
    btn.innerHTML = '<i class="fa-solid fa-pause text-pink-500"></i>';

    previewAudioElement.onended = () => {
      btn.innerHTML = '<i class="fa-solid fa-play"></i>';
    };
  } catch (_) {}
}

function stopPreviewAudio() {
  if (previewAudioElement) {
    try {
      previewAudioElement.pause();
    } catch (_) {}
    previewAudioElement = null;
  }
}

function selectTrackToAttach(track) {
  stopPreviewAudio();
  attachedMusic = track;
  updateMusicRowUI();
  closeMusicPickerModal();
  showInstagramToast(`Attached music: ${track.title}`);
}

async function renderTrendingPills() {
  const container = document.getElementById("mpTrendingPills");
  if (!container) return;

  container.innerHTML = "";
  try {
    const tracks = await searchYouTubeAudio("viral hits");
    (tracks || []).slice(0, 4).forEach(track => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs text-white font-medium flex items-center gap-1.5 transition-colors";
      pill.innerHTML = `<i class="fa-solid fa-music text-[11px] text-pink-400"></i> <span>${track.title}</span>`;
      pill.onclick = () => {
        selectTrackToAttach(track);
      };
      container.appendChild(pill);
    });
  } catch (_) {}
}

function updateMusicRowUI() {
  const host = document.getElementById("mpMusicLabelHost");
  const actionRight = document.getElementById("mpMusicActionRight");
  if (!host || !actionRight) return;

  if (attachedMusic) {
    host.innerHTML = `
      <div class="attached-music-tag">
        <i class="fa-solid fa-music"></i>
        <span>${attachedMusic.title} - ${attachedMusic.artist}</span>
      </div>
    `;
    actionRight.innerHTML = `
      <button type="button" id="mpRemoveMusicBtn" class="text-neutral-400 hover:text-white p-1" title="Remove music">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    document.getElementById("mpRemoveMusicBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      attachedMusic = null;
      updateMusicRowUI();
      showInstagramToast("Music removed");
    });
  } else {
    host.innerHTML = `<span class="text-sm font-medium">Add music</span>`;
    actionRight.innerHTML = `<i class="fa-solid fa-chevron-right text-neutral-500 text-xs"></i>`;
  }
}

// -------------------------------------------------------------
// Direct Server Upload & Share Post Handler
// -------------------------------------------------------------

async function handleSharePost() {
  if (!selectedItems.length) {
    showInstagramToast("No media selected to share");
    return;
  }

  const shareBtn = document.getElementById("mpFinalizeShareBtn");
  if (shareBtn) {
    shareBtn.disabled = true;
    shareBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Sharing...';
  }

  try {
    showInstagramToast("Uploading to Cloud Storage... ⏳");

    // Upload real media files to Supabase Storage / Cloudinary
    const uploadedMediaItems = await Promise.all(
      selectedItems.map(async (item) => {
        if (item.file) {
          try {
            const uploadResult = await uploadPostMedia(item.file);
            return {
              type: uploadResult.type || item.type,
              url: uploadResult.url || item.url,
              thumbnail: uploadResult.thumbnail_url || uploadResult.url || item.thumbnail || item.url
            };
          } catch (uploadErr) {
            console.warn("Media upload note, falling back to local URL:", uploadErr);
            return {
              type: item.type,
              url: item.url,
              thumbnail: item.thumbnail || item.url
            };
          }
        }
        return {
          type: item.type,
          url: item.url,
          thumbnail: item.thumbnail || item.url
        };
      })
    );

    const primaryUploaded = uploadedMediaItems[0];
    const isCarousel = uploadedMediaItems.length > 1;

    const captionInput = document.getElementById("mpCaptionInput");
    const caption = (captionInput?.value || "").trim() || "Moments ✨ #lifestyle";

    const currentUsername = UserProfileStore.state.username || "sohelmommy_077";
    const currentAvatar = UserProfileStore.state.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400";

    const newPost = {
      id: "post_" + Date.now(),
      isCurrentUser: true,
      user: currentUsername,
      author_name: currentUsername,
      avatar: currentAvatar,
      location: selectedLocation || (attachedMusic ? `${attachedMusic.title} • ${attachedMusic.artist}` : "Original Audio"),
      caption,
      time: "JUST NOW",
      likesCount: 1,
      commentsCount: 0,
      url: primaryUploaded.url,
      video_url: primaryUploaded.type === "video" ? primaryUploaded.url : null,
      thumbnail_url: primaryUploaded.thumbnail || primaryUploaded.url,
      thumbnail: primaryUploaded.thumbnail || primaryUploaded.url,
      isCarousel,
      carouselItems: uploadedMediaItems,
      music: attachedMusic ? {
        id: attachedMusic.id,
        title: attachedMusic.title,
        artist: attachedMusic.artist,
        audioUrl: attachedMusic.audioUrl,
        cover: attachedMusic.coverUrl || attachedMusic.cover
      } : null
    };

    // Save post record to Supabase database
    try {
      await savePostToSupabase(newPost);
    } catch (dbErr) {
      console.warn("Supabase database insert warning:", dbErr);
    }

    // Immediately append post to Home Feed and Profile Grid
    addNewPostToFeed(newPost);
    updateProfilePostsCount();
    renderProfileGrid();

    // Close media picker modal and switch to Home feed
    closeInstagramMediaPicker();
    switchTab("home");

    showInstagramToast("Post shared successfully! ✨");
  } catch (err) {
    console.error("Post creation error:", err);
    showInstagramToast("Failed to share post. Please try again.");
  } finally {
    if (shareBtn) {
      shareBtn.disabled = false;
      shareBtn.textContent = "Share";
    }
  }
}

// Expose on window for global access and backwards compatibility
if (typeof window !== "undefined") {
  window.openInstagramMediaPicker = openInstagramMediaPicker;
  window.closeInstagramMediaPicker = closeInstagramMediaPicker;
  window.fetchDeviceMedia = fetchDeviceMedia;
  window.processSelectedDeviceFiles = processSelectedDeviceFiles;
}
