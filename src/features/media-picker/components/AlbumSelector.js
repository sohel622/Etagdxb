// Album Selection Drawer Component ("Recents ⌵")

export const DEVICE_ALBUMS = [
  { id: "all", name: "Recents", count: 24, thumb: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200" },
  { id: "Camera", name: "Camera", count: 12, thumb: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200" },
  { id: "Screenshots", name: "Screenshots", count: 6, thumb: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200" },
  { id: "Downloads", name: "Downloads", count: 8, thumb: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200" },
  { id: "Instagram", name: "Instagram", count: 5, thumb: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200" },
  { id: "WhatsApp", name: "WhatsApp", count: 7, thumb: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200" }
];

export function renderAlbumFoldersList({ container, onSelectAlbum, currentAlbum = "Recents" }) {
  if (!container) return;
  container.innerHTML = "";

  DEVICE_ALBUMS.forEach(album => {
    const row = document.createElement("div");
    row.className = `album-folder-row ${album.name === currentAlbum ? 'active' : ''}`;
    row.innerHTML = `
      <img src="${album.thumb}" class="album-thumb" alt="${album.name}" />
      <div class="album-info">
        <span class="album-name">${album.name}</span>
        <span class="album-count">${album.count}</span>
      </div>
      ${album.name === currentAlbum ? '<i class="fa-solid fa-check text-sky-400 text-xs"></i>' : ''}
    `;
    row.onclick = () => {
      if (typeof onSelectAlbum === "function") {
        onSelectAlbum(album.name);
      }
    };
    container.appendChild(row);
  });
}
