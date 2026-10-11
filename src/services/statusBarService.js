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
  try {
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
  } catch (_) {}

  const homeView = document.getElementById('homeView');
  const profileView = document.getElementById('profileView');
  const appContainer = document.getElementById('appContainer');

  const hasDarkClass =
    document.documentElement.classList.contains('dark') ||
    document.body.classList.contains('dark') ||
    (homeView && homeView.classList.contains('dark')) ||
    (profileView && profileView.classList.contains('dark')) ||
    (appContainer && appContainer.classList.contains('dark'));

  const isNightTime = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return Boolean(hasDarkClass || isNightTime);
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
 * Updates the theme-aware safe-area curtain (#statusBarCurtain)
 * - In Dark Mode: pure #000000 (black)
 * - In Light Mode: crisp #FFFFFF (white)
 * - In Reels: fully transparent (bg-transparent) so video goes edge-to-edge
 */
export function updateStatusBarCurtain(isReels = false, isDark = true) {
  if (typeof document === 'undefined') return;
  const curtain = document.getElementById('statusBarCurtain');
  if (!curtain) return;

  if (isReels) {
    curtain.style.backgroundColor = 'transparent';
    curtain.classList.remove('bg-white', 'bg-black');
    curtain.classList.add('bg-transparent');
  } else if (isDark) {
    curtain.style.backgroundColor = '#000000';
    curtain.classList.remove('bg-transparent', 'bg-white');
    curtain.classList.add('bg-black');
  } else {
    curtain.style.backgroundColor = '#ffffff';
    curtain.classList.remove('bg-transparent', 'bg-black');
    curtain.classList.add('bg-white');
  }
}

/**
 * Ensures --safe-area-top is synchronized and never leaves content colliding with status bar
 */
export function syncSafeAreaTop() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const test = document.createElement('div');
    test.style.cssText = 'position:fixed;top:0;left:0;height:env(safe-area-inset-top, 0px);pointer-events:none;visibility:hidden;';
    document.body.appendChild(test);
    const measured = test.offsetHeight;
    test.remove();

    if (!measured || measured < 10) {
      document.documentElement.style.setProperty('--safe-area-top', '24px');
    } else {
      document.documentElement.style.setProperty('--safe-area-top', `${measured}px`);
    }
  } catch (_) {
    document.documentElement.style.setProperty('--safe-area-top', '24px');
  }
}

/**
 * Configure Reels Status Bar:
 * - Full overlay so the video spans edge-to-edge behind the status bar
 * - Light icon/text style (white text/icons over video via Style.Dark in Capacitor)
 * - Status bar background color fully transparent (#00000000)
 * - Theme curtain fully transparent
 */
export const setReelsStatusBar = async () => {
  currentActiveScreen = 'reels';
  updateWebThemeColor(true, true);
  updateStatusBarCurtain(true, true);
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--bg-header', '#000000');
    document.documentElement.style.setProperty('--header-bg', '#000000');
  }

  // Directly inform Android native host controller
  if (typeof window !== 'undefined' && window.NativeReelsBridge) {
    try {
      if (typeof window.NativeReelsBridge.setStatusBarTheme === 'function') {
        window.NativeReelsBridge.setStatusBarTheme(true, true);
      } else if (typeof window.NativeReelsBridge.setReelsActive === 'function') {
        window.NativeReelsBridge.setReelsActive(true);
      }
    } catch (_) {}
  }

  if (typeof Capacitor !== 'undefined' && !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark }); // White status bar text/icons over video
    await StatusBar.setBackgroundColor({ color: '#00000000' }); // Transparent
  } catch (err) {
    console.warn('[StatusBar] setReelsStatusBar failed:', err);
  }
};

/**
 * Configure Default Status Bar for Home, Profile, Explore, Messages:
 * - Edge-to-edge with theme-aware safe-area curtain
 * - Dark Mode: Solid pure black #000000 curtain with white icons (Style.Dark)
 * - Light Mode: Pure crisp white #ffffff curtain with dark icons (Style.Light)
 */
export const setDefaultStatusBar = async (isDark = true) => {
  updateWebThemeColor(false, isDark);
  updateStatusBarCurtain(false, isDark);
  if (typeof document !== 'undefined') {
    const headerColor = isDark ? '#000000' : '#ffffff';
    document.documentElement.style.setProperty('--bg-header', headerColor);
    document.documentElement.style.setProperty('--header-bg', headerColor);
  }

  // Directly inform Android native host controller
  if (typeof window !== 'undefined' && window.NativeReelsBridge) {
    try {
      if (typeof window.NativeReelsBridge.setStatusBarTheme === 'function') {
        window.NativeReelsBridge.setStatusBarTheme(false, isDark);
      } else if (typeof window.NativeReelsBridge.setReelsActive === 'function') {
        window.NativeReelsBridge.setReelsActive(false);
      }
    } catch (_) {}
  }

  if (typeof Capacitor !== 'undefined' && !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    if (isDark) {
      await StatusBar.setBackgroundColor({ color: '#000000' });
      await StatusBar.setStyle({ style: Style.Dark }); // White icons for dark background
    } else {
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
      await StatusBar.setStyle({ style: Style.Light }); // Dark icons for light background
    }
  } catch (err) {
    console.warn('[StatusBar] setDefaultStatusBar failed:', err);
  }
};

/**
 * Dynamic Status Bar update router:
 * 1. When entering Reels: sets transparent overlay status bar
 * 2. When on Home, Profile, Explore, Messages: sets default themed status bar without overlay
 */
export async function updateStatusBar(tabOrRoute) {
  if (tabOrRoute) {
    currentActiveScreen = tabOrRoute;
  }

  const isReels = isReelsRoute(currentActiveScreen);
  const isDark = isAppDarkMode();

  if (isReels) {
    await setReelsStatusBar();
  } else {
    await setDefaultStatusBar(isDark);
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

  // Synchronize CSS --safe-area-top immediately
  syncSafeAreaTop();
  window.addEventListener('resize', syncSafeAreaTop);
  window.addEventListener('orientationchange', syncSafeAreaTop);

  // Initial setup for the starting screen
  const initialPath = window.location.pathname;
  if (isReelsRoute(initialPath)) {
    updateStatusBar('reels');
  } else {
    updateStatusBar('home');
  }

  // Expose globally for convenience
  window.updateStatusBar = updateStatusBar;
  window.setReelsStatusBar = setReelsStatusBar;
  window.setDefaultStatusBar = setDefaultStatusBar;
  window.updateStatusBarCurtain = updateStatusBarCurtain;
  window.syncSafeAreaTop = syncSafeAreaTop;

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
