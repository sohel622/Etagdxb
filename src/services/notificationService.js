// notificationService.js - Instagram-style Reel Upload Notifications & Permissions
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { updateUploadProgressBanner } from '../components/UploadProgressBanner.js';

let channelCreated = false;
const activeUploads = new Map();

// Static IDs according to specifications
export const UPLOAD_NOTIFICATION_ID = 8888;
export const COMPLETION_NOTIFICATION_ID = 8889;

// Throttling state to prevent flicker and OS notification manager spam
let lastUpdatedPercent = -1;
let lastUpdatedTime = 0;

/**
 * Initialize Notification Channels for Android 8.0+
 * Creates "flashgram_upload_channel" with IMPORTANCE_LOW (2) so background
 * progress updates never trigger sound, vibration, or heads-up popups.
 */
export async function initNotificationChannel() {
  if (channelCreated || !Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: 'flashgram_upload_channel',
      name: 'Upload Progress',
      description: 'Silent background upload progress',
      importance: 2, // IMPORTANCE_LOW (2)
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
    let notificationGranted = false;

    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      notificationGranted = status.display === 'granted';
    } else if (typeof Notification !== 'undefined') {
      notificationGranted = Notification.permission === 'granted';
    }

    const userAlreadyGranted = localStorage.getItem('flashgram_permissions_granted') === 'true';

    if (!notificationGranted && !userAlreadyGranted) {
      setTimeout(() => {
        showPermissionOnboardingModal();
      }, 800);
    } else {
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
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.requestPermissions();
    } else if (typeof Notification !== 'undefined' && Notification.requestPermission) {
      await Notification.requestPermission();
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (_) {}
    }

    localStorage.setItem('flashgram_permissions_granted', 'true');
    await initNotificationChannel();
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
 * Create a new upload progress session with static notification ID 8888
 */
export function createUploadSession(videoThumbnailUrl) {
  lastUpdatedPercent = -1;
  lastUpdatedTime = 0;

  const session = {
    id: UPLOAD_NOTIFICATION_ID,
    thumbnailUrl: videoThumbnailUrl || undefined,
    lastProgressTime: 0,
    lastPercent: -1
  };
  activeUploads.set(UPLOAD_NOTIFICATION_ID, session);
  return session;
}

/**
 * Update Instagram-style horizontal progress notification in real-time
 * Prevents flickering, repeated sound/vibrations, and notification spam
 */
export async function notifyUploadProgress(notificationId, { loaded, total, percent, videoThumbnailUrl }) {
  const session = activeUploads.get(UPLOAD_NOTIFICATION_ID) || {
    id: UPLOAD_NOTIFICATION_ID,
    thumbnailUrl: videoThumbnailUrl
  };

  const safePercent = Math.min(100, Math.max(0, Math.round(percent)));
  const uploadedMB = (loaded / (1024 * 1024)).toFixed(1);
  const totalMB = (total / (1024 * 1024)).toFixed(1);

  // Update in-app progress banner
  updateUploadProgressBanner(safePercent, { uploadedMB, totalMB });

  // Throttle: avoid spamming OS notification manager
  // Only call notification update if progress changes by at least 5% or once every 800ms
  const now = Date.now();
  if (safePercent < 100 && safePercent > 0) {
    const percentDiff = safePercent - lastUpdatedPercent;
    const timeDiff = now - lastUpdatedTime;
    if (percentDiff < 5 && timeDiff < 800) {
      return;
    }
  }

  lastUpdatedPercent = safePercent;
  lastUpdatedTime = now;

  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: UPLOAD_NOTIFICATION_ID,
            title: 'Flashgram',
            body: `Reel uploading... ${uploadedMB} MB / ${totalMB} MB (${safePercent}%)`,
            smallIcon: 'ic_stat_flashgram',
            largeIcon: session.thumbnailUrl || videoThumbnailUrl || undefined, // Right-side thumbnail
            iconColor: '#E1306C',
            channelId: 'flashgram_upload_channel',
            ongoing: true, // Non-dismissible while uploading
            autoCancel: false,
            silent: true, // Absolutely no repeated chime/vibration
            onlyAlertOnce: true, // Phone only alerts the very first time; subsequent progress updates remain completely silent
            extra: {
              progress: safePercent,
              max: 100,
              indeterminate: false
            }
          }
        ]
      });
    } catch (err) {
      console.warn('[NotificationService] Native progress update notice:', err);
    }
  }
}

/**
 * 100% Completion Handler (Triggered Strictly Once)
 * Cancels ongoing progress notification (id: 8888) immediately and schedules
 * a single completion notification with new ID (id: 8889).
 */
export async function notifyUploadSuccess(notificationId, videoThumbnailUrl) {
  const session = activeUploads.get(UPLOAD_NOTIFICATION_ID);
  const thumb = videoThumbnailUrl || (session ? session.thumbnailUrl : undefined);
  activeUploads.delete(UPLOAD_NOTIFICATION_ID);

  lastUpdatedPercent = -1;
  lastUpdatedTime = 0;

  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannel();

      // Cancel the ongoing progress notification (id: 8888) immediately
      await LocalNotifications.cancel({
        notifications: [{ id: UPLOAD_NOTIFICATION_ID }]
      });

      // Schedule a single completion notification with a new ID (id: 8889)
      await LocalNotifications.schedule({
        notifications: [
          {
            id: COMPLETION_NOTIFICATION_ID,
            title: 'Flashgram',
            body: 'Reel uploaded successfully! 🎉',
            smallIcon: 'ic_stat_flashgram',
            largeIcon: thumb || undefined,
            iconColor: '#E1306C',
            channelId: 'flashgram_upload_channel',
            ongoing: false,
            autoCancel: true,
            silent: false // Chime once upon success
          }
        ]
      });
    } catch (err) {
      console.warn('[NotificationService] Native complete notice:', err);
    }
  } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification('Flashgram', {
        body: 'Reel uploaded successfully! 🎉',
        icon: thumb || '/android/app/src/main/res/drawable/splash.png'
      });
    } catch (_) {}
  }
}

/**
 * Triggered if upload fails
 */
export async function notifyUploadError(notificationId, errorMessage) {
  activeUploads.delete(UPLOAD_NOTIFICATION_ID);
  lastUpdatedPercent = -1;
  lastUpdatedTime = 0;

  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannel();
      await LocalNotifications.cancel({
        notifications: [{ id: UPLOAD_NOTIFICATION_ID }]
      });

      await LocalNotifications.schedule({
        notifications: [
          {
            id: COMPLETION_NOTIFICATION_ID,
            title: 'Flashgram • Upload failed',
            body: errorMessage || 'Could not upload reel. Please try again.',
            smallIcon: 'ic_stat_flashgram',
            iconColor: '#E1306C',
            channelId: 'flashgram_upload_channel',
            ongoing: false,
            autoCancel: true,
            silent: false
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
  window.checkAndPromptPermissionsOnLaunch = checkAndPromptPermissionsOnLaunch;
  window.showPermissionOnboardingModal = showPermissionOnboardingModal;
  window.closePermissionOnboardingModal = closePermissionOnboardingModal;
  window.handleGrantAllPermissions = handleGrantAllPermissions;
  window.initNotificationChannel = initNotificationChannel;
  window.createUploadSession = createUploadSession;
  window.notifyUploadProgress = notifyUploadProgress;
  window.notifyUploadSuccess = notifyUploadSuccess;
  window.notifyUploadError = notifyUploadError;
}
