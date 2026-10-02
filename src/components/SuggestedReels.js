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
      ${videos.slice(0, 6).map(video => {
        const coverThumbnail = video.thumbnail || video.thumbnail_url || video.poster || (video.id === 'sample_1' 
          ? 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80' 
          : (video.id === 'shabnam_reel_1' 
              ? 'https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/IMG_20260921_164350.png' 
              : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80'));
        return `
        <div class="suggested-reel-card flex-shrink-0 w-36 h-56 rounded-xl overflow-hidden relative cursor-pointer group shadow-sm bg-neutral-900 snap-start" onclick="openSuggestedReel('${video.id}')">
          <img src="${coverThumbnail}" class="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300" alt="${video.user || 'Reel'} cover" loading="lazy" crossorigin="anonymous" onerror="this.src='https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80';" />
          <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none rounded-lg"></div>
          <div class="absolute top-2 right-2 text-white/90 text-xs">
            <i class="fa-solid fa-play text-[10px]"></i>
          </div>
          <div class="absolute bottom-2.5 left-2.5 right-2 text-white pointer-events-none">
            <div class="flex items-center gap-1.5 mb-1">
              <img src="${video.avatar || SHABNAM_AI_PROFILE.avatar}" class="w-4 h-4 rounded-full object-cover border border-white/40" alt="${video.user}" crossorigin="anonymous" onerror="this.style.display='none';" />
              <span class="text-[11px] font-medium truncate">${video.user}</span>
            </div>
            <div class="text-[10px] text-white/80 flex items-center gap-1 font-mono">
              <i class="fa-regular fa-eye text-[9px]"></i>
              <span>${video.likes || '12K'}</span>
            </div>
          </div>
        </div>
      `;
      }).join('')}
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
