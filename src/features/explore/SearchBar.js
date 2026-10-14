// src/features/explore/SearchBar.js - Top Sticky Search Bar Component
import { showInstagramToast } from "../../utils/storage.js";

/**
 * Builds the Instagram-style sticky top search bar header element
 * @param {Object} options
 * @param {Function} options.onSearchClick Callback when search pill is tapped
 * @param {Function} options.onBookmarkClick Callback when bookmark button is tapped
 */
export function buildSearchBarElement({ onSearchClick, onBookmarkClick } = {}) {
  const header = document.createElement("header");
  header.className = "explore-search-header shrink-0";
  header.id = "exploreTopSearchBar";

  header.innerHTML = `
    <div class="explore-search-header-inner flex items-center gap-3 px-3.5 h-[50px] w-full">
      <!-- Search Input Trigger Pill -->
      <div 
        class="explore-search-pill-btn flex-1 flex items-center gap-2.5 px-3.5 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 cursor-pointer select-none transition-all active:scale-[0.99] hover:border-neutral-300 dark:hover:border-neutral-700" 
        id="exploreSearchInputTrigger"
        role="button"
        tabindex="0"
        title="Search with Flash AI"
      >
        <i class="fa-solid fa-magnifying-glass text-[13px] text-neutral-400 dark:text-neutral-500"></i>
        <span class="text-[13.5px] font-normal text-neutral-400 dark:text-neutral-500 truncate">Search with Flash AI</span>
      </div>

      <!-- Bookmark / Saved Shortcut Button -->
      <button 
        type="button" 
        class="explore-bookmark-btn w-9 h-9 rounded-xl flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 active:scale-95 transition-all cursor-pointer shrink-0" 
        id="exploreBookmarkBtn"
        title="Saved Posts"
        aria-label="Saved Posts"
      >
        <i class="fa-regular fa-bookmark text-[18px]"></i>
      </button>
    </div>
  `;

  const pill = header.querySelector("#exploreSearchInputTrigger");
  pill?.addEventListener("click", () => {
    if (typeof onSearchClick === "function") {
      onSearchClick();
    }
  });

  const bookmarkBtn = header.querySelector("#exploreBookmarkBtn");
  bookmarkBtn?.addEventListener("click", () => {
    if (typeof onBookmarkClick === "function") {
      onBookmarkClick();
    } else {
      showInstagramToast("Saved posts collection 📌");
    }
  });

  return header;
}
