// Stories Component
import { UserProfileStore } from "../utils/storage.js";

export function initStories() {
  // Stories bar interaction handlers
  const storiesContainer = document.querySelector(".stories-container");
  if (storiesContainer) {
    storiesContainer.addEventListener("wheel", (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        storiesContainer.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }
}
