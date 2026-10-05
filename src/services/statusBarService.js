import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

let currentActiveScreen = 'home';

/**
 * Dynamic Status Bar styling based on current active screen/route:
 * - When in Reels: transparent overlay over webview, Style.Dark (white icons)
 * - In non-Reels (Home, Profile, Messages, etc.): disable overlay, match dark/light theme
 */
export async function updateStatusBar(tabOrRoute) {
  if (tabOrRoute) {
    currentActiveScreen = tabOrRoute;
  }

  // Safe guard: only execute native StatusBar commands on native platform (Android/iOS)
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const isReels = currentActiveScreen === 'reels' || currentActiveScreen === '/reels';

    if (isReels) {
      // When entering Reels:
      // Make the status bar completely transparent (overlays the webview)
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: Style.Dark }); // White text/icons over video
      await StatusBar.setBackgroundColor({ color: '#00000000' }); // Transparent
    } else {
      // When leaving Reels (e.g. Home, Profile, Messages, Explore):
      // Disable overlay and match the app theme background
      await StatusBar.setOverlaysWebView({ overlay: false });

      const appContainer = document.getElementById('appContainer');
      const isDark = document.documentElement.classList.contains('dark') ||
                     document.body.classList.contains('dark') ||
                     (appContainer && (appContainer.classList.contains('dark') || appContainer.classList.contains('dark-mode-active'))) ||
                     (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        await StatusBar.setBackgroundColor({ color: '#000000' });
        await StatusBar.setStyle({ style: Style.Dark }); // White icons for dark background
      } else {
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
        await StatusBar.setStyle({ style: Style.Light }); // Dark icons for light background
      }
    }
  } catch (err) {
    console.warn('[StatusBar] Dynamic update failed:', err);
  }
}

/**
 * Initialize automatic route and system theme listeners for Status Bar
 */
export function initStatusBarListener() {
  // Initial setup for default screen
  updateStatusBar('home');

  if (typeof window !== 'undefined') {
    // Expose globally for convenience
    window.updateStatusBar = updateStatusBar;

    // Route listener via popstate
    window.addEventListener('popstate', () => {
      const path = window.location.pathname;
      if (path === '/reels') {
        updateStatusBar('reels');
      } else {
        const cleanPath = path.replace('/', '') || 'home';
        updateStatusBar(cleanPath);
      }
    });

    // Theme change listener (system dark / light mode change)
    const systemNightModeQuery = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (systemNightModeQuery) {
      const handleThemeChange = () => {
        if (currentActiveScreen !== 'reels' && currentActiveScreen !== '/reels') {
          updateStatusBar(currentActiveScreen);
        }
      };
      if (systemNightModeQuery.addEventListener) {
        systemNightModeQuery.addEventListener('change', handleThemeChange);
      } else if (systemNightModeQuery.addListener) {
        systemNightModeQuery.addListener(handleThemeChange);
      }
    }
  }
}
