// src/features/explore/ExploreView.js - Instagram-Style Explore Grid View Component
import { exploreService } from "./exploreService.js";
import { buildSearchBarElement } from "./SearchBar.js";
import { buildSearchActiveOverlayElement, openSearchActiveOverlay } from "./SearchActiveOverlay.js";
import { navigateToReel } from "../../components/ReelsViewer.js";
import { openProfilePostModal } from "../../components/Profile.js";
import { showInstagramToast } from "../../utils/storage.js";

let exploreMounted = false;

/**
 * Initializes and mounts the Explore View inside #exploreView
 */
export function initExploreView() {
  const container = document.getElementById("exploreView");
  if (!container) return;

  // Render shell once
  if (!exploreMounted || !container.querySelector(".explore-content-container")) {
    container.innerHTML = "";
    container.className = "view-section active bg-white dark:bg-black text-neutral-900 dark:text-white transition-colors duration-200 flex flex-col";
    container.style.display = "flex";

    // 1. Sticky Top Search Header
    const searchHeader = buildSearchBarElement({
      onSearchClick: (query) => openSearchActiveOverlay(query),
      onBookmarkClick: () => {
        showInstagramToast("Saved Collections • 14 Bookmarks 📌");
      }
    });
    container.appendChild(searchHeader);

    // 2. Scrollable Grid Container
    const scrollContainer = document.createElement("div");
    scrollContainer.className = "explore-content-container flex-1 overflow-y-auto overscroll-contain";
    scrollContainer.id = "exploreScrollContainer";

    const grid = document.createElement("div");
    grid.className = "explore-media-grid";
    grid.id = "exploreMediaGrid";
    scrollContainer.appendChild(grid);

    container.appendChild(scrollContainer);

    // 3. Search Active Full-Screen Overlay
    const overlay = buildSearchActiveOverlayElement();
    container.appendChild(overlay);

    exploreMounted = true;
  }

  // Populate grid: Instant synchronous cache first (zero flicker)
  const cached = exploreService.getCachedFeed();
  renderExploreGridItems(cached);

  // Background fresh fetch
  exploreService.fetchExploreFeed().then(fresh => {
    if (fresh && fresh.length > 0) {
      renderExploreGridItems(fresh);
    }
  }).catch(err => {
    console.warn("Explore feed background refresh error:", err);
  });
}

/**
 * Renders the 3-column responsive staggered grid items
 */
export function renderExploreGridItems(items = []) {
  const grid = document.getElementById("exploreMediaGrid");
  if (!grid || !Array.isArray(items)) return;

  grid.innerHTML = "";

  items.forEach((item, index) => {
    const card = document.createElement("div");
    const isSpan2 = Boolean(item.isSpan2 || (index % 6 === 1 && item.isReel));

    card.className = `explore-grid-item ${isSpan2 ? 'explore-span-2' : ''}`;
    card.dataset.id = item.id;
    card.dataset.type = item.type;

    const poster = item.thumbnail || item.url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500";
    const viewsLabel = item.views || `${Math.floor(Math.random() * 800) + 40}K`;

    let topBadgeHtml = "";
    if (item.isReel || item.video_url || item.type === "video") {
      topBadgeHtml = `<span class="explore-item-type-badge"><i class="fa-solid fa-play"></i></span>`;
    } else if (item.isCarousel || (item.carouselItems && item.carouselItems.length > 1)) {
      topBadgeHtml = `<span class="explore-item-type-badge"><i class="fa-regular fa-clone"></i></span>`;
    }

    card.innerHTML = `
      <img 
        src="${poster}" 
        alt="${item.caption || 'Explore'}" 
        class="explore-item-media" 
        loading="lazy" 
        crossorigin="anonymous"
        onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';"
      />
      <div class="explore-item-overlay"></div>
      ${topBadgeHtml}
      <!-- Bottom-Left Eye View Counter Badge -->
      <div class="explore-view-counter">
        <i class="fa-solid fa-eye text-[11px]"></i>
        <span>${viewsLabel}</span>
      </div>
    `;

    // Direct Reels Navigation from Search Grid (Requirement 2)
    card.addEventListener("click", () => {
      const targetMediaUrl = item.video_url || item.url;
      navigateToReel(item.id, targetMediaUrl, item);
    });

    grid.appendChild(card);
  });
}
