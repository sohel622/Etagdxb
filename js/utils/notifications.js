// js/utils/notifications.js - Smooth Upload Progress & Alerts
import { showInstagramToast } from "./storage.js";

export function notifyUploadProgress(percent, filename = "Video") {
  const rounded = Math.round(percent);
  const banner = document.getElementById("uploadProgressBarFill");
  if (banner) {
    banner.style.width = `${rounded}%`;
  }
}

export function notifyUploadComplete(message = "Upload complete! ✨") {
  showInstagramToast(message);
}

export function notifyUploadError(error) {
  showInstagramToast(error?.message || "Upload failed. Please try again.");
}
