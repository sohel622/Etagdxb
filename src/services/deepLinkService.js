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
    let cleanPath = urlStr.trim();

    // Strip scheme if present (e.g. "flashgram://reels" -> "reels")
    if (cleanPath.includes('://')) {
      const parts = cleanPath.split('://');
      cleanPath = parts[1] || '';
    }

    // Strip domain if present (e.g. "flashgram.app/reels" -> "reels")
    if (cleanPath.includes('/')) {
      const segments = cleanPath.split('/').filter(Boolean);
      cleanPath = segments[segments.length - 1] || segments[0] || '';
    }

    // Strip query parameters or hashes
    cleanPath = cleanPath.split('?')[0].split('#')[0].toLowerCase();

    console.log('[DeepLink] Target destination:', cleanPath);

    // Route to appropriate view without reloading
    switch (cleanPath) {
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
          // If modal helper not yet ready, retry shortly
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
    CapApp.addListener('appUrlOpen', (data) => {
      console.log('[DeepLink] Received appUrlOpen event:', data?.url);
      if (data?.url) {
        handleDeepLink(data.url);
      }
    });

    // 2. Check if the app was launched with a URL
    CapApp.getLaunchUrl().then((launchUrl) => {
      if (launchUrl && launchUrl.url) {
        console.log('[DeepLink] App launch URL detected:', launchUrl.url);
        // Small delay to allow DOM initialization
        setTimeout(() => {
          handleDeepLink(launchUrl.url);
        }, 300);
      }
    }).catch(() => {});

    // 3. Fallback for Web/Browser URL parameters (e.g. ?route=reels or /reels)
    if (typeof window !== 'undefined') {
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
