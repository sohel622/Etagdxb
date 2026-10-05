// notificationService.js - Instagram-style Reel Upload Notifications & Permissions
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { updateUploadProgressBanner } from '../components/UploadProgressBanner.js';

let channelCreated = false;
const activeUploads = new Map();

/**
 * Initialize Notification Channels for Android 8.0+
 */
export async function initNotificationChannel() {
  if (channelCreated || !Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: 'reel_uploads',
      name: 'Reel Uploads',
      description: 'Real-time Instagram-style reel upload progress and alerts',
      importance: 3, // HIGH importance
      visibility: 1, // PUBLIC
      vibration: false,
      sound: undefined
    });
    channelCreated = true;
  } catch (err) {
    console.warn('[NotificationService] Channel creation notice:', err);
  }
}

/**
 * Check if notification and media permissions are granted on app launch.
 * If missing, opens the clean Instagram-style bottom sheet modal.
 */
export async function checkAndPromptPermissionsOnLaunch() {
  try {
    // If already granted in this session or stored, check native status
    let notificationGranted = false;

    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      notificationGranted = status.display === 'granted';
    } else if (typeof Notification !== 'undefined') {
      notificationGranted = Notification.permission === 'granted';
    }

    // Check if dismissed before in localStorage
    const userAlreadyGranted = localStorage.getItem('flashgram_permissions_granted') === 'true';

    if (!notificationGranted && !userAlreadyGranted) {
      setTimeout(() => {
        showPermissionOnboardingModal();
      }, 800);
    } else {
      // Mark as granted
      localStorage.setItem('flashgram_permissions_granted', 'true');
      initNotificationChannel();
    }
  } catch (err) {
    console.warn('[NotificationService] Permission check notice:', err);
  }
}

/**
 * Display the Instagram-style permission onboarding bottom sheet
 */
export function showPermissionOnboardingModal() {
  const modal = document.getElementById('permissionOnboardingModal');
  const sheet = document.getElementById('permissionOnboardingSheet');
  if (!modal || !sheet) return;

  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100');
    sheet.classList.remove('translate-y-full');
    sheet.classList.add('translate-y-0');
  });
}

/**
 * Close the permission modal
 */
export function closePermissionOnboardingModal(skipped = false) {
  const modal = document.getElementById('permissionOnboardingModal');
  const sheet = document.getElementById('permissionOnboardingSheet');
  if (!modal || !sheet) return;

  sheet.classList.remove('translate-y-0');
  sheet.classList.add('translate-y-full');
  modal.classList.remove('opacity-100');
  modal.classList.add('opacity-0', 'pointer-events-none');

  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);

  if (skipped) {
    localStorage.setItem('flashgram_permissions_skipped', 'true');
  }
}

/**
 * Triggered on button click: "Grant All Permissions"
 */
export async function handleGrantAllPermissions() {
  const btn = document.getElementById('grantPermissionsBtn');
  if (btn) {
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Granting permissions...`;
    btn.disabled = true;
  }

  try {
    // 1. Request Local Notifications permission via Capacitor Plugin
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.requestPermissions();
    } else if (typeof Notification !== 'undefined' && Notification.requestPermission) {
      await Notification.requestPermission();
    }

    // 2. Request Camera & Microphone media stream access
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (_) {}
    }

    // 3. Mark state as granted in app
    localStorage.setItem('flashgram_permissions_granted', 'true');
    await initNotificationChannel();

    // 4. Close modal and transition user into the feed
    closePermissionOnboardingModal(false);
  } catch (err) {
    console.warn('[NotificationService] Error requesting permissions:', err);
    closePermissionOnboardingModal(false);
  } finally {
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-check"></i> Grant All Permissions`;
      btn.disabled = false;
    }
  }
}

/**
 * Create a new upload progress session with unique notification ID
 */
export function createUploadSession(videoThumbnailUrl) {
  const notificationId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
  const session = {
    id: notificationId,
    thumbnailUrl: videoThumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120',
    lastProgressTime: 0,
    lastPercent: -1
  };
  activeUploads.set(notificationId, session);
  return session;
}

/**
 * Update Instagram-style notification in real-time with uploaded MB vs total MB
 */
export async function notifyUploadProgress(notificationId, { loaded, total, percent, videoThumbnailUrl }) {
  const session = activeUploads.get(notificationId) || {
    id: notificationId,
    thumbnailUrl: videoThumbnailUrl,
    lastProgressTime: 0,
    lastPercent: -1
  };

  const now = Date.now();
  const safePercent = Math.min(100, Math.max(0, percent));
  const uploadedMB = (loaded / (1024 * 1024)).toFixed(1);
  const totalMB = (total / (1024 * 1024)).toFixed(1);

  // Update in-app progress banner
  updateUploadProgressBanner(safePercent, { uploadedMB, totalMB });

  // Throttle native notification updates to at most once per 300ms or 2% diff
  const shouldUpdateNative = 
    safePercent === 0 || 
    safePercent >= 100 || 
    (now - session.lastProgressTime >= 300) || 
    Math.abs(safePercent - session.lastPercent) >= 2;

  if (!shouldUpdateNative) return;
  session.lastProgressTime = now;
  session.lastPercent = safePercent;
  activeUploads.set(notificationId, session);

  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: 'Flashgram • Reel uploading...',
            body: `${uploadedMB} MB / ${totalMB} MB (${safePercent}%)`,
            smallIcon: 'ic_stat_flashgram', // Image 1 monochrome white logo
            iconColor: '#E1306C',
            largeIcon: session.thumbnailUrl || videoThumbnailUrl, // Right side video preview thumbnail
            channelId: 'reel_uploads',
            ongoing: true,
            autoCancel: false,
            extra: { progress: safePercent }
          }
        ]
      });
    } catch (err) {
      console.warn('[NotificationService] Native progress update notice:', err);
    }
  }
}

/**
 * Triggered when reel upload completes successfully
 */
export async function notifyUploadSuccess(notificationId, videoThumbnailUrl) {
  const session = activeUploads.get(notificationId);
  const thumb = videoThumbnailUrl || (session ? session.thumbnailUrl : null);
  activeUploads.delete(notificationId);

  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: 'Flashgram',
            body: 'Your reel has been shared successfully! 🎉',
            smallIcon: 'ic_stat_flashgram',
            iconColor: '#E1306C',
            largeIcon: thumb,
            channelId: 'reel_uploads',
            ongoing: false,
            autoCancel: true
          }
        ]
      });
    } catch (err) {
      console.warn('[NotificationService] Native complete notice:', err);
    }
  } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification('Flashgram', {
        body: 'Your reel has been shared successfully! 🎉',
        icon: thumb || '/android/app/src/main/res/drawable/splash.png'
      });
    } catch (_) {}
  }
}

/**
 * Triggered if upload fails
 */
export async function notifyUploadError(notificationId, errorMessage) {
  activeUploads.delete(notificationId);

  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: 'Flashgram • Upload failed',
            body: errorMessage || 'Could not upload reel. Please try again.',
            smallIcon: 'ic_stat_flashgram',
            iconColor: '#E1306C',
            channelId: 'reel_uploads',
            ongoing: false,
            autoCancel: true
          }
        ]
      });
    } catch (err) {
      console.warn('[NotificationService] Native error notice:', err);
    }
  }
}

// Expose on window for inline event handlers in index.html
if (typeof window !== 'undefined') {
  window.handleGrantAllPermissions = handleGrantAllPermissions;
  window.closePermissionOnboardingModal = closePermissionOnboardingModal;
  window.showPermissionOnboardingModal = showPermissionOnboardingModal;
  window.createUploadSession = createUploadSession;
  window.notifyUploadProgress = notifyUploadProgress;
  window.notifyUploadSuccess = notifyUploadSuccess;
  window.notifyUploadError = notifyUploadError;
}
