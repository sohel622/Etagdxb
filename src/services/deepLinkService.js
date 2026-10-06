// deepLinkService.js - Deep Link and Widget Shortcut Navigation Handler
import { App as CapApp } from '@capacitor/app';

let deepLinkInitialized = false;

/**
 * Route incoming deep link URL or widget shortcut path
 */
export function handleDeepLink(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return;
  console.log('[DeepLink] Processing URL/Route:', urlStr);

  try {
    // 1. Check for direct Reel App Links: https://Etagdxb.vercel.app/reel/:id
    if (urlStr.includes('/reel/')) {
      const match = urlStr.match(/\/reel\/([^/?#]+)/i);
      const reelId = match ? match[1] : null;
      if (reelId) {
        console.log('[DeepLink] Direct reel target detected:', reelId);
        if (typeof window.switchTab === 'function') {
          window.switchTab('reels');
        }
        if (typeof window.navigateToReel === 'function') {
          window.navigateToReel(reelId);
        } else {
          setTimeout(() => {
            if (typeof window.navigateToReel === 'function') {
              window.navigateToReel(reelId);
            }
          }, 350);
        }
        return;
      }
    }

    let cleanPath = urlStr.trim();

    // Strip scheme if present (e.g. "flashgram://reels" -> "reels")
    if (cleanPath.includes('://')) {
      const parts = cleanPath.split('://');
      cleanPath = parts[1] || '';
    }

    // Strip domain if present (e.g. "Etagdxb.vercel.app/reels" -> "reels")
    if (cleanPath.includes('/')) {
      const segments = cleanPath.split('/').filter(Boolean);
      cleanPath = segments[segments.length - 1] || segments[0] || '';
    }

    // Strip query parameters or hashes
    cleanPath = cleanPath.split('?')[0].split('#')[0].toLowerCase();

    console.log('[DeepLink] Target destination:', cleanPath);

    // Route to appropriate view without reloading
    switch (cleanPath) {
      case 'reel':
      case 'reels':
        if (typeof window.switchTab === 'function') {
          window.switchTab('reels');
        } else if (typeof window.navigate === 'function') {
          window.navigate('/reels');
        }
        break;

      case 'upload':
      case 'create':
      case 'camera':
      case 'new_post':
      case 'post':
        if (typeof window.openCameraMicrophoneSession === 'function') {
          window.openCameraMicrophoneSession();
        } else {
          setTimeout(() => {
            if (typeof window.openCameraMicrophoneSession === 'function') {
              window.openCameraMicrophoneSession();
            }
          }, 350);
        }
        break;

      case 'messages':
      case 'direct':
      case 'chats':
        if (typeof window.switchTab === 'function') {
          window.switchTab('messages');
        } else if (typeof window.navigate === 'function') {
          window.navigate('/messages');
        }
        break;

      case 'activity':
      case 'notifications':
      case 'notification':
        if (typeof window.openNotificationsModal === 'function') {
          window.openNotificationsModal();
        } else {
          setTimeout(() => {
            if (typeof window.openNotificationsModal === 'function') {
              window.openNotificationsModal();
            }
          }, 350);
        }
        break;

      case 'explore':
      case 'search':
        if (typeof window.switchTab === 'function') {
          window.switchTab('search');
        } else if (typeof window.navigate === 'function') {
          window.navigate('/search');
        }
        break;

      case 'profile':
        if (typeof window.switchTab === 'function') {
          window.switchTab('profile');
        } else if (typeof window.navigate === 'function') {
          window.navigate('/profile');
        }
        break;

      case 'story':
      case 'stories':
        if (urlStr.includes('user=shabnam_ai') || urlStr.includes('shabnam_ai')) {
          if (typeof window.openProfile === 'function') {
            window.openProfile('shabnam_ai');
          }
        } else {
          if (typeof window.switchTab === 'function') {
            window.switchTab('home');
          }
        }
        break;

      case 'home':
      default:
        if (cleanPath === 'home' || cleanPath === '' || cleanPath === '/') {
          if (typeof window.switchTab === 'function') {
            window.switchTab('home');
          } else if (typeof window.navigate === 'function') {
            window.navigate('/');
          }
        }
        break;
    }
  } catch (err) {
    console.warn('[DeepLink] Error handling deep link:', err);
  }
}

/**
 * Initialize Deep Link Listener with @capacitor/app
 */
export function initDeepLinkListener() {
  if (deepLinkInitialized) return;
  deepLinkInitialized = true;

  try {
    // 1. Listen for background/foreground URL open events
    CapApp.addListener('appUrlOpen', (event) => {
      console.log('[DeepLink] Received appUrlOpen event:', event?.url);
      try {
        if (event?.url) {
          const urlStr = event.url;
          if (urlStr.includes('Etagdxb.vercel.app') && urlStr.includes('/reel/')) {
            const match = urlStr.match(/\/reel\/([^/?#]+)/i);
            const reelId = match ? match[1] : null;
            if (reelId) {
              if (typeof window.navigate === 'function') {
                window.navigate(`/reel/${reelId}`);
              } else if (typeof window.navigateToReel === 'function') {
                window.navigateToReel(reelId);
              }
              return;
            }
          }
          handleDeepLink(urlStr);
        }
      } catch (e) {
        console.error('Deep link error:', e);
        if (event?.url) handleDeepLink(event.url);
      }
    });

    // 2. Check if the app was launched with a URL
    CapApp.getLaunchUrl().then((launchUrl) => {
      if (launchUrl && launchUrl.url) {
        console.log('[DeepLink] App launch URL detected:', launchUrl.url);
        setTimeout(() => {
          const urlStr = launchUrl.url;
          if (urlStr.includes('Etagdxb.vercel.app') && urlStr.includes('/reel/')) {
            const match = urlStr.match(/\/reel\/([^/?#]+)/i);
            const reelId = match ? match[1] : null;
            if (reelId) {
              if (typeof window.navigate === 'function') {
                window.navigate(`/reel/${reelId}`);
              } else if (typeof window.navigateToReel === 'function') {
                window.navigateToReel(reelId);
              }
              return;
            }
          }
          handleDeepLink(urlStr);
        }, 300);
      }
    }).catch(() => {});

    // 3. Fallback for Web/Browser URL parameters or direct pathname
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/reel/') || path.startsWith('/reels/')) {
        const reelId = path.replace(/^\/reels?\//, '').split('?')[0].split('#')[0];
        if (reelId) {
          setTimeout(() => {
            if (typeof window.navigateToReel === 'function') {
              window.navigateToReel(reelId);
            }
          }, 350);
        }
      }

      const urlParams = new URLSearchParams(window.location.search);
      const routeParam = urlParams.get('route') || urlParams.get('action');
      if (routeParam) {
        handleDeepLink(routeParam);
      }
    }
  } catch (err) {
    console.warn('[DeepLink] Listener initialization warning:', err);
  }
}

// Expose on window
if (typeof window !== 'undefined') {
  window.handleDeepLink = handleDeepLink;
  window.initDeepLinkListener = initDeepLinkListener;
}
