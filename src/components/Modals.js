// Modals Component (Edit Profile, Bio, Links, Crop, Settings, Media Recorder)
import { db } from "../services/database.js";
import { UserProfileStore, showInstagramToast } from "../utils/storage.js";
import { renderDragBox, updateActivePillPosition, showStandardNavBar } from "./BottomNavigation.js";
import { loadReels } from "./ReelsViewer.js";
import { renderHomeFeed, pauseAllHomeVideos, prependPostToHomeFeed } from "./Feed.js";
import { updateProfilePostsCount, renderProfileGrid } from "./Profile.js";
import { switchTab } from "./navigation/BottomNavbar.js";

// --- Shared State Variables ---
let currentEditingBio = null;
let currentLinkUrl = "linktr.ee/arya_official";
let cropScale = 1.0;
let cropTranslateX = 0;
let cropTranslateY = 0;
const CROP_DIAMETER = 270;

let liveMediaStream = null;
let liveMediaRecorder = null;
let recordedChunks = [];
let isRecordingVideo = false;
let recordingTimerInterval = null;
let recordingSeconds = 0;
let currentCameraFacing = "user";
let isMicMuted = false;

const FONT_MAP = {
  inter: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  classic: "'Playfair Display', Georgia, serif",
  rounded: "'Poppins', system-ui, sans-serif",
  grandhotel: "'Grand Hotel', cursive, sans-serif",
  mono: "'Courier New', Courier, monospace"
};

const DEFAULT_GLASS_SETTINGS = {
  style: "classic",
  position: "low",
  width: 83,
  height: 52,
  radius: 50,
  blur: 16,
  opacity: 50,
  borderGlow: 25
};

let currentGlassSettings = { ...DEFAULT_GLASS_SETTINGS };

// --- Profile & Bio Helpers ---
function splitFullName(fullName) {
  const trimmed = (fullName || "").trim();
  if (!trimmed) return { first: "", last: "" };
  const parts = trimmed.split(/\s+/);
  const first = parts[0] || "";
  const last = parts.slice(1).join(" ") || "";
  return { first, last };
}

function updateInlineBioCharCount() {
  const inputEditBio = document.getElementById("inputEditBio");
  const editBioInlineCounter = document.getElementById("editBioInlineCounter");
  if (!inputEditBio) return;
  const count = inputEditBio.value.length;
  if (editBioInlineCounter) {
    editBioInlineCounter.textContent = `${count} / 150`;
    editBioInlineCounter.style.color = count >= 140 ? "#f43f5e" : "#71717a";
  }
}

// --- A. Edit Profile Screen Navigation ---
function openEditProfileScreen() {
  const editProfileScreen = document.getElementById("editProfileScreen");
  if (!editProfileScreen) return;
  const profileDisplayName = document.getElementById("profileDisplayName");
  const profileHeaderUsername = document.getElementById("profileHeaderUsername");
  const profileBioText = document.getElementById("profileBioText");
  const inputEditName = document.getElementById("inputEditName");
  const inputEditFirstName = document.getElementById("inputEditFirstName");
  const inputEditLastName = document.getElementById("inputEditLastName");
  const inputEditUsername = document.getElementById("inputEditUsername");
  const inputEditBio = document.getElementById("inputEditBio");
  const mainProfileAvatarImg = document.getElementById("mainProfileAvatarImg");
  const editProfileAvatarPreview = document.getElementById("editProfileAvatarPreview");
  const editBioPreviewSnippet = document.getElementById("editBioPreviewSnippet");
  const editLinksPreviewSnippet = document.getElementById("editLinksPreviewSnippet");

  const currentName = profileDisplayName ? profileDisplayName.textContent.trim() : "Arya Sharma ✨";
  const currentUsername = profileHeaderUsername ? profileHeaderUsername.textContent.trim() : "arya.gmr_";
  const currentBio = profileBioText ? profileBioText.textContent : "";

  if (inputEditName) inputEditName.value = currentName;
  const { first, last } = splitFullName(currentName);
  if (inputEditFirstName) inputEditFirstName.value = first;
  if (inputEditLastName) inputEditLastName.value = last;
  if (inputEditUsername) inputEditUsername.value = currentUsername;
  if (inputEditBio) {
    inputEditBio.value = currentBio;
    updateInlineBioCharCount();
  }
  if (mainProfileAvatarImg && editProfileAvatarPreview) {
    editProfileAvatarPreview.src = mainProfileAvatarImg.src;
  }
  if (editBioPreviewSnippet) {
    editBioPreviewSnippet.textContent = currentBio.replace(/\n/g, " ").trim() || "Add a bio...";
  }
  if (editLinksPreviewSnippet) {
    editLinksPreviewSnippet.textContent = currentLinkUrl ? "1 link" : "Add links";
  }
  currentEditingBio = currentBio;
  editProfileScreen.classList.add("active");
  editProfileScreen.setAttribute("aria-hidden", "false");
}

function closeEditProfileScreen() {
  const editProfileScreen = document.getElementById("editProfileScreen");
  if (!editProfileScreen) return;
  editProfileScreen.classList.remove("active");
  editProfileScreen.setAttribute("aria-hidden", "true");
}

function saveEditProfile() {
  const inputEditFirstName = document.getElementById("inputEditFirstName");
  const inputEditLastName = document.getElementById("inputEditLastName");
  const inputEditName = document.getElementById("inputEditName");
  const inputEditUsername = document.getElementById("inputEditUsername");
  const inputEditPronouns = document.getElementById("inputEditPronouns");
  const inputEditBio = document.getElementById("inputEditBio");
  const profileBioText = document.getElementById("profileBioText");
  const profileBioLinkText = document.getElementById("profileBioLinkText");

  const first = inputEditFirstName ? inputEditFirstName.value.trim() : "";
  const last = inputEditLastName ? inputEditLastName.value.trim() : "";
  const combinedName = [first, last].filter(Boolean).join(" ");
  const newName = combinedName || (inputEditName ? inputEditName.value.trim() : "");
  if (inputEditName) inputEditName.value = newName;

  const newUsername = inputEditUsername ? inputEditUsername.value.trim() : "";
  const newPronouns = inputEditPronouns ? inputEditPronouns.value.trim() : "";
  const newBio = inputEditBio ? inputEditBio.value : (currentEditingBio !== null ? currentEditingBio : (profileBioText ? profileBioText.textContent : ""));
  currentEditingBio = newBio;

  UserProfileStore.setState({
    name: newName || UserProfileStore.state.name,
    username: newUsername || UserProfileStore.state.username,
    pronouns: newPronouns,
    bio: newBio,
    link: currentLinkUrl
  });

  if (profileBioText) profileBioText.textContent = newBio;
  if (profileBioLinkText && currentLinkUrl) profileBioLinkText.textContent = currentLinkUrl;

  closeEditProfileScreen();
}

// --- B. Dedicated Bio Editing Screen Navigation ---
function openBioEditingScreen() {
  const bioEditingScreen = document.getElementById("bioEditingScreen");
  if (!bioEditingScreen) return;
  const profileBioText = document.getElementById("profileBioText");
  const bioDedicatedTextarea = document.getElementById("bioDedicatedTextarea");
  const initialBio = currentEditingBio !== null ? currentEditingBio : (profileBioText ? profileBioText.textContent : "");
  if (bioDedicatedTextarea) {
    bioDedicatedTextarea.value = initialBio;
    updateBioCharCount();
  }
  bioEditingScreen.classList.add("active");
  bioEditingScreen.setAttribute("aria-hidden", "false");
  setTimeout(() => {
    if (bioDedicatedTextarea) bioDedicatedTextarea.focus();
  }, 150);
}

function updateBioCharCount() {
  const bioDedicatedTextarea = document.getElementById("bioDedicatedTextarea");
  const bioCharCounter = document.getElementById("bioCharCounter");
  if (!bioDedicatedTextarea || !bioCharCounter) return;
  const len = bioDedicatedTextarea.value.length;
  bioCharCounter.textContent = `${len} / 150`;
  bioCharCounter.style.color = len >= 140 ? "#ef4444" : "#8e8e8e";
}

function closeBioEditingScreen() {
  const bioEditingScreen = document.getElementById("bioEditingScreen");
  if (!bioEditingScreen) return;
  bioEditingScreen.classList.remove("active");
  bioEditingScreen.setAttribute("aria-hidden", "true");
}

function saveBioEditing() {
  const bioDedicatedTextarea = document.getElementById("bioDedicatedTextarea");
  const inputEditBio = document.getElementById("inputEditBio");
  const editBioPreviewSnippet = document.getElementById("editBioPreviewSnippet");
  if (bioDedicatedTextarea) {
    currentEditingBio = bioDedicatedTextarea.value;
    if (inputEditBio) {
      inputEditBio.value = currentEditingBio;
      updateInlineBioCharCount();
    }
    if (editBioPreviewSnippet) {
      editBioPreviewSnippet.textContent = currentEditingBio.replace(/\n/g, " ").trim() || "Add a bio...";
    }
  }
  closeBioEditingScreen();
}

// --- C. Links Management Modal ---
function openLinksModal() {
  const linksModalOverlay = document.getElementById("linksModalOverlay");
  const inputLinksUrl = document.getElementById("inputLinksUrl");
  if (!linksModalOverlay) return;
  if (inputLinksUrl) inputLinksUrl.value = currentLinkUrl;
  linksModalOverlay.classList.add("active");
  linksModalOverlay.setAttribute("aria-hidden", "false");
}

function closeLinksModal() {
  const linksModalOverlay = document.getElementById("linksModalOverlay");
  if (!linksModalOverlay) return;
  linksModalOverlay.classList.remove("active");
  linksModalOverlay.setAttribute("aria-hidden", "true");
}

function saveLinks() {
  const inputLinksUrl = document.getElementById("inputLinksUrl");
  const profileBioLinkText = document.getElementById("profileBioLinkText");
  const editLinksPreviewSnippet = document.getElementById("editLinksPreviewSnippet");
  if (inputLinksUrl) {
    currentLinkUrl = inputLinksUrl.value.trim() || "linktr.ee/arya_official";
    if (profileBioLinkText) profileBioLinkText.textContent = currentLinkUrl;
    if (editLinksPreviewSnippet) editLinksPreviewSnippet.textContent = currentLinkUrl ? "1 link" : "Add links";
    try {
      const cur = JSON.parse(localStorage.getItem("user_profile_info") || "{}");
      cur.link = currentLinkUrl;
      localStorage.setItem("user_profile_info", JSON.stringify(cur));
    } catch (_) {}
  }
  closeLinksModal();
}

// --- D. Interactive Image Pinch-to-Zoom & Crop Modal ---
function triggerSetPhoto() {
  const profileAvatarFileInput = document.getElementById("profileAvatarFileInput");
  if (profileAvatarFileInput) {
    profileAvatarFileInput.value = "";
    profileAvatarFileInput.click();
  }
}

function applyCropTransform() {
  const cropImageLayer = document.getElementById("cropImageLayer");
  if (!cropImageLayer) return;
  cropImageLayer.style.transform = `translate3d(${cropTranslateX}px, ${cropTranslateY}px, 0) scale(${cropScale})`;
}

function openImageCropModal(imageSrc) {
  const imageCropModal = document.getElementById("imageCropModal");
  const cropTargetImg = document.getElementById("cropTargetImg");
  const cropZoomSlider = document.getElementById("cropZoomSlider");
  if (!imageCropModal || !cropTargetImg) return;
  cropTargetImg.src = imageSrc;
  cropTargetImg.onload = () => {
    const nw = cropTargetImg.naturalWidth || 400;
    const nh = cropTargetImg.naturalHeight || 400;

    let baseW, baseH;
    if (nw >= nh) {
      baseH = CROP_DIAMETER;
      baseW = CROP_DIAMETER * (nw / nh);
    } else {
      baseW = CROP_DIAMETER;
      baseH = CROP_DIAMETER * (nh / nw);
    }

    cropTargetImg.style.width = `${Math.round(baseW)}px`;
    cropTargetImg.style.height = `${Math.round(baseH)}px`;

    cropScale = 1.0;
    cropTranslateX = 0;
    cropTranslateY = 0;
    if (cropZoomSlider) cropZoomSlider.value = "1";
    applyCropTransform();

    imageCropModal.classList.add("active");
    imageCropModal.setAttribute("aria-hidden", "false");
  };
}

function closeImageCropModal() {
  const imageCropModal = document.getElementById("imageCropModal");
  if (!imageCropModal) return;
  imageCropModal.classList.remove("active");
  imageCropModal.setAttribute("aria-hidden", "true");
}

function executeCropAndSave() {
  const cropTargetImg = document.getElementById("cropTargetImg");
  const cropCircularMask = document.getElementById("cropCircularMask");
  if (!cropTargetImg || !cropCircularMask) return;
  const maskRect = cropCircularMask.getBoundingClientRect();
  const imgRect = cropTargetImg.getBoundingClientRect();

  if (imgRect.width === 0 || imgRect.height === 0) {
    closeImageCropModal();
    return;
  }

  const ratioX = (cropTargetImg.naturalWidth || imgRect.width) / imgRect.width;
  const ratioY = (cropTargetImg.naturalHeight || imgRect.height) / imgRect.height;

  const srcX = Math.max(0, (maskRect.left - imgRect.left) * ratioX);
  const srcY = Math.max(0, (maskRect.top - imgRect.top) * ratioY);
  const srcW = Math.min(cropTargetImg.naturalWidth - srcX, maskRect.width * ratioX);
  const srcH = Math.min(cropTargetImg.naturalHeight - srcY, maskRect.height * ratioY);

  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 500;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(cropTargetImg, srcX, srcY, srcW, srcH, 0, 0, 500, 500);
  const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);

  UserProfileStore.setState({
    avatar: croppedDataUrl
  });

  closeImageCropModal();
}

function initCropGestures() {
  const cropStageContainer = document.getElementById("cropStageContainer");
  const cropZoomSlider = document.getElementById("cropZoomSlider");
  if (!cropStageContainer) return;

  let isTouchDragging = false;
  let isTouchPinching = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartPosX = 0;
  let touchStartPosY = 0;
  let pinchInitialDist = 0;
  let pinchInitialScale = 1;

  let isMouseDragging = false;
  let mouseStartX = 0;
  let mouseStartY = 0;
  let mouseStartPosX = 0;
  let mouseStartPosY = 0;

  cropStageContainer.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      isTouchDragging = true;
      isTouchPinching = false;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartPosX = cropTranslateX;
      touchStartPosY = cropTranslateY;
    } else if (e.touches.length === 2) {
      isTouchPinching = true;
      isTouchDragging = false;
      pinchInitialDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchInitialScale = cropScale;
    }
  }, { passive: false });

  cropStageContainer.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (isTouchPinching && e.touches.length === 2) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (pinchInitialDist > 0) {
        const factor = currentDist / pinchInitialDist;
        cropScale = Math.max(0.8, Math.min(4.0, pinchInitialScale * factor));
        if (cropZoomSlider) cropZoomSlider.value = String(cropScale);
        applyCropTransform();
      }
    } else if (isTouchDragging && e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      cropTranslateX = touchStartPosX + dx;
      cropTranslateY = touchStartPosY + dy;
      applyCropTransform();
    }
  }, { passive: false });

  const onTouchEnd = (e) => {
    if (e.touches.length === 1) {
      isTouchPinching = false;
      isTouchDragging = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartPosX = cropTranslateX;
      touchStartPosY = cropTranslateY;
    } else if (e.touches.length === 0) {
      isTouchDragging = false;
      isTouchPinching = false;
    }
  };
  cropStageContainer.addEventListener("touchend", onTouchEnd);
  cropStageContainer.addEventListener("touchcancel", onTouchEnd);

  cropStageContainer.addEventListener("mousedown", (e) => {
    isMouseDragging = true;
    cropStageContainer.classList.add("is-grabbing");
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    mouseStartPosX = cropTranslateX;
    mouseStartPosY = cropTranslateY;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isMouseDragging) return;
    const dx = e.clientX - mouseStartX;
    const dy = e.clientY - mouseStartY;
    cropTranslateX = mouseStartPosX + dx;
    cropTranslateY = mouseStartPosY + dy;
    applyCropTransform();
  });

  window.addEventListener("mouseup", () => {
    if (isMouseDragging) {
      isMouseDragging = false;
      cropStageContainer.classList.remove("is-grabbing");
    }
  });

  cropStageContainer.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    cropScale = Math.max(0.8, Math.min(4.0, cropScale + delta));
    if (cropZoomSlider) cropZoomSlider.value = String(cropScale);
    applyCropTransform();
  }, { passive: false });

  if (cropZoomSlider) {
    cropZoomSlider.addEventListener("input", (e) => {
      cropScale = parseFloat(e.target.value);
      applyCropTransform();
    });
  }
}

// --- E. Themes & Liquid Glass Settings Panel ---
function updatePreviewActivePillPosition(itemEl) {
  const previewActivePill = document.getElementById("previewActivePill");
  if (!previewActivePill || !itemEl) return;
  const left = itemEl.offsetLeft + 3;
  const width = Math.max(itemEl.offsetWidth - 6, 28);
  previewActivePill.style.transform = `translateX(${left}px)`;
  previewActivePill.style.width = `${width}px`;
}

function applyGlassSettings(settings, save = true) {
  currentGlassSettings = { ...DEFAULT_GLASS_SETTINGS, ...settings };
  const root = document.documentElement;

  const style = currentGlassSettings.style || 'classic';
  const pos = currentGlassSettings.position || 'low';
  const width = parseInt(currentGlassSettings.width, 10) || 83;
  const height = parseInt(currentGlassSettings.height, 10) || 52;
  const radiusVal = parseInt(currentGlassSettings.radius, 10) || 50;
  const blur = parseInt(currentGlassSettings.blur, 10) >= 0 ? parseInt(currentGlassSettings.blur, 10) : 16;
  const opacityVal = parseInt(currentGlassSettings.opacity, 10) || 50;
  const borderVal = parseInt(currentGlassSettings.borderGlow, 10) >= 0 ? parseInt(currentGlassSettings.borderGlow, 10) : 25;

  const opacity = opacityVal / 100;
  const borderGlow = borderVal / 100;
  const radius = radiusVal >= 48 ? '50px' : `${radiusVal}px`;
  const bottomPx = pos === 'high' ? 40 : (pos === 'medium' ? 28 : 16);

  root.style.setProperty('--lg-width', `${width}%`);
  root.style.setProperty('--lg-height', `${height}px`);
  root.style.setProperty('--lg-radius', radius);
  root.style.setProperty('--lg-blur', `${blur}px`);
  root.style.setProperty('--lg-opacity', opacity);
  root.style.setProperty('--lg-border-glow', borderGlow);
  root.style.setProperty('--lg-bottom', `${bottomPx}px`);

  const bottomNavBar = document.getElementById("bottomNavBar");
  if (bottomNavBar) {
    bottomNavBar.classList.remove('style-classic', 'style-frosted', 'style-neon', 'style-cyberpunk');
    bottomNavBar.classList.add(`style-${style}`);
  }

  const homeView = document.getElementById("homeView");
  if (homeView && bottomNavBar && bottomNavBar.classList.contains("liquid-glass-mode")) {
    homeView.style.paddingBottom = `${bottomPx + height + 14}px`;
  }

  const glassPreviewPill = document.getElementById("glassPreviewPill");
  if (glassPreviewPill) {
    glassPreviewPill.classList.remove('style-classic', 'style-frosted', 'style-neon', 'style-cyberpunk');
    glassPreviewPill.classList.add(`style-${style}`);

    glassPreviewPill.style.width = `${width}%`;
    glassPreviewPill.style.height = `${height}px`;
    glassPreviewPill.style.borderRadius = radius;

    const previewOffsetY = pos === 'high' ? -8 : (pos === 'medium' ? 0 : 8);
    glassPreviewPill.style.transform = `translateY(${previewOffsetY}px)`;

    if (style === 'frosted') {
      glassPreviewPill.style.backdropFilter = `blur(${blur + 6}px) saturate(220%) contrast(115%)`;
      glassPreviewPill.style.webkitBackdropFilter = `blur(${blur + 6}px) saturate(220%) contrast(115%)`;
      glassPreviewPill.style.backgroundColor = `rgba(255, 255, 255, ${Math.min(opacity * 1.15, 0.85)})`;
      glassPreviewPill.style.border = `1px solid rgba(255, 255, 255, ${Math.min(borderGlow * 1.3, 0.6)})`;
      glassPreviewPill.style.boxShadow = `0 8px 32px 0 rgba(0, 0, 0, 0.25), inset 0 1.5px 2px rgba(255, 255, 255, 0.5)`;
    } else if (style === 'neon') {
      glassPreviewPill.style.backdropFilter = `blur(${blur}px) saturate(200%)`;
      glassPreviewPill.style.webkitBackdropFilter = `blur(${blur}px) saturate(200%)`;
      glassPreviewPill.style.backgroundColor = `rgba(10, 20, 30, ${opacity})`;
      glassPreviewPill.style.border = `1px solid rgba(0, 242, 254, ${Math.max(borderGlow, 0.45)})`;
      glassPreviewPill.style.boxShadow = `0 8px 32px 0 rgba(0, 0, 0, 0.35), 0 0 16px rgba(0, 242, 254, ${borderGlow * 0.75}), inset 0 1px 2px rgba(0, 242, 254, 0.5)`;
    } else if (style === 'cyberpunk') {
      glassPreviewPill.style.backdropFilter = `blur(${blur}px) saturate(200%)`;
      glassPreviewPill.style.webkitBackdropFilter = `blur(${blur}px) saturate(200%)`;
      glassPreviewPill.style.backgroundColor = `rgba(24, 10, 26, ${opacity})`;
      glassPreviewPill.style.border = `1px solid rgba(255, 0, 128, ${Math.max(borderGlow, 0.45)})`;
      glassPreviewPill.style.boxShadow = `0 8px 32px 0 rgba(0, 0, 0, 0.35), 0 0 16px rgba(255, 0, 128, ${borderGlow * 0.75}), inset 0 1px 2px rgba(255, 0, 128, 0.5)`;
    } else {
      glassPreviewPill.style.backdropFilter = `blur(${blur}px) saturate(180%) contrast(105%)`;
      glassPreviewPill.style.webkitBackdropFilter = `blur(${blur}px) saturate(180%) contrast(105%)`;
      glassPreviewPill.style.backgroundColor = `rgba(255, 255, 255, ${opacity})`;
      glassPreviewPill.style.border = `1px solid rgba(255, 255, 255, ${borderGlow})`;
      glassPreviewPill.style.boxShadow = `0 8px 32px 0 rgba(0, 0, 0, 0.20), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.35)`;
    }
  }

  const styleBtns = document.querySelectorAll('#glassStyleSelector .glass-segmented-btn');
  styleBtns.forEach(b => {
    if (b.getAttribute('data-style') === style) b.classList.add('active');
    else b.classList.remove('active');
  });

  const positionBtns = document.querySelectorAll('#glassPositionSelector .glass-segmented-btn');
  positionBtns.forEach(b => {
    if (b.getAttribute('data-position') === pos) b.classList.add('active');
    else b.classList.remove('active');
  });

  const sliderWidth = document.getElementById("sliderWidth");
  const sliderHeight = document.getElementById("sliderHeight");
  const sliderRadius = document.getElementById("sliderRadius");
  const sliderBlur = document.getElementById("sliderBlur");
  const sliderOpacity = document.getElementById("sliderOpacity");
  const sliderBorder = document.getElementById("sliderBorder");

  if (sliderWidth) sliderWidth.value = width;
  if (sliderHeight) sliderHeight.value = height;
  if (sliderRadius) sliderRadius.value = radiusVal;
  if (sliderBlur) sliderBlur.value = blur;
  if (sliderOpacity) sliderOpacity.value = opacityVal;
  if (sliderBorder) sliderBorder.value = borderVal;

  const valStyle = document.getElementById("valStyle");
  const valPosition = document.getElementById("valPosition");
  const valWidth = document.getElementById("valWidth");
  const valHeight = document.getElementById("valHeight");
  const valRadius = document.getElementById("valRadius");
  const valBlur = document.getElementById("valBlur");
  const valOpacity = document.getElementById("valOpacity");
  const valBorder = document.getElementById("valBorder");

  if (valStyle) valStyle.textContent = style.charAt(0).toUpperCase() + style.slice(1);
  if (valPosition) valPosition.textContent = `${pos.charAt(0).toUpperCase() + pos.slice(1)} (${bottomPx}px)`;
  if (valWidth) valWidth.textContent = `${width}%`;
  if (valHeight) valHeight.textContent = `${height}px`;
  if (valRadius) valRadius.textContent = radiusVal >= 48 ? '50px (Full Pill)' : `${radiusVal}px`;
  if (valBlur) valBlur.textContent = `${blur}px`;
  if (valOpacity) valOpacity.textContent = `${opacityVal}%`;
  if (valBorder) valBorder.textContent = `${borderVal}%`;

  if (save) {
    localStorage.setItem("liquid_glass_custom_settings_v3", JSON.stringify(currentGlassSettings));
  }

  const activeMainBtn = document.querySelector('.nav-btn.active');
  if (activeMainBtn) updateActivePillPosition(activeMainBtn);
  const activePreviewItem = document.querySelector('.preview-nav-item.active');
  if (activePreviewItem) updatePreviewActivePillPosition(activePreviewItem);
}

function updateProgressBarPosition(isGlass) {
  const pBar = document.getElementById("reelsProgressBarContainer");
  if (!pBar) return;
  if (isGlass) {
    pBar.classList.add("glass-mode");
    pBar.classList.remove("flat-mode");
  } else {
    pBar.classList.add("flat-mode");
    pBar.classList.remove("glass-mode");
  }
}

function applyLiquidGlassState(enabled) {
  showStandardNavBar();
  const bottomNavBar = document.getElementById("bottomNavBar");
  const homeView = document.getElementById("homeView");
  const glassStatusBadge = document.getElementById("glassStatusBadge");
  const glassCustomizerCollapse = document.getElementById("glassCustomizerCollapse");

  if (enabled) {
    if (bottomNavBar) bottomNavBar.classList.add("liquid-glass-mode");
    applyGlassSettings(currentGlassSettings, false);
    const bottomPx = currentGlassSettings.position === 'high' ? 40 : (currentGlassSettings.position === 'medium' ? 28 : 16);
    const h = currentGlassSettings.height || 52;
    if (homeView) homeView.style.paddingBottom = `${bottomPx + h + 14}px`;
    if (glassStatusBadge) {
      glassStatusBadge.classList.remove("disabled");
      glassStatusBadge.innerHTML = `<i class="fa-solid fa-circle-dot" style="font-size: 8px;"></i> <span>Running: Liquid Glass Navigation</span>`;
    }
    if (glassCustomizerCollapse) {
      glassCustomizerCollapse.classList.add("expanded");
    }
    const activeBtn = document.querySelector('.nav-btn.active');
    if (activeBtn) updateActivePillPosition(activeBtn);
  } else {
    if (bottomNavBar) bottomNavBar.classList.remove("liquid-glass-mode");
    if (homeView) homeView.style.paddingBottom = "56px";
    if (glassStatusBadge) {
      glassStatusBadge.classList.add("disabled");
      glassStatusBadge.innerHTML = `<i class="fa-regular fa-circle" style="font-size: 8px;"></i> <span>Disabled: Standard Flat Bar</span>`;
    }
    if (glassCustomizerCollapse) {
      glassCustomizerCollapse.classList.remove("expanded");
    }
    const activePill = document.getElementById("navActivePill");
    if (activePill) activePill.style.opacity = "0";
  }
  updateProgressBarPosition(enabled);
}

function openSettingsModal() {
  renderDragBox();
  const settingsOverlay = document.getElementById("settingsOverlay");
  if (settingsOverlay) settingsOverlay.classList.add("open");
  setTimeout(() => {
    const activePreviewItem = document.querySelector('.preview-nav-item.active') || document.querySelector('.preview-nav-item');
    if (activePreviewItem) updatePreviewActivePillPosition(activePreviewItem);
  }, 80);
}

function closeSettingsModal() {
  const settingsOverlay = document.getElementById("settingsOverlay");
  if (settingsOverlay) settingsOverlay.classList.remove("open");
}

function initSettingsPanel() {
  const appFontSelect = document.getElementById("appFontSelect");
  if (appFontSelect) {
    const savedFont = localStorage.getItem("app_font") || "inter";
    appFontSelect.value = savedFont;
    document.documentElement.style.setProperty('--app-font-family', FONT_MAP[savedFont] || FONT_MAP.inter);

    appFontSelect.onchange = (e) => {
      const fontVal = e.target.value;
      document.documentElement.style.setProperty('--app-font-family', FONT_MAP[fontVal] || FONT_MAP.inter);
      localStorage.setItem("app_font", fontVal);
      alert("App font updated to " + e.target.options[e.target.selectedIndex].text);
    };
  }

  const appEmojiSelect = document.getElementById("appEmojiSelect");
  if (appEmojiSelect) {
    const savedEmoji = localStorage.getItem("app_emoji") || "apple";
    appEmojiSelect.value = savedEmoji;

    appEmojiSelect.onchange = (e) => {
      const emojiVal = e.target.value;
      localStorage.setItem("app_emoji", emojiVal);
      alert("Emoji style updated to " + e.target.options[e.target.selectedIndex].text + " 👍❤️✨");
    };
  }

  // Interactive live preview items
  document.querySelectorAll('.preview-nav-item').forEach(item => {
    item.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.preview-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      updatePreviewActivePillPosition(item);
    };
  });

  // Glass style buttons
  document.querySelectorAll('#glassStyleSelector .glass-segmented-btn').forEach(btn => {
    btn.onclick = () => {
      const style = btn.getAttribute('data-style') || 'classic';
      currentGlassSettings.style = style;
      applyGlassSettings(currentGlassSettings, true);
    };
  });

  // Glass position buttons
  document.querySelectorAll('#glassPositionSelector .glass-segmented-btn').forEach(btn => {
    btn.onclick = () => {
      const pos = btn.getAttribute('data-position') || 'low';
      currentGlassSettings.position = pos;
      applyGlassSettings(currentGlassSettings, true);
    };
  });

  const sliderWidth = document.getElementById("sliderWidth");
  const sliderHeight = document.getElementById("sliderHeight");
  const sliderRadius = document.getElementById("sliderRadius");
  const sliderBlur = document.getElementById("sliderBlur");
  const sliderOpacity = document.getElementById("sliderOpacity");
  const sliderBorder = document.getElementById("sliderBorder");

  const handleSliderInput = () => {
    const newSettings = {
      style: currentGlassSettings.style || 'classic',
      position: currentGlassSettings.position || 'low',
      width: parseInt(sliderWidth ? sliderWidth.value : 83, 10),
      height: parseInt(sliderHeight ? sliderHeight.value : 52, 10),
      radius: parseInt(sliderRadius ? sliderRadius.value : 50, 10),
      blur: parseInt(sliderBlur ? sliderBlur.value : 16, 10),
      opacity: parseInt(sliderOpacity ? sliderOpacity.value : 50, 10),
      borderGlow: parseInt(sliderBorder ? sliderBorder.value : 25, 10)
    };
    applyGlassSettings(newSettings, true);
  };

  [sliderWidth, sliderHeight, sliderRadius, sliderBlur, sliderOpacity, sliderBorder].forEach(s => {
    if (s) s.addEventListener("input", handleSliderInput);
  });

  const resetGlassSettingsBtn = document.getElementById("resetGlassSettingsBtn");
  if (resetGlassSettingsBtn) {
    resetGlassSettingsBtn.onclick = () => {
      applyGlassSettings(DEFAULT_GLASS_SETTINGS, true);
      alert("Reset to Recommended Defaults ✨");
    };
  }

  // Load saved glass settings
  try {
    const savedSettings = localStorage.getItem("liquid_glass_custom_settings_v3");
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      applyGlassSettings({ ...DEFAULT_GLASS_SETTINGS, ...parsed }, false);
    } else {
      applyGlassSettings(DEFAULT_GLASS_SETTINGS, false);
    }
  } catch (_) {
    applyGlassSettings(DEFAULT_GLASS_SETTINGS, false);
  }

  const liquidGlassToggle = document.getElementById("liquidGlassToggle");
  if (liquidGlassToggle) {
    const savedLiquidGlass = localStorage.getItem("liquid_glass_enabled_user");
    const isLiquidGlassActive = savedLiquidGlass === "true";
    liquidGlassToggle.checked = isLiquidGlassActive;
    applyLiquidGlassState(isLiquidGlassActive);

    liquidGlassToggle.onchange = (e) => {
      const isChecked = e.target.checked;
      applyLiquidGlassState(isChecked);
      if (isChecked) {
        applyGlassSettings(currentGlassSettings, true);
      }
      localStorage.setItem("liquid_glass_enabled_user", isChecked ? "true" : "false");
      localStorage.setItem("liquid_glass_enabled", isChecked ? "true" : "false");
      alert(isChecked ? "Liquid Glass enabled with recommended defaults ✨" : "Liquid Glass disabled (Standard Bar active)");
    };
  }
}

// --- F. Media Creation & Video Recording Session ---
function openMediaCreationPrompt() {
  const mediaCreationOverlay = document.getElementById("mediaCreationOverlay");
  if (mediaCreationOverlay) {
    mediaCreationOverlay.classList.add("active");
    mediaCreationOverlay.setAttribute("aria-hidden", "false");
  }
}

function closeMediaCreationPrompt() {
  const mediaCreationOverlay = document.getElementById("mediaCreationOverlay");
  if (mediaCreationOverlay) {
    mediaCreationOverlay.classList.remove("active");
    mediaCreationOverlay.setAttribute("aria-hidden", "true");
  }
}

async function requestInitialBrowserNotificationPermission() {
  try {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm === "granted" && typeof showInstagramToast === "function") {
          showInstagramToast("Notifications enabled");
        }
      }
    }
  } catch (err) {
    console.warn("Notification.requestPermission warning:", err);
  }
}

async function openCameraMicrophoneSession() {
  const cameraModal = document.getElementById("cameraMicModal");
  const videoElem = document.getElementById("cameraMicLiveVideo");
  const promptBox = document.getElementById("cameraPermissionPromptBox");
  const statusLabel = document.getElementById("cameraStatusLabel");

  if (cameraModal) {
    cameraModal.classList.add("active");
    cameraModal.setAttribute("aria-hidden", "false");
  }
  if (promptBox) promptBox.classList.add("hidden");

  pauseAllHomeVideos();

  try {
    if (liveMediaStream) {
      liveMediaStream.getTracks().forEach(t => t.stop());
      liveMediaStream = null;
    }

    if (statusLabel) statusLabel.textContent = "Requesting permission...";

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("navigator.mediaDevices.getUserMedia is not supported on this browser.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: currentCameraFacing,
        width: { ideal: 1080 },
        height: { ideal: 1920 }
      },
      audio: true
    });

    liveMediaStream = stream;
    if (videoElem) {
      videoElem.srcObject = stream;
      videoElem.play().catch(e => console.log("video play:", e));
    }

    if (statusLabel) statusLabel.textContent = "Camera & Mic Live";
    if (typeof showInstagramToast === "function") {
      showInstagramToast("Camera & Microphone active");
    }
  } catch (err) {
    console.error("Camera & Microphone getUserMedia error:", err);
    if (promptBox) promptBox.classList.remove("hidden");
    if (statusLabel) statusLabel.textContent = "Permission Required";
    if (typeof showInstagramToast === "function") {
      showInstagramToast("Please allow Camera & Mic in browser settings");
    }
  }
}

function closeCameraModal() {
  const cameraModal = document.getElementById("cameraMicModal");
  const videoElem = document.getElementById("cameraMicLiveVideo");
  if (liveMediaStream) {
    liveMediaStream.getTracks().forEach(t => t.stop());
    liveMediaStream = null;
  }
  if (videoElem) {
    videoElem.srcObject = null;
  }
  if (cameraModal) {
    cameraModal.classList.remove("active");
    cameraModal.setAttribute("aria-hidden", "true");
  }
  stopRecordingSession(false);
}

async function toggleCameraFacing() {
  currentCameraFacing = currentCameraFacing === "user" ? "environment" : "user";
  await openCameraMicrophoneSession();
}

function toggleMicMute() {
  if (!liveMediaStream) return;
  const audioTracks = liveMediaStream.getAudioTracks();
  if (audioTracks.length > 0) {
    isMicMuted = !isMicMuted;
    audioTracks.forEach(track => track.enabled = !isMicMuted);
    const micIcon = document.getElementById("micIconStatus");
    if (micIcon) {
      micIcon.className = isMicMuted ? "fa-solid fa-microphone-slash text-red-400" : "fa-solid fa-microphone";
    }
    if (typeof showInstagramToast === "function") {
      showInstagramToast(isMicMuted ? "Microphone muted" : "Microphone unmuted");
    }
  }
}

function startRecordingSession() {
  if (!liveMediaStream) {
    openCameraMicrophoneSession();
    return;
  }
  try {
    recordedChunks = [];
    const options = { mimeType: "video/webm;codecs=vp8,opus" };
    let recorder;
    try {
      recorder = new MediaRecorder(liveMediaStream, options);
    } catch (e) {
      recorder = new MediaRecorder(liveMediaStream);
    }

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      if (recordedChunks.length > 0) {
        const blob = new Blob(recordedChunks, { type: recorder.mimeType || "video/webm" });
        try {
          const activeDb = db || (typeof window !== "undefined" && window.db);
          if (activeDb && typeof activeDb.transaction === "function") {
            const tx = activeDb.transaction("videos", "readwrite");
            const store = tx.objectStore("videos");
            const addReq = store.add({ blob: blob, type: blob.type });
            addReq.onsuccess = (ev) => {
              const newId = ev.target.result || Date.now();
              const blobUrl = URL.createObjectURL(blob);
              const newPost = {
                id: 'local_' + newId,
                url: blobUrl,
                thumbnail: blobUrl + '#t=0.001',
                thumbnail_url: blobUrl + '#t=0.001',
                user: UserProfileStore.state.username,
                avatar: UserProfileStore.state.avatar,
                isCurrentUser: true,
                location: 'Original Audio',
                caption: 'Recorded Reel! ✨ #lifestyle',
                likesCount: 1,
                commentsCount: 0,
                time: 'JUST NOW'
              };
              prependPostToHomeFeed(newPost);
              loadReels();
              updateProfilePostsCount();
              renderProfileGrid();
              if (typeof switchTab === "function") {
                switchTab("home");
              } else if (typeof window.switchTab === "function") {
                window.switchTab("home");
              }
              const homeView = document.getElementById("homeView");
              if (homeView) {
                homeView.scrollTo({ top: 0, behavior: "smooth" });
              }
              if (typeof showInstagramToast === "function") {
                showInstagramToast("Reel recorded and posted! 🎬");
              }
            };
          }
        } catch (err) {
          console.warn("Error saving recorded reel:", err);
        }
      }
    };

    recorder.start();
    liveMediaRecorder = recorder;
    isRecordingVideo = true;

    const shutterBtn = document.getElementById("cameraShutterBtn");
    const dot = document.getElementById("cameraRecordingDot");
    const timerElem = document.getElementById("cameraRecordingTimer");

    if (shutterBtn) shutterBtn.classList.add("is-recording");
    if (dot) dot.classList.remove("hidden");
    if (timerElem) {
      timerElem.style.opacity = "1";
      recordingSeconds = 0;
      timerElem.textContent = "00:00";
      recordingTimerInterval = setInterval(() => {
        recordingSeconds++;
        const mins = String(Math.floor(recordingSeconds / 60)).padStart(2, "0");
        const secs = String(recordingSeconds % 60).padStart(2, "0");
        timerElem.textContent = `${mins}:${secs}`;
      }, 1000);
    }
  } catch (err) {
    console.error("Start recording error:", err);
  }
}

function stopRecordingSession(save = true) {
  if (isRecordingVideo && liveMediaRecorder) {
    try {
      liveMediaRecorder.stop();
    } catch (e) {}
  }
  isRecordingVideo = false;
  clearInterval(recordingTimerInterval);
  const shutterBtn = document.getElementById("cameraShutterBtn");
  const dot = document.getElementById("cameraRecordingDot");
  const timerElem = document.getElementById("cameraRecordingTimer");
  if (shutterBtn) shutterBtn.classList.remove("is-recording");
  if (dot) dot.classList.add("hidden");
  if (timerElem) timerElem.style.opacity = "0";
}

function initMediaCreationAndCamera() {
  const videoFileInput = document.getElementById("videoFileInput");
  if (videoFileInput) {
    videoFileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        try {
          const activeDb = db || (typeof window !== "undefined" && window.db);
          if (activeDb && typeof activeDb.transaction === "function") {
            const tx = activeDb.transaction("videos", "readwrite");
            const store = tx.objectStore("videos");
            const addReq = store.add({ blob: file, type: file.type });
            addReq.onsuccess = (ev) => {
              const newId = ev.target.result || Date.now();
              const blobUrl = URL.createObjectURL(file);
              const newPost = {
                id: 'local_' + newId,
                url: blobUrl,
                thumbnail: blobUrl + '#t=0.001',
                thumbnail_url: blobUrl + '#t=0.001',
                user: UserProfileStore.state.username,
                avatar: UserProfileStore.state.avatar,
                isCurrentUser: true,
                location: 'Original Audio',
                caption: 'Uploaded Video Post! ✨ #lifestyle',
                likesCount: 1,
                commentsCount: 0,
                time: 'JUST NOW'
              };
              videoFileInput.value = "";
              prependPostToHomeFeed(newPost);
              loadReels();
              updateProfilePostsCount();
              renderProfileGrid();
              if (typeof switchTab === "function") {
                switchTab("home");
              } else if (typeof window.switchTab === "function") {
                window.switchTab("home");
              }
              const homeView = document.getElementById("homeView");
              if (homeView) {
                homeView.scrollTo({ top: 0, behavior: "smooth" });
              }
              if (typeof showInstagramToast === "function") {
                showInstagramToast("Video uploaded successfully! 🎬");
              }
            };
          }
        } catch (err) {
          console.warn("Error uploading video:", err);
        }
      }
    };
  }

  const cameraShutterBtn = document.getElementById("cameraShutterBtn");
  if (cameraShutterBtn) {
    cameraShutterBtn.addEventListener("click", () => {
      if (!isRecordingVideo) {
        startRecordingSession();
      } else {
        stopRecordingSession(true);
      }
    });
  }
}

// --- G. Main Modals Initialization Function ---
export function initModals() {
  const editProfileBtn = document.getElementById("editProfileBtn");
  const btnQuickEditInfo = document.getElementById("btnQuickEditInfo");
  if (editProfileBtn) editProfileBtn.onclick = openEditProfileScreen;
  if (btnQuickEditInfo) btnQuickEditInfo.onclick = openEditProfileScreen;

  const editProfileCancelBtn = document.getElementById("editProfileCancelBtn");
  if (editProfileCancelBtn) editProfileCancelBtn.onclick = closeEditProfileScreen;

  const editProfileDoneBtn = document.getElementById("editProfileDoneBtn");
  if (editProfileDoneBtn) editProfileDoneBtn.onclick = saveEditProfile;

  const editProfileBioRow = document.getElementById("editProfileBioRow");
  if (editProfileBioRow) editProfileBioRow.onclick = openBioEditingScreen;

  const bioDedicatedTextarea = document.getElementById("bioDedicatedTextarea");
  if (bioDedicatedTextarea) bioDedicatedTextarea.oninput = updateBioCharCount;

  const bioEditingCancelBtn = document.getElementById("bioEditingCancelBtn");
  if (bioEditingCancelBtn) bioEditingCancelBtn.onclick = closeBioEditingScreen;

  const bioEditingDoneBtn = document.getElementById("bioEditingDoneBtn");
  if (bioEditingDoneBtn) bioEditingDoneBtn.onclick = saveBioEditing;

  const editProfileLinksRow = document.getElementById("editProfileLinksRow");
  if (editProfileLinksRow) editProfileLinksRow.onclick = openLinksModal;

  const closeLinksBtn = document.getElementById("closeLinksBtn");
  if (closeLinksBtn) closeLinksBtn.onclick = closeLinksModal;

  const linksModalOverlay = document.getElementById("linksModalOverlay");
  if (linksModalOverlay) {
    linksModalOverlay.onclick = (e) => {
      if (e.target === linksModalOverlay) closeLinksModal();
    };
  }

  const saveLinksBtn = document.getElementById("saveLinksBtn");
  if (saveLinksBtn) saveLinksBtn.onclick = saveLinks;

  const profileCreatePostBtn = document.getElementById("profileCreatePostBtn");
  if (profileCreatePostBtn) {
    profileCreatePostBtn.onclick = () => {
      openMediaCreationPrompt();
    };
  }

  const shareProfileBtn = document.getElementById("shareProfileBtn");
  if (shareProfileBtn) {
    shareProfileBtn.onclick = () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href).catch(() => {});
      }
      showInstagramToast("Profile link copied to clipboard");
    };
  }

  const profileAddFriendBtn = document.getElementById("profileAddFriendBtn");
  if (profileAddFriendBtn) {
    profileAddFriendBtn.onclick = () => {
      showInstagramToast("Discover people • Suggested accounts");
    };
  }

  const btnQuickSetPhoto = document.getElementById("btnQuickSetPhoto");
  const btnEditPictureOrAvatar = document.getElementById("btnEditPictureOrAvatar");
  const editAvatarPreviewBox = document.getElementById("editAvatarPreviewBox");
  const avatarViewerActionBtn = document.getElementById("avatarViewerActionBtn");
  if (btnQuickSetPhoto) btnQuickSetPhoto.onclick = triggerSetPhoto;
  if (btnEditPictureOrAvatar) btnEditPictureOrAvatar.onclick = triggerSetPhoto;
  if (editAvatarPreviewBox) editAvatarPreviewBox.onclick = triggerSetPhoto;
  if (avatarViewerActionBtn) avatarViewerActionBtn.onclick = triggerSetPhoto;

  const profileAvatarFileInput = document.getElementById("profileAvatarFileInput");
  if (profileAvatarFileInput) {
    profileAvatarFileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          openImageCropModal(ev.target.result);
        };
        reader.readAsDataURL(file);
      }
    };
  }

  const cropModalCancelBtn = document.getElementById("cropModalCancelBtn");
  if (cropModalCancelBtn) cropModalCancelBtn.onclick = closeImageCropModal;

  const cropModalDoneBtn = document.getElementById("cropModalDoneBtn");
  if (cropModalDoneBtn) cropModalDoneBtn.onclick = executeCropAndSave;

  const btnQuickSettings = document.getElementById("btnQuickSettings");
  if (btnQuickSettings) {
    btnQuickSettings.onclick = () => {
      openSettingsModal();
    };
  }

  const openSettingsHeaderBtn = document.getElementById("openSettingsHeaderBtn");
  if (openSettingsHeaderBtn) openSettingsHeaderBtn.onclick = openSettingsModal;

  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  if (closeSettingsBtn) closeSettingsBtn.onclick = closeSettingsModal;

  const settingsOverlay = document.getElementById("settingsOverlay");
  if (settingsOverlay) {
    settingsOverlay.onclick = (e) => {
      if (e.target === settingsOverlay) closeSettingsModal();
    };
  }

  const viewerDownloadBtn = document.getElementById("viewerDownloadBtn");
  const avatarViewerImg = document.getElementById("avatarViewerImg");
  if (viewerDownloadBtn) {
    viewerDownloadBtn.onclick = () => {
      const link = document.createElement("a");
      link.href = avatarViewerImg ? avatarViewerImg.src : "";
      link.download = "profile_avatar.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert("Photo saved to device 📥");
    };
  }

  const viewerShareBtn = document.getElementById("viewerShareBtn");
  const profileDisplayName = document.getElementById("profileDisplayName");
  if (viewerShareBtn) {
    viewerShareBtn.onclick = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${profileDisplayName ? profileDisplayName.textContent : "Profile"} Photo`,
            url: window.location.href
          });
        } catch (_) {}
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert("Profile link copied to clipboard! 🔗");
      }
    };
  }

  initCropGestures();
  initSettingsPanel();
  initMediaCreationAndCamera();
}

// Window bindings for inline HTML onclick attributes
if (typeof window !== "undefined") {
  Object.assign(window, {
    openEditProfileScreen,
    closeEditProfileScreen,
    saveEditProfile,
    openBioEditingScreen,
    closeBioEditingScreen,
    saveBioEditing,
    updateBioCharCount,
    openLinksModal,
    closeLinksModal,
    saveLinks,
    openImageCropModal,
    closeImageCropModal,
    executeCropAndSave,
    triggerSetPhoto,
    openSettingsModal,
    closeSettingsModal,
    applyGlassSettings,
    applyLiquidGlassState,
    openMediaCreationPrompt,
    closeMediaCreationPrompt,
    requestInitialBrowserNotificationPermission,
    openCameraMicrophoneSession,
    closeCameraModal,
    toggleCameraFacing,
    toggleMicMute,
    startRecordingSession,
    stopRecordingSession,
    initModals
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initModals);
  } else {
    initModals();
  }
}

export {
  openEditProfileScreen,
  closeEditProfileScreen,
  saveEditProfile,
  openBioEditingScreen,
  closeBioEditingScreen,
  saveBioEditing,
  updateBioCharCount,
  openLinksModal,
  closeLinksModal,
  saveLinks,
  openImageCropModal,
  closeImageCropModal,
  executeCropAndSave,
  triggerSetPhoto,
  openSettingsModal,
  closeSettingsModal,
  applyGlassSettings,
  applyLiquidGlassState,
  openMediaCreationPrompt,
  closeMediaCreationPrompt,
  requestInitialBrowserNotificationPermission,
  openCameraMicrophoneSession,
  closeCameraModal,
  toggleCameraFacing,
  toggleMicMute,
  startRecordingSession,
  stopRecordingSession
};
