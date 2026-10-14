// Post Finalize Screen (Caption input, location tag, attached 30s music)

export function renderAttachedMusicBadge({ host, track, onRemove }) {
  if (!host) return;
  if (!track) {
    host.innerHTML = `<span class="text-sm font-medium">Add music</span>`;
    return;
  }

  host.innerHTML = `
    <div class="attached-music-tag">
      <i class="fa-solid fa-music"></i>
      <span>${track.title} - ${track.artist}</span>
    </div>
  `;
}
