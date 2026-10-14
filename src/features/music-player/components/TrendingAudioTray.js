// Trending Audio Tray Component
import { TRENDING_TRACKS } from "../../../utils/audioCatalog.js";

export function renderTrendingAudioTray({ container, onSelectTrack }) {
  if (!container) return;
  container.innerHTML = "";

  TRENDING_TRACKS.forEach(track => {
    const item = document.createElement("div");
    item.className = "music-track-item";
    item.innerHTML = `
      <img src="${track.cover}" class="track-cover" alt="${track.title}" />
      <div class="track-info">
        <span class="track-title">${track.title}</span>
        <span class="track-artist">${track.artist} • ${track.duration}</span>
      </div>
      <button type="button" class="track-play-btn" title="Play preview">
        <i class="fa-solid fa-play"></i>
      </button>
    `;
    item.onclick = () => {
      if (typeof onSelectTrack === "function") {
        onSelectTrack(track);
      }
    };
    container.appendChild(item);
  });
}
