// Instagram-Style Media Picker, Recents Album Selector, Multi-Photo Carousel (Up to 5), and 30s Audio Post Sync
import { showInstagramToast, UserProfileStore } from "../../utils/storage.js";
import { openCameraMicrophoneSession } from "../Modals.js";
import { TRENDING_TRACKS } from "../../utils/audioCatalog.js";
import { renderHomeFeed, addNewPostToFeed } from "../Feed.js";
import { renderProfileGrid, updateProfilePostsCount } from "../Profile.js";
import { switchTab } from "../BottomNavigation.js";

// Comprehensive catalog of high-resolution sample device media organized by album
const INITIAL_GALLERY_MEDIA = [
  {
    id: "media_1",
    type: "image",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    album: "Camera",
    aspectRatio: "4/5"
  },
  {
    id: "media_2",
    type: "image",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1080&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
    album: "Camera",
    aspectRatio: "4/5"
  },
  {
    id: "media_3",
    type: "video",
    url: "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-light-1232-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80",
    duration: "0:15",
    album: "Camera",
    aspectRatio: "9/16"
  },
  {
    id: "media_4",
    type: "image",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=1080&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
    album: "Screenshots",
    aspectRatio: "4/5"
  },
  {
    id: "media_5",
    type: "image",
    url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1080&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80",
    album: "Downloads",
    aspectRatio: "4/5"
  },
  {
    id: "media_6",
    type: "video",
    url: "https://assets.mixkit.co/videos/preview/mixkit-vertical-portrait-of-a-woman-in-sunlight-41566-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
    duration: "0:22",
    album: "Instagram",
    aspectRatio: "9/16"
  },
  {
    id: "media_7",
    type: "image",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    album: "Camera",
    aspectRatio: "4/5"
  },
  {
    id: "media_8",
    type: "image",
    url: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=1080&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400&auto=format&fit=crop&q=80",
    album: "WhatsApp",
    aspectRatio: "4/5"
  },
  {
    id: "media_9",
    type: "video",
    url: "https://assets.mixkit.co/videos/preview/mixkit-skater-performing-a-trick-in-the-street-41551-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1564982752979-3f7bc974d29a?w=400&auto=format&fit=crop&q=80",
    duration: "0:18",
    album: "Downloads",
    aspectRatio: "9/16"
  },
  {
    id: "media_10",
    type: "image",
    url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=1080&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80",
    album: "Screenshots",
    aspectRatio: "4/5"
  },
  {
    id: "media_11",
    type: "image",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1080&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80",
    album: "Camera",
    aspectRatio: "4/5"
  },
  {
    id: "media_12",
    type: "image",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&auto=format&fit=crop&q=80",
    album: "Downloads",
    aspectRatio: "4/5"
  }
];

// Album metadata list
const ALBUMS_LIST = [
  { id: "all", name: "Recents", count: 24, thumb: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200" },
  { id: "Camera", name: "Camera", count: 12, thumb: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200" },
  { id: "Screenshots", name: "Screenshots", count: 6, thumb: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200" },
  { id: "Downloads", name: "Downloads", count: 8, thumb: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200" },
  { id: "Instagram", name: "Instagram", count: 5, thumb: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200" },
  { id: "WhatsApp", name: "WhatsApp", count: 7, thumb: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200" }
];

// State
let allGalleryItems = [...INITIAL_GALLERY_MEDIA];
let activeAlbum = "Recents";
let activeCategoryFilter = "Recents"; // "Recents" | "Photos" | "Videos"
let activeTab = "POST"; // Strictly "POST" | "STORY"
let isMultiSelectMode = false;
let selectedItems = [INITIAL_GALLERY_MEDIA[0]]; // Array of selected media objects (max 5)
let activePreviewItem = INITIAL_GALLERY_MEDIA[0];
let isAspect45 = true; // 4:5 aspect ratio toggle

// Post Finalize State
let attachedMusic = null; // { id, title, artist, audioUrl, cover }
let selectedLocation = "";
let previewAudioElement = null;

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
        <!-- Rendered dynamically: img or video -->
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
          <label class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold cursor-pointer transition-colors">
            <i class="fa-solid fa-folder-open text-sky-400"></i>
            <span>Choose from Device Files / Gallery</span>
            <input type="file" id="mpDeviceFileInput" accept="image/*,video/*" multiple class="hidden" />
          </label>
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
        <div class="text-xs font-semibold text-neutral-400 mb-2.5">Trending Tracks</div>
        <div class="flex flex-wrap gap-2" id="mpTrendingPills">
          <!-- Populated from catalog -->
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
          <input type="text" id="mpMusicSearchInput" placeholder="Search music or artists..." />
        </div>
      </div>
      <div class="music-picker-list" id="mpMusicTracksList">
        <!-- Track items injected here -->
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
    isMultiSelectMode = !isMultiSelectMode;
    multiBtn.classList.toggle("is-active", isMultiSelectMode);

    if (isMultiSelectMode) {
      // Ensure current active item is in selected list
      if (!selectedItems.some(i => i.id === activePreviewItem.id)) {
        selectedItems = [activePreviewItem];
      }
      showInstagramToast("Multi-select active (up to 5 items)");
    } else {
      // Switch back to single selection of current preview
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

  // Device File Upload Handler
  const fileInput = document.getElementById("mpDeviceFileInput");
  fileInput?.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      const isVid = file.type.startsWith("video");
      const url = URL.createObjectURL(file);
      const newItem = {
        id: "upload_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
        type: isVid ? "video" : "image",
        url,
        thumbnail: url,
        duration: isVid ? "0:15" : undefined,
        album: "Camera",
        aspectRatio: "4/5",
        file
      };
      allGalleryItems.unshift(newItem);
    });

    closeAlbumDrawer();
    activePreviewItem = allGalleryItems[0];
    selectedItems = [allGalleryItems[0]];
    renderGalleryGrid();
    updatePreviewArea();
    showInstagramToast(`Added ${files.length} item(s) from device`);
  });

  // Next Button -> Opens Post Finalize Screen
  document.getElementById("mpNextBtn")?.addEventListener("click", () => {
    if (!selectedItems.length) return;
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

  // Music Search Input
  document.getElementById("mpMusicSearchInput")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    renderMusicTracksList(q);
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

  // Share Button
  document.getElementById("mpFinalizeShareBtn")?.addEventListener("click", () => {
    handleSharePost();
  });
}

// -------------------------------------------------------------
// Screen Display Toggles
// -------------------------------------------------------------

export function openInstagramMediaPicker() {
  initInstagramMediaPicker();

  const modal = document.getElementById("instagramMediaPickerModal");
  if (!modal) return;

  // Reset to default state
  activeAlbum = "Recents";
  activeCategoryFilter = "Recents";
  isMultiSelectMode = false;
  selectedItems = [allGalleryItems[0] || INITIAL_GALLERY_MEDIA[0]];
  activePreviewItem = selectedItems[0];
  attachedMusic = null;
  selectedLocation = "";

  const multiBtn = document.getElementById("mpMultiSelectToggleBtn");
  if (multiBtn) multiBtn.classList.remove("is-active");

  const albumLbl = document.getElementById("mpCurrentAlbumLabel");
  if (albumLbl) albumLbl.textContent = "Recents";

  renderGalleryGrid();
  renderAlbumFolders();
  updatePreviewArea();
  updateNextButtonState();

  modal.classList.add("active");
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

  // Set thumbnail
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

  // Render trending pills
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

  // Remove existing media items, keeping first camera tile
  const cameraTile = document.getElementById("mpCameraShortcutTile");
  container.innerHTML = "";
  if (cameraTile) container.appendChild(cameraTile);

  // Filter items based on active album and category
  let filtered = allGalleryItems.filter(item => {
    // Album filter
    if (activeAlbum !== "Recents" && item.album !== activeAlbum) return false;
    // Category filter
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
      <img src="${item.thumbnail || item.url}" alt="Gallery media" loading="lazy" />
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
      // Deselect item
      if (selectedItems.length === 1) {
        showInstagramToast("At least 1 item must remain selected");
        return;
      }
      selectedItems.splice(existingIdx, 1);
      // Set preview to last selected item
      activePreviewItem = selectedItems[selectedItems.length - 1];
    } else {
      // Select new item up to limit of 5
      if (selectedItems.length >= 5) {
        showInstagramToast("Maximum 5 photos or videos allowed");
        return;
      }
      selectedItems.push(item);
      activePreviewItem = item;
    }
  } else {
    // Single select mode
    selectedItems = [item];
    activePreviewItem = item;
  }

  updatePreviewArea();
  renderGalleryGrid();
  updateNextButtonState();
}

function updatePreviewArea() {
  const host = document.getElementById("mpPreviewMediaHost");
  if (!host || !activePreviewItem) return;

  host.innerHTML = "";

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

  ALBUMS_LIST.forEach(album => {
    const row = document.createElement("div");
    row.className = "album-folder-row";
    row.innerHTML = `
      <img src="${album.thumb}" class="album-folder-thumb" alt="${album.name}" />
      <div class="album-folder-info">
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
// Music Selection & Audio Sync
// -------------------------------------------------------------

function renderMusicTracksList(filterQuery = "") {
  const list = document.getElementById("mpMusicTracksList");
  if (!list) return;

  list.innerHTML = "";

  const tracks = TRENDING_TRACKS.filter(t => {
    if (!filterQuery) return true;
    return t.title.toLowerCase().includes(filterQuery) || t.artist.toLowerCase().includes(filterQuery);
  });

  tracks.forEach(track => {
    const item = document.createElement("div");
    item.className = "music-track-item";
    item.innerHTML = `
      <img src="${track.cover}" class="music-track-cover" alt="${track.title}" />
      <div class="music-track-info">
        <div class="music-track-title">${track.title}</div>
        <div class="music-track-artist">${track.artist} • 0:30</div>
      </div>
      <button type="button" class="music-track-play-btn" title="Preview audio">
        <i class="fa-solid fa-play"></i>
      </button>
    `;

    // Preview play/pause
    const playBtn = item.querySelector(".music-track-play-btn");
    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleAudioPreview(track, playBtn);
    });

    // Select track to attach
    item.addEventListener("click", () => {
      selectTrackToAttach(track);
    });

    list.appendChild(item);
  });
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
    previewAudioElement.play().catch(() => {});
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

function renderTrendingPills() {
  const container = document.getElementById("mpTrendingPills");
  if (!container) return;

  container.innerHTML = "";
  TRENDING_TRACKS.slice(0, 4).forEach(track => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs text-white font-medium flex items-center gap-1.5 transition-colors";
    pill.innerHTML = `<i class="fa-solid fa-music text-[11px] text-pink-400"></i> <span>${track.title}</span>`;
    pill.onclick = () => {
      selectTrackToAttach(track);
    };
    container.appendChild(pill);
  });
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
// Share Post Handler
// -------------------------------------------------------------

function handleSharePost() {
  const captionInput = document.getElementById("mpCaptionInput");
  const caption = (captionInput?.value || "").trim() || "Moments ✨ #lifestyle";

  // Package post with carousel media (up to 5 items) and 30s music sync
  const postItems = selectedItems.map(item => ({
    type: item.type,
    url: item.url,
    thumbnail: item.thumbnail || item.url
  }));

  const primaryItem = selectedItems[0];
  const isCarousel = postItems.length > 1;

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
    url: primaryItem.url,
    video_url: primaryItem.type === "video" ? primaryItem.url : null,
    thumbnail_url: primaryItem.thumbnail || primaryItem.url,
    thumbnail: primaryItem.thumbnail || primaryItem.url,
    // Carousel structure
    isCarousel,
    carouselItems: postItems,
    // 30-Second Music Attachment
    music: attachedMusic ? {
      id: attachedMusic.id,
      title: attachedMusic.title,
      artist: attachedMusic.artist,
      audioUrl: attachedMusic.audioUrl,
      cover: attachedMusic.cover
    } : null
  };

  // Prepend to Feed
  addNewPostToFeed(newPost);

  // Close media picker modal
  closeInstagramMediaPicker();

  // Switch to Home feed
  switchTab("home");

  // Refresh profile counts and grid
  updateProfilePostsCount();
  renderProfileGrid();

  showInstagramToast("Post shared successfully! ✨");
}

// Expose on window for inline handlers and backwards compatibility
if (typeof window !== "undefined") {
  window.openInstagramMediaPicker = openInstagramMediaPicker;
  window.closeInstagramMediaPicker = closeInstagramMediaPicker;
}
