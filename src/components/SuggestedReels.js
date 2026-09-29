// SuggestedReels Component (Horizontal reel slider inside feed)
import { SAMPLE_VIDEOS, SHABNAM_AI_PROFILE } from "../utils/mockData.js";
import { switchTab } from "./BottomNavigation.js";

export function renderSuggestedReels(container, videos = SAMPLE_VIDEOS) {
  const target = typeof container === 'string' ? document.getElementById(container) : container;
  if (!target) return null;

  const section = document.createElement("div");
  section.className = "suggested-reels-container my-4 px-3";
  section.innerHTML = `
    <div class="flex items-center justify-between mb-2.5">
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-clapperboard text-rose-500 text-[15px]"></i>
        <span class="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-100">Suggested Reels</span>
      </div>
      <button type="button" class="text-[12px] font-medium text-sky-500 hover:text-sky-600 cursor-pointer" onclick="switchTab('reels')">
        Watch all
      </button>
    </div>
    <div class="suggested-reels-slider flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
      ${videos.slice(0, 6).map(video => `
        <div class="suggested-reel-card flex-shrink-0 w-36 h-56 rounded-xl overflow-hidden relative cursor-pointer group shadow-sm bg-neutral-900 snap-start" onclick="openSuggestedReel('${video.id}')">
          <video src="${video.url}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" preload="metadata" muted playsinline></video>
          <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none"></div>
          <div class="absolute top-2 right-2 text-white/90 text-xs">
            <i class="fa-solid fa-play text-[10px]"></i>
          </div>
          <div class="absolute bottom-2.5 left-2.5 right-2 text-white">
            <div class="flex items-center gap-1.5 mb-1">
              <img src="${video.avatar || SHABNAM_AI_PROFILE.avatar}" class="w-4 h-4 rounded-full object-cover border border-white/40" alt="${video.user}" />
              <span class="text-[11px] font-medium truncate">${video.user}</span>
            </div>
            <div class="text-[10px] text-white/80 flex items-center gap-1 font-mono">
              <i class="fa-regular fa-eye text-[9px]"></i>
              <span>${video.likes || '12K'}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  target.appendChild(section);
  return section;
}

export function openSuggestedReel(reelId) {
  if (typeof switchTab === 'function') {
    switchTab('reels');
  }
  const reelEl = document.querySelector(`.reel-item[data-id="${reelId}"]`);
  if (reelEl && typeof reelEl.scrollIntoView === 'function') {
    reelEl.scrollIntoView({ behavior: 'smooth' });
  }
}

if (typeof window !== 'undefined') {
  window.renderSuggestedReels = renderSuggestedReels;
  window.openSuggestedReel = openSuggestedReel;
}
