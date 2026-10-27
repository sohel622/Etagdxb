// src/features/explore/SearchActiveOverlay.js - Dedicated Active Search Overlay Component
import { exploreService, debounce, TRENDING_TAGS } from "./exploreService.js";
import { openProfile } from "../../components/Profile.js";
import { navigateToReel } from "../../components/ReelsViewer.js";
import { openProfilePostModal } from "../../components/Profile.js";
import { searchYouTubeAudio } from "../../services/youtubeMusicService.js";
import { openDirectChatWithUser } from "../../components/DirectChat.js";
import { searchSupabaseUsers } from "../../services/chatService.js";

let activeOverlayInstance = null;
let currentFilter = "Top"; // "Top" | "Accounts" | "Audio" | "Tags" | "Reels"
let activeSearchAudio = null;

export function buildSearchActiveOverlayElement() {
  const overlay = document.createElement("div");
  overlay.id = "exploreSearchActiveOverlay";
  overlay.className = "explore-search-active-overlay absolute inset-0 z-50 bg-white dark:bg-black text-neutral-900 dark:text-white flex flex-col transition-all duration-200 opacity-0 pointer-events-none";

  overlay.innerHTML = `
    <!-- Top Active Header Bar -->
    <header class="explore-active-header flex items-center gap-2.5 px-3 min-h-[52px] pt-[max(var(--safe-area-top,24px),env(safe-area-inset-top,24px),24px)] pb-2 border-b border-neutral-100 dark:border-neutral-800/80 shrink-0 bg-white dark:bg-black">
      <button 
        type="button" 
        id="exploreSearchBackBtn" 
        class="w-9 h-9 rounded-full flex items-center justify-center text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer shrink-0" 
        title="Back to Explore"
        aria-label="Back to Explore"
      >
        <i class="fa-solid fa-arrow-left text-[17px]"></i>
      </button>

      <!-- Active Search Input Box -->
      <div class="flex-1 flex items-center gap-2 px-3 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 focus-within:border-sky-500 dark:focus-within:border-sky-500 transition-colors">
        <i class="fa-solid fa-magnifying-glass text-[13px] text-neutral-400 shrink-0"></i>
        <input 
          type="text" 
          id="exploreSearchActiveInput" 
          class="flex-1 min-w-0 bg-transparent text-[14px] text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400 border-none p-0" 
          placeholder="Search accounts, music, tags, reels..." 
          autocomplete="off" 
          spellcheck="false" 
        />
        <button 
          type="button" 
          id="exploreSearchClearInputBtn" 
          class="w-5 h-5 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors hidden shrink-0"
          title="Clear search"
        >
          <i class="fa-solid fa-circle-xmark text-[13px]"></i>
        </button>
      </div>
    </header>

    <!-- Search Category Filter Tabs -->
    <div class="explore-search-filter-tabs flex items-center px-3 h-10 border-b border-neutral-100 dark:border-neutral-800/60 overflow-x-auto gap-2 shrink-0 select-none">
      <button type="button" class="search-filter-chip active" data-filter="Top">Top</button>
      <button type="button" class="search-filter-chip" data-filter="Accounts">Accounts</button>
      <button type="button" class="search-filter-chip" data-filter="Audio">Audio</button>
      <button type="button" class="search-filter-chip" data-filter="Tags">Tags</button>
      <button type="button" class="search-filter-chip" data-filter="Reels">Reels</button>
    </div>

    <!-- Scrollable Search Results Area -->
    <div class="flex-1 overflow-y-auto px-3.5 py-3 divide-y divide-neutral-100/60 dark:divide-neutral-800/40" id="exploreSearchResultsList">
      <!-- Injected dynamically: Recent Searches, Trending Tags, or Search Results -->
    </div>
  `;

  bindSearchOverlayEvents(overlay);
  activeOverlayInstance = overlay;
  return overlay;
}

function bindSearchOverlayEvents(overlay) {
  const backBtn = overlay.querySelector("#exploreSearchBackBtn");
  const input = overlay.querySelector("#exploreSearchActiveInput");
  const clearBtn = overlay.querySelector("#exploreSearchClearInputBtn");
  const filterChips = overlay.querySelectorAll(".search-filter-chip");

  backBtn?.addEventListener("click", closeSearchActiveOverlay);

  // Clear query button
  clearBtn?.addEventListener("click", () => {
    if (input) {
      input.value = "";
      clearBtn.classList.add("hidden");
      input.focus();
      renderDefaultSearchState(overlay);
    }
  });

  // Filter chips
  filterChips.forEach(chip => {
    chip.addEventListener("click", () => {
      filterChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentFilter = chip.dataset.filter || "Top";
      executeSearch(input?.value || "", overlay);
    });
  });

  // Debounced input search
  const debouncedSearch = debounce((query) => {
    executeSearch(query, overlay);
  }, 120);

  input?.addEventListener("input", (e) => {
    const val = e.target.value.trim();
    if (val) {
      clearBtn?.classList.remove("hidden");
    } else {
      clearBtn?.classList.add("hidden");
    }
    debouncedSearch(val);
  });

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = input.value.trim();
      if (val) {
        exploreService.addRecentSearch(val);
      }
    }
  });
}

export function openSearchActiveOverlay(initialQuery = "") {
  let overlay = document.getElementById("exploreSearchActiveOverlay");
  if (!overlay) {
    const host = document.getElementById("exploreView") || document.body;
    overlay = buildSearchActiveOverlayElement();
    host.appendChild(overlay);
  }

  overlay.classList.remove("pointer-events-none", "opacity-0");
  overlay.classList.add("pointer-events-auto", "opacity-100");

  const input = overlay.querySelector("#exploreSearchActiveInput");
  const clearBtn = overlay.querySelector("#exploreSearchClearInputBtn");

  if (initialQuery && initialQuery.trim()) {
    if (input) input.value = initialQuery.trim();
    clearBtn?.classList.remove("hidden");
    executeSearch(initialQuery.trim(), overlay);
  } else {
    renderDefaultSearchState(overlay);
  }

  setTimeout(() => {
    if (input) {
      input.focus();
    }
  }, 100);
}

export function closeSearchActiveOverlay() {
  const overlay = document.getElementById("exploreSearchActiveOverlay");
  if (!overlay) return;

  overlay.classList.remove("pointer-events-auto", "opacity-100");
  overlay.classList.add("pointer-events-none", "opacity-0");

  const input = overlay.querySelector("#exploreSearchActiveInput");
  if (input) {
    input.value = "";
    input.blur();
  }
}

function renderDefaultSearchState(overlay) {
  const list = overlay.querySelector("#exploreSearchResultsList");
  if (!list) return;

  const recents = exploreService.getRecentSearches();

  list.innerHTML = `
    <!-- Recent Searches Header -->
    <div class="mb-4">
      <div class="flex items-center justify-between pb-2 mb-1">
        <span class="text-[14px] font-bold text-neutral-900 dark:text-white">Recent</span>
        ${recents.length > 0 ? `
          <button type="button" id="clearAllRecentsBtn" class="text-[12.5px] font-semibold text-sky-500 hover:text-sky-600 transition-colors">
            Clear all
          </button>
        ` : ''}
      </div>

      ${recents.length === 0 ? `
        <div class="py-4 text-xs text-neutral-400 text-center">No recent searches</div>
      ` : `
        <div class="space-y-1" id="recentSearchesItems">
          ${recents.map(r => `
            <div class="recent-search-row flex items-center justify-between py-2 px-1 hover:bg-neutral-50 dark:hover:bg-neutral-900/60 rounded-xl cursor-pointer group" data-term="${r}">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                  <i class="fa-solid fa-clock-rotate-left text-[12px]"></i>
                </div>
                <span class="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200 truncate">${r}</span>
              </div>
              <button type="button" class="remove-recent-btn text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-1 text-xs" data-term="${r}" title="Remove">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <!-- Trending Hashtags Section -->
    <div class="pt-3">
      <div class="text-[14px] font-bold text-neutral-900 dark:text-white pb-2 mb-1">Trending Topics</div>
      <div class="space-y-2">
        ${TRENDING_TAGS.map(t => `
          <div class="trending-tag-row flex items-center justify-between py-1.5 px-1 hover:bg-neutral-50 dark:hover:bg-neutral-900/60 rounded-xl cursor-pointer" data-tag="${t.tag}">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200/50 dark:border-sky-800/50 flex items-center justify-center text-sky-500 shrink-0">
                <i class="fa-solid fa-hashtag text-[13px]"></i>
              </div>
              <div class="min-w-0">
                <div class="text-[13.5px] font-semibold text-neutral-900 dark:text-white truncate">#${t.tag}</div>
                <div class="text-[11px] text-neutral-400">${t.postsCount} posts</div>
              </div>
            </div>
            <i class="fa-solid fa-arrow-trend-up text-xs text-sky-500"></i>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Attach recents interactions
  list.querySelector("#clearAllRecentsBtn")?.addEventListener("click", () => {
    exploreService.clearRecentSearches();
    renderDefaultSearchState(overlay);
  });

  list.querySelectorAll(".remove-recent-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const term = btn.dataset.term;
      exploreService.removeRecentSearch(term);
      renderDefaultSearchState(overlay);
    });
  });

  list.querySelectorAll(".recent-search-row").forEach(row => {
    row.addEventListener("click", () => {
      const term = row.dataset.term;
      const input = overlay.querySelector("#exploreSearchActiveInput");
      if (input) {
        input.value = term;
        overlay.querySelector("#exploreSearchClearInputBtn")?.classList.remove("hidden");
        executeSearch(term, overlay);
      }
    });
  });

  list.querySelectorAll(".trending-tag-row").forEach(row => {
    row.addEventListener("click", () => {
      const tag = row.dataset.tag;
      const input = overlay.querySelector("#exploreSearchActiveInput");
      if (input) {
        input.value = `#${tag}`;
        overlay.querySelector("#exploreSearchClearInputBtn")?.classList.remove("hidden");
        exploreService.addRecentSearch(`#${tag}`);
        executeSearch(tag, overlay);
      }
    });
  });
}

async function executeSearch(query, overlay) {
  const list = overlay.querySelector("#exploreSearchResultsList");
  if (!list) return;

  const trimmed = query.trim();
  if (!trimmed) {
    renderDefaultSearchState(overlay);
    return;
  }

  // 1. Local explore content search (tags, reels, items)
  const { accounts: localAccounts, tags, items } = exploreService.search(trimmed, currentFilter);

  // 2. Query Supabase users live
  let supabaseAccounts = [];
  try {
    supabaseAccounts = await searchSupabaseUsers(trimmed);
  } catch (err) {
    console.warn("Notice querying Supabase profiles:", err);
  }

  // Merge unique accounts, prioritizing real Supabase accounts
  const mergedAccounts = [...supabaseAccounts];
  (localAccounts || []).forEach(la => {
    if (!mergedAccounts.some(ma => String(ma.username).toLowerCase() === String(la.username).toLowerCase())) {
      mergedAccounts.push(la);
    }
  });

  let html = "";

  if (currentFilter === "Top" || currentFilter === "Accounts") {
    if (mergedAccounts.length > 0) {
      html += `
        <div class="py-2">
          <div class="text-[12px] font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Accounts</span>
            ${supabaseAccounts.length > 0 ? '<span class="text-[10.5px] text-sky-500 font-semibold lowercase">live from supabase</span>' : ''}
          </div>
          <div class="space-y-1">
            ${mergedAccounts.map(acc => `
              <div 
                class="account-search-result-row flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900/60 cursor-pointer transition-colors" 
                data-user-id="${acc.id}" 
                data-username="${acc.username}" 
                data-name="${acc.name || acc.username}" 
                data-avatar="${acc.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}"
              >
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <img src="${acc.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="w-11 h-11 rounded-full object-cover border border-neutral-200 dark:border-neutral-800 shrink-0" alt="${acc.username}" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';" />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 leading-tight">
                      <span class="font-bold text-[14px] text-neutral-900 dark:text-white truncate">@${acc.username}</span>
                      ${acc.isVerified ? '<span class="text-sky-500 text-[12px]"><i class="fa-solid fa-circle-check"></i></span>' : ''}
                    </div>
                    <div class="text-[12px] text-neutral-500 dark:text-neutral-400 truncate leading-tight">${acc.name || acc.username}</div>
                  </div>
                </div>
                <button type="button" class="open-direct-dm-btn px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 hover:bg-sky-600 text-white shrink-0 flex items-center gap-1.5 shadow-2xs">
                  <i class="fa-regular fa-paper-plane text-[11px]"></i>
                  <span>Message</span>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  if (currentFilter === "Top" || currentFilter === "Tags") {
    if (tags.length > 0) {
      html += `
        <div class="py-2">
          <div class="text-[12px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Tags</div>
          <div class="space-y-1">
            ${tags.map(t => `
              <div class="tag-search-result-row flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900/60 cursor-pointer" data-tag="${t.tag}">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 shrink-0 font-bold">#</div>
                  <div>
                    <div class="font-bold text-[13.5px] text-neutral-900 dark:text-white">#${t.tag}</div>
                    <div class="text-[11.5px] text-neutral-400">${t.postsCount} posts</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  if (currentFilter === "Top" || currentFilter === "Audio") {
    // Render Audio section if searching
    const audioPlaceholderId = "exploreSearchAudioSection_" + Date.now();
    html += `
      <div class="py-2" id="${audioPlaceholderId}">
        <div class="text-[12px] font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>YouTube Music</span>
          <span class="text-[10px] text-pink-500 font-normal"><i class="fa-solid fa-music mr-1"></i>30s Preview</span>
        </div>
        <div class="space-y-1" id="${audioPlaceholderId}_list">
          <div class="py-2 text-xs text-neutral-400"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>Searching songs...</div>
        </div>
      </div>
    `;

    setTimeout(async () => {
      const container = document.getElementById(`${audioPlaceholderId}_list`);
      if (!container) return;
      try {
        const audioTracks = await searchYouTubeAudio(trimmed);
        if (audioTracks && audioTracks.length > 0) {
          container.innerHTML = audioTracks.slice(0, currentFilter === "Audio" ? 10 : 3).map(tr => `
            <div class="audio-search-result-row flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900/60 cursor-pointer transition-colors" data-id="${tr.id}" data-title="${tr.title}" data-artist="${tr.artist}" data-url="${tr.audioUrl}">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <img src="${tr.coverUrl || tr.cover}" class="w-10 h-10 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800 shrink-0" alt="${tr.title}" />
                <div class="min-w-0">
                  <div class="font-bold text-[13.5px] text-neutral-900 dark:text-white truncate">${tr.title}</div>
                  <div class="text-[11.5px] text-neutral-500 dark:text-neutral-400 truncate">${tr.artist} • 0:30</div>
                </div>
              </div>
              <button type="button" class="audio-search-play-btn w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:text-pink-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors shrink-0" title="Play snippet">
                <i class="fa-solid fa-play text-xs"></i>
              </button>
            </div>
          `).join('');

          container.querySelectorAll(".audio-search-play-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              const row = btn.closest(".audio-search-result-row");
              const url = row?.dataset.url;
              const id = row?.dataset.id;
              if (activeSearchAudio && !activeSearchAudio.paused && activeSearchAudio._trackId === id) {
                activeSearchAudio.pause();
                activeSearchAudio = null;
                btn.innerHTML = '<i class="fa-solid fa-play text-xs"></i>';
                return;
              }
              if (activeSearchAudio) {
                activeSearchAudio.pause();
                activeSearchAudio = null;
                document.querySelectorAll(".audio-search-play-btn").forEach(b => b.innerHTML = '<i class="fa-solid fa-play text-xs"></i>');
              }
              try {
                activeSearchAudio = new Audio(url);
                activeSearchAudio._trackId = id;
                activeSearchAudio.play().catch(() => {});
                btn.innerHTML = '<i class="fa-solid fa-pause text-xs text-pink-500"></i>';
                activeSearchAudio.onended = () => {
                  btn.innerHTML = '<i class="fa-solid fa-play text-xs"></i>';
                };
              } catch (_) {}
            });
          });
        } else {
          container.innerHTML = `<div class="py-1 text-xs text-neutral-500">No tracks found.</div>`;
        }
      } catch (_) {
        container.innerHTML = `<div class="py-1 text-xs text-neutral-500">Audio catalog unavailable.</div>`;
      }
    }, 50);
  }

  if (currentFilter === "Top" || currentFilter === "Reels") {
    if (items.length > 0) {
      html += `
        <div class="py-2">
          <div class="text-[12px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Explore Media</div>
          <div class="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
            ${items.slice(0, 9).map(it => `
              <div class="search-media-thumb aspect-square relative bg-neutral-900 cursor-pointer group overflow-hidden" data-id="${it.id}">
                <img src="${it.thumbnail || it.url}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Media" loading="lazy" />
                <div class="absolute bottom-1 left-1.5 flex items-center gap-1 text-[10px] font-semibold text-white drop-shadow-md">
                  <i class="fa-solid fa-eye text-[9px]"></i>
                  <span>${it.views || '50K'}</span>
                </div>
                ${it.isReel ? '<span class="absolute top-1 right-1 text-white text-[10px] drop-shadow-md"><i class="fa-solid fa-play"></i></span>' : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  if (!html) {
    html = `
      <div class="py-16 text-center text-neutral-400">
        <i class="fa-solid fa-magnifying-glass text-2xl opacity-40 mb-2"></i>
        <p class="text-[14px] font-medium">No results found for "${query}"</p>
        <p class="text-[12px] opacity-75 mt-0.5">Try searching for #tokyo, #lifestyle or @shabnam_ai</p>
      </div>
    `;
  }

  list.innerHTML = html;

  // Bind result clicks -> Direct DM Navigation with user profile info
  list.querySelectorAll(".account-search-result-row").forEach(row => {
    row.addEventListener("click", () => {
      const username = row.dataset.username;
      const uid = row.dataset.userId;
      const name = row.dataset.name || username;
      const avatar = row.dataset.avatar;
      exploreService.addRecentSearch(username);
      closeSearchActiveOverlay();
      openDirectChatWithUser({
        id: uid,
        username,
        name,
        avatar
      });
    });
  });

  list.querySelectorAll(".search-media-thumb").forEach(thumb => {
    thumb.addEventListener("click", () => {
      const id = thumb.dataset.id;
      const item = items.find(i => String(i.id) === String(id));
      if (!item) return;

      closeSearchActiveOverlay();
      navigateToReel(item.id, item.video_url || item.url, item);
    });
  });
}
