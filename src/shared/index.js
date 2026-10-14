// Shared UI Primitives and Reusable Utilities
import { showInstagramToast, UserProfileStore } from "../utils/storage.js";

export { showInstagramToast, UserProfileStore };

/**
 * Creates an avatar element with fallback handler
 */
export function createAvatarElement({ src, username, size = 36, className = "" }) {
  const container = document.createElement("div");
  container.className = `relative rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 ${className}`;
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;

  const fallback = document.createElement("div");
  fallback.className = "w-full h-full flex items-center justify-center text-neutral-500 text-xs";
  fallback.innerHTML = '<i class="fa-solid fa-user"></i>';

  if (src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = username || "User";
    img.className = "w-full h-full object-cover";
    img.loading = "lazy";
    img.crossOrigin = "anonymous";
    img.onerror = () => {
      img.style.display = "none";
      container.appendChild(fallback);
    };
    container.appendChild(img);
  } else {
    container.appendChild(fallback);
  }

  return container;
}

/**
 * Standard modal overlay backdrop helper
 */
export function createModalBackdrop(id, extraClass = "") {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.className = `fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity ${extraClass}`;
    document.body.appendChild(el);
  }
  return el;
}
