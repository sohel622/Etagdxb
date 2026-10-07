// statusBarService.js - Dynamic Instagram-style Status Bar behavior using @capacitor/status-bar
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

let currentActiveScreen = 'home';
let isStatusBarListenerInitialized = false;

/**
 * Checks whether the current screen or route string refers to Reels
 */
export function isReelsRoute(routeOrTab) {
  if (routeOrTab !== undefined && routeOrTab !== null) {
    const clean = String(routeOrTab).trim().toLowerCase();
    if (
      clean === 'reels' ||
      clean === 'reel' ||
      clean === '/reels' ||
      clean === '/reel' ||
      clean.startsWith('/reels/') ||
      clean.startsWith('/reel/') ||
      clean.includes('reels')
    ) {
      return true;
    }
  }

  // Fallback checks against global and DOM state
  if (typeof window !== 'undefined') {
    if (window.activeNavId === 'reels' || window.__isReelsActive === true) {
      return true;
    }
    const reelsView = document.getElementById('reelsView');
    if (reelsView && reelsView.classList.contains('active')) {
      return true;
    }
    const pathname = window.location.pathname.toLowerCase();
    if (pathname === '/reels' || pathname.startsWith('/reels/') || pathname.startsWith('/reel/')) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if the application is currently in dark mode
 */
export function isAppDarkMode() {
  if (typeof document === 'undefined') return true;
  const appContainer = document.getElementById('appContainer');
  const isDark =
    document.documentElement.classList.contains('dark') ||
    document.body.classList.contains('dark') ||
    (appContainer && (appContainer.classList.contains('dark') || appContainer.classList.contains('dark-mode-active'))) ||
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return Boolean(isDark);
}

/**
 * Updates the browser's meta theme-color tag for seamless address bar / browser status bar coloring
 */
function updateWebThemeColor(isReels, isDark) {
  if (typeof document === 'undefined') return;
  try {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    const color = (isReels || isDark) ? '#000000' : '#ffffff';
    meta.setAttribute('content', color);
  } catch (_) {}
}

/**
 * Dynamic Status Bar styling based on current route/screen:
 * 1. When entering Reels:
 *    - Status bar completely transparent (overlays the webview):
 *      await StatusBar.setOverlaysWebView({ overlay: true });
 *      await StatusBar.setStyle({ style: Style.Dark }); // White text/icons over video
 *      await StatusBar.setBackgroundColor({ color: '#00000000' }); // Transparent
 * 2. When on Home, Profile, Explore, Messages (any non-Reels page):
 *    - Disable overlay and match the app theme background:
 *      await StatusBar.setOverlaysWebView({ overlay: false });
 *      For dark mode:
 *        await StatusBar.setBackgroundColor({ color: '#000000' });
 *        await StatusBar.setStyle({ style: Style.Dark }); // White icons for dark background
 *      For light mode:
 *        await StatusBar.setBackgroundColor({ color: '#ffffff' });
 *        await StatusBar.setStyle({ style: Style.Light }); // Dark icons for light background
 */
export async function updateStatusBar(tabOrRoute) {
  if (tabOrRoute) {
    currentActiveScreen = tabOrRoute;
  }

  const isReels = isReelsRoute(currentActiveScreen);
  const isDark = isAppDarkMode();

  // Always keep browser meta theme-color in sync
  updateWebThemeColor(isReels, isDark);

  // Safe guard: only execute native Capacitor StatusBar commands if native platform
  if (typeof Capacitor !== 'undefined' && !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    if (isReels) {
      // When entering Reels:
      // Make the status bar completely transparent (overlays the webview)
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: Style.Dark }); // White text/icons over video
      await StatusBar.setBackgroundColor({ color: '#00000000' }); // Transparent
    } else {
      // When leaving Reels (e.g. Home / Profile / Explore / Messages):
      // Disable overlay and match the app theme background
      await StatusBar.setOverlaysWebView({ overlay: false });

      if (isDark) {
        // For dark mode:
        await StatusBar.setBackgroundColor({ color: '#000000' });
        await StatusBar.setStyle({ style: Style.Dark }); // White icons for dark background
      } else {
        // For light mode:
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
        await StatusBar.setStyle({ style: Style.Light }); // Dark icons for light background
      }
    }
  } catch (err) {
    console.warn('[StatusBar] Dynamic update failed:', err);
  }
}

/**
 * Automatic Route & Navigation Listener:
 * Intercepts route changes, browser history, navigation events, and DOM view activation
 * to guarantee that the status bar automatically adapts whenever the screen changes.
 */
export function initStatusBarListener() {
  if (isStatusBarListenerInitialized) {
    // Re-trigger status bar with current screen state
    updateStatusBar(currentActiveScreen);
    return;
  }
  isStatusBarListenerInitialized = true;

  if (typeof window === 'undefined') return;

  // Initial setup for the starting screen
  const initialPath = window.location.pathname;
  if (isReelsRoute(initialPath)) {
    updateStatusBar('reels');
  } else {
    updateStatusBar('home');
  }

  // Expose globally for convenience
  window.updateStatusBar = updateStatusBar;

  // 1. Popstate navigation listener (hardware back / browser back & forward)
  window.addEventListener('popstate', () => {
    const path = window.location.pathname;
    if (isReelsRoute(path)) {
      updateStatusBar('reels');
    } else {
      const cleanPath = path.replace(/^\//, '') || 'home';
      updateStatusBar(cleanPath);
    }
  });

  // 2. Hashchange navigation listener
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace(/^#/, '');
    if (isReelsRoute(hash)) {
      updateStatusBar('reels');
    } else if (hash) {
      updateStatusBar(hash);
    }
  });

  // 3. Intercept history.pushState and history.replaceState for single-page routing
  try {
    const originalPushState = window.history.pushState;
    if (originalPushState) {
      window.history.pushState = function (...args) {
        const result = originalPushState.apply(this, args);
        try {
          const url = args[2];
          if (typeof url === 'string') {
            if (isReelsRoute(url)) {
              updateStatusBar('reels');
            } else {
              const clean = url.replace(/^\//, '') || 'home';
              updateStatusBar(clean);
            }
          }
        } catch (_) {}
        return result;
      };
    }

    const originalReplaceState = window.history.replaceState;
    if (originalReplaceState) {
      window.history.replaceState = function (...args) {
        const result = originalReplaceState.apply(this, args);
        try {
          const url = args[2];
          if (typeof url === 'string') {
            if (isReelsRoute(url)) {
              updateStatusBar('reels');
            } else {
              const clean = url.replace(/^\//, '') || 'home';
              updateStatusBar(clean);
            }
          }
        } catch (_) {}
        return result;
      };
    }
  } catch (_) {}

  // 4. Custom navigation and route change listeners
  window.addEventListener('routeChange', (e) => {
    const target = e.detail?.route || e.detail?.tab || e.detail;
    updateStatusBar(target);
  });

  window.addEventListener('tabChanged', (e) => {
    const target = e.detail?.tab || e.detail?.route || e.detail;
    updateStatusBar(target);
  });

  window.addEventListener('reelsActiveStateChange', (e) => {
    if (e.detail?.isActive) {
      updateStatusBar('reels');
    } else {
      updateStatusBar(window.activeNavId || 'home');
    }
  });

  // 5. System dark/light theme change listener
  const systemNightModeQuery = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  if (systemNightModeQuery) {
    const handleThemeChange = () => {
      if (!isReelsRoute(currentActiveScreen)) {
        updateStatusBar(currentActiveScreen);
      }
    };
    if (systemNightModeQuery.addEventListener) {
      systemNightModeQuery.addEventListener('change', handleThemeChange);
    } else if (systemNightModeQuery.addListener) {
      systemNightModeQuery.addListener(handleThemeChange);
    }
  }

  // 6. DOM MutationObserver to catch view activations (#reelsView, #homeView, #profileView, #chatsView)
  try {
    const viewsToObserve = ['reelsView', 'homeView', 'profileView', 'chatsView'];
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const target = m.target;
          if (target && target.classList.contains('active')) {
            if (target.id === 'reelsView') {
              updateStatusBar('reels');
              break;
            } else if (target.id === 'homeView') {
              updateStatusBar('home');
              break;
            } else if (target.id === 'profileView') {
              updateStatusBar('profile');
              break;
            } else if (target.id === 'chatsView') {
              updateStatusBar('messages');
              break;
            }
          }
        }
      }
    });

    viewsToObserve.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el, { attributes: true, attributeFilter: ['class'] });
      }
    });

    // Also observe after DOM ready if elements were not mounted yet
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        viewsToObserve.forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            observer.observe(el, { attributes: true, attributeFilter: ['class'] });
          }
        });
      });
    }
  } catch (_) {}
}
