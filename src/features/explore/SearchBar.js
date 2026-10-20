// src/features/explore/SearchBar.js - Top Sticky Search Bar Component with Live Supabase Search
import { showInstagramToast } from "../../utils/storage.js";
import { searchSupabaseUsers } from "../../services/chatService.js";
import { openDirectChatWithUser } from "../../components/DirectChat.js";
import { debounce } from "./exploreService.js";

/**
 * Builds the Instagram-style sticky top search bar header element
 * @param {Object} options
 * @param {Function} options.onSearchClick Callback when search overlay requested
 * @param {Function} options.onBookmarkClick Callback when bookmark button is tapped
 */
export function buildSearchBarElement({ onSearchClick, onBookmarkClick } = {}) {
  const header = document.createElement("header");
  header.className = "explore-search-header shrink-0 sticky top-0 z-50 w-full";
  header.id = "exploreTopSearchBar";

  header.innerHTML = `
    <div class="explore-search-header-inner flex items-center gap-2.5 px-3.5 h-[48px] w-full relative">
      <!-- Search Input Container -->
      <div 
        class="explore-search-box flex-1 flex items-center gap-2.5 px-3.5 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 focus-within:border-sky-500 transition-all shadow-2xs pointer-events-auto"
        id="exploreSearchBoxWrapper"
      >
        <i class="fa-solid fa-magnifying-glass text-[13.5px] text-neutral-400 dark:text-neutral-500 shrink-0"></i>
        <input 
          type="text" 
          id="exploreSearchMainInput" 
          placeholder="Search accounts, reels & tags..." 
          class="flex-1 min-w-0 bg-transparent border-none outline-none text-[13.5px] text-neutral-900 dark:text-white placeholder:text-neutral-400 p-0" 
          autocomplete="off" 
          spellcheck="false" 
          title="Search users & reels"
        />
        <button 
          type="button" 
          id="exploreSearchMainClearBtn" 
          class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hidden shrink-0 cursor-pointer p-1" 
          title="Clear search"
          aria-label="Clear search"
        >
          <i class="fa-solid fa-circle-xmark text-[13px]"></i>
        </button>
      </div>

      <!-- Bookmark / Saved Shortcut Button -->
      <button 
        type="button" 
        class="explore-bookmark-btn w-9 h-9 rounded-xl flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 active:scale-95 transition-all cursor-pointer shrink-0 pointer-events-auto" 
        id="exploreBookmarkBtn"
        title="Saved Posts"
        aria-label="Saved Posts"
      >
        <i class="fa-regular fa-bookmark text-[18px]"></i>
      </button>
    </div>

    <!-- Live Search Dropdown for Instant Supabase User Search -->
    <div 
      id="exploreLiveSearchDropdown" 
      class="explore-live-search-dropdown hidden divide-y divide-neutral-100 dark:divide-neutral-800/60"
    >
      <!-- Injected dynamically on user typing -->
    </div>
  `;

  const input = header.querySelector("#exploreSearchMainInput");
  const clearBtn = header.querySelector("#exploreSearchMainClearBtn");
  const dropdown = header.querySelector("#exploreLiveSearchDropdown");
  const bookmarkBtn = header.querySelector("#exploreBookmarkBtn");

  // Debounced search handler for querying Supabase profiles
  const performLiveSearch = debounce(async (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      dropdown.classList.add("hidden");
      dropdown.innerHTML = "";
      return;
    }

    dropdown.classList.remove("hidden");
    dropdown.innerHTML = `
      <div class="px-4 py-3 flex items-center gap-2 text-xs text-neutral-400">
        <i class="fa-solid fa-circle-notch fa-spin text-sky-500"></i>
        <span>Searching users in Supabase...</span>
      </div>
    `;

    try {
      const users = await searchSupabaseUsers(trimmed);
      if (!users || users.length === 0) {
        dropdown.innerHTML = `
          <div class="p-4 text-center">
            <p class="text-[13px] text-neutral-500 dark:text-neutral-400">No users found matching "<strong>${escapeHtml(trimmed)}</strong>"</p>
            <button 
              type="button" 
              id="exploreDropdownSearchAllBtn" 
              class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 transition-colors"
            >
              <i class="fa-solid fa-magnifying-glass text-[11px]"></i>
              <span>Search tags, audio & reels for "${escapeHtml(trimmed)}"</span>
            </button>
          </div>
        `;
        dropdown.querySelector("#exploreDropdownSearchAllBtn")?.addEventListener("click", () => {
          dropdown.classList.add("hidden");
          if (typeof onSearchClick === "function") {
            onSearchClick(trimmed);
          }
        });
        return;
      }

      dropdown.innerHTML = `
        <div class="px-4 py-2 bg-neutral-50/80 dark:bg-neutral-900/40 flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
          <div class="flex items-center gap-1.5 text-sky-500">
            <i class="fa-solid fa-users text-[10px]"></i>
            <span>Supabase Users (${users.length})</span>
          </div>
          <span class="text-[10px] text-neutral-400 lowercase font-normal">tap to direct message</span>
        </div>
        <div class="py-1">
          ${users.map(u => `
            <div 
              class="explore-dropdown-user-row flex items-center justify-between px-3.5 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900/60 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors cursor-pointer"
              data-user-id="${escapeHtml(u.id)}"
              data-username="${escapeHtml(u.username)}"
              data-name="${escapeHtml(u.name || u.username)}"
              data-avatar="${escapeHtml(u.avatar || '')}"
            >
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <img 
                  src="${u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" 
                  class="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-800 shrink-0" 
                  alt="${escapeHtml(u.username)}" 
                  onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';" 
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 leading-tight">
                    <span class="font-bold text-[13.5px] text-neutral-900 dark:text-white truncate">@${escapeHtml(u.username)}</span>
                  </div>
                  <div class="text-[12px] text-neutral-500 dark:text-neutral-400 truncate leading-tight">${escapeHtml(u.name || u.username)}</div>
                </div>
              </div>
              <button 
                type="button" 
                class="dropdown-open-dm-btn ml-2 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-[12px] font-semibold flex items-center gap-1.5 shrink-0 shadow-2xs pointer-events-auto"
                title="Direct Message"
              >
                <i class="fa-regular fa-paper-plane text-[11px]"></i>
                <span>Message</span>
              </button>
            </div>
          `).join('')}
        </div>
        <div class="p-2.5 bg-neutral-50/50 dark:bg-neutral-900/20 text-center">
          <button 
            type="button" 
            id="exploreDropdownSearchAllBtn" 
            class="w-full py-1.5 text-xs font-semibold text-sky-500 hover:text-sky-600 transition-colors"
          >
            Explore all tags, audio & reels for "${escapeHtml(trimmed)}" →
          </button>
        </div>
      `;

      // Bind click events on user rows -> Open Direct Chat with user
      dropdown.querySelectorAll(".explore-dropdown-user-row").forEach(row => {
        row.addEventListener("click", () => {
          const userObj = {
            id: row.dataset.userId,
            username: row.dataset.username,
            name: row.dataset.name,
            avatar: row.dataset.avatar
          };
          dropdown.classList.add("hidden");
          if (input) input.value = "";
          clearBtn?.classList.add("hidden");
          openDirectChatWithUser(userObj);
        });
      });

      dropdown.querySelector("#exploreDropdownSearchAllBtn")?.addEventListener("click", () => {
        dropdown.classList.add("hidden");
        if (typeof onSearchClick === "function") {
          onSearchClick(trimmed);
        }
      });
    } catch (err) {
      console.warn("[SearchBar] Live user search error:", err);
      dropdown.innerHTML = `
        <div class="p-4 text-center text-xs text-neutral-400">
          Could not load users. Please check your connection.
        </div>
      `;
    }
  }, 150);

  // Input typing listener
  input?.addEventListener("input", (e) => {
    const val = e.target.value;
    if (val.trim()) {
      clearBtn?.classList.remove("hidden");
    } else {
      clearBtn?.classList.add("hidden");
    }
    performLiveSearch(val);
  });

  // Clear button click
  clearBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (input) {
      input.value = "";
      clearBtn.classList.add("hidden");
      dropdown.classList.add("hidden");
      dropdown.innerHTML = "";
      input.focus();
    }
  });

  // Enter key opens full overlay if desired
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = input.value.trim();
      if (val) {
        dropdown.classList.add("hidden");
        if (typeof onSearchClick === "function") {
          onSearchClick(val);
        }
      }
    }
  });

  // Close dropdown on outside click
  document.addEventListener("click", (e) => {
    if (!header.contains(e.target)) {
      dropdown?.classList.add("hidden");
    }
  });

  // Bookmark Button
  bookmarkBtn?.addEventListener("click", () => {
    if (typeof onBookmarkClick === "function") {
      onBookmarkClick();
    } else {
      showInstagramToast("Saved posts collection 📌");
    }
  });

  return header;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
