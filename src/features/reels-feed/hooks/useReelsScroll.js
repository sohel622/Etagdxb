// Reels Feed Snap Scroll & Viewport Observer Hook

export function initReelsScrollController({ container, onActiveIndexChange }) {
  if (!container) return null;

  let activeIndex = 0;
  let scrollTimeout = null;

  const handleScroll = () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const scrollTop = container.scrollTop;
      const height = container.clientHeight || 1;
      const index = Math.round(scrollTop / height);

      if (index !== activeIndex) {
        activeIndex = index;
        if (typeof onActiveIndexChange === "function") {
          onActiveIndexChange(activeIndex);
        }
      }
    }, 80);
  };

  container.addEventListener("scroll", handleScroll, { passive: true });

  return () => {
    container.removeEventListener("scroll", handleScroll);
  };
}
