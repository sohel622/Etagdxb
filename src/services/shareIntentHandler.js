// Share Intent Receiver & Incoming Content Handler for Android / WebToNative / Capacitor
import { showInstagramToast } from "../utils/storage.js";
import { openFlashgramShareModal, openShabnamWithPrefilledLink } from "../components/FlashgramShareModal.js";

let incomingSharedLink = null;
let isInitialized = false;

export function getIncomingSharedLink() {
  return incomingSharedLink;
}

export function setIncomingSharedLink(link) {
  incomingSharedLink = link;
  if (typeof window !== "undefined") {
    window.incomingSharedLink = link;
  }
}

/**
 * Handle incoming shared payload (text, web URL, or title)
 */
export function handleIncomingSharePayload(payload) {
  if (!payload) return;

  let sharedUrl = "";
  let sharedText = "";
  let sharedTitle = "";

  if (typeof payload === "string") {
    // If string is an intent URL or standard web URL
    try {
      if (payload.startsWith("http://") || payload.startsWith("https://")) {
        sharedUrl = payload;
      } else if (payload.includes("?") || payload.startsWith("flashgram://")) {
        const parsed = new URL(payload, window.location.origin);
        sharedUrl = parsed.searchParams.get("url") || parsed.searchParams.get("link") || "";
        sharedText = parsed.searchParams.get("text") || parsed.searchParams.get("shared_text") || "";
        sharedTitle = parsed.searchParams.get("title") || "";
      } else {
        sharedText = payload;
      }
    } catch (_) {
      sharedText = payload;
    }
  } else if (typeof payload === "object") {
    sharedUrl = payload.url || payload.link || payload.shared_url || "";
    sharedText = payload.text || payload.message || payload.shared_text || "";
    sharedTitle = payload.title || "";
  }

  // Combine content if needed
  const finalContent = sharedUrl || sharedText || sharedTitle;
  if (!finalContent || finalContent.trim().length === 0) return;

  const cleanPayload = {
    url: sharedUrl.trim(),
    text: sharedText.trim(),
    title: sharedTitle.trim(),
    full: finalContent.trim()
  };

  setIncomingSharedLink(cleanPayload.full);

  // Requirement 3: Show subtle confirmation toast upon successfully catching the shared link
  showInstagramToast("Link received from external app 🔗");

  // Open the Flashgram Share Sheet modal
  setTimeout(() => {
    openFlashgramShareModal(cleanPayload);
  }, 350);
}

/**
 * Check window.location.search for WebToNative / PWA Web Share Target params
 */
export function checkUrlShareParams() {
  if (typeof window === "undefined" || !window.location) return;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hasShareParams = 
      urlParams.has("text") || 
      urlParams.has("url") || 
      urlParams.has("title") || 
      urlParams.has("shared_text") || 
      urlParams.has("shared_url") ||
      urlParams.has("link");

    if (hasShareParams) {
      const payload = {
        title: urlParams.get("title") || "",
        text: urlParams.get("text") || urlParams.get("shared_text") || "",
        url: urlParams.get("url") || urlParams.get("shared_url") || urlParams.get("link") || ""
      };

      // Clean browser history URL so refresh does not re-trigger
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      handleIncomingSharePayload(payload);
    }
  } catch (err) {
    console.warn("checkUrlShareParams error:", err);
  }
}

/**
 * Initialize all native and web share intent listeners
 */
export function initIncomingShareListener() {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Check for immediate URL query parameters (WebToNative / Web Share Target)
  checkUrlShareParams();

  // 2. Capacitor App Plugin Listener (@capacitor/app or window.Capacitor)
  if (typeof window !== "undefined") {
    // Check if Capacitor App plugin exists
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      try {
        window.Capacitor.Plugins.App.addListener("appUrlOpen", (data) => {
          if (data && data.url) {
            handleIncomingSharePayload(data.url);
          }
        });
      } catch (e) {
        console.warn("Capacitor appUrlOpen registration note:", e);
      }
    }

    // 3. Window event listeners for custom native bridges / Cordova / WebToNative
    window.addEventListener("appUrlOpen", (event) => {
      const url = (event && event.detail && event.detail.url) || (event && event.url);
      if (url) handleIncomingSharePayload(url);
    });

    window.addEventListener("sendIntentReceived", (event) => {
      const detail = (event && event.detail) || event;
      if (detail) handleIncomingSharePayload(detail);
    });

    // WebToNative Bridge Global Callback
    window.onWebToNativeShareReceived = (data) => {
      handleIncomingSharePayload(data);
    };
  }
}

if (typeof window !== "undefined") {
  window.initIncomingShareListener = initIncomingShareListener;
  window.handleIncomingSharePayload = handleIncomingSharePayload;
  window.getIncomingSharedLink = getIncomingSharedLink;
}
