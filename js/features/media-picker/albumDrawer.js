// js/features/media-picker/albumDrawer.js - "Recents" Album Selection Drawer
import { DEVICE_ALBUMS, renderAlbumFoldersList } from "../../../src/features/media-picker/components/AlbumSelector.js";

export { DEVICE_ALBUMS, renderAlbumFoldersList };

export function setupAlbumFilters(drawerElement, onFilterChange) {
  if (!drawerElement) return;

  const chips = drawerElement.querySelectorAll(".album-chip-btn");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      if (typeof onFilterChange === "function") {
        onFilterChange(chip.dataset.filter);
      }
    });
  });
}
