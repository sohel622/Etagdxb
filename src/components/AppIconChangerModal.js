// AppIconChangerModal.js - Flashgram App Icon Customizer Screen
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { pauseAllHomeVideos, setupHomeFeedObserver } from './Feed.js';
import { pauseAllReels } from './ReelsViewer.js';

export const APP_ICONS = [
  {
    id: 'original',
    alias: 'MainActivityDefault',
    name: 'Flashgram Original',
    badge: 'ORIGINAL',
    description: 'Authentic magenta/pink brand logo',
    accentColor: '#E1306C',
    svg: `
      <svg viewBox="0 0 100 100" class="w-full h-full rounded-[24%] shadow-md select-none overflow-hidden">
        <!-- Solid deep magenta/pink rounded square -->
        <rect width="100" height="100" rx="24" fill="#E1306C"/>
        <!-- White notched camera ring glyph -->
        <rect x="23" y="23" width="54" height="54" rx="16" fill="none" stroke="#FFFFFF" stroke-width="6.5"/>
        <circle cx="50" cy="50" r="13" fill="none" stroke="#FFFFFF" stroke-width="6.5"/>
        <circle cx="64.5" cy="35.5" r="3.6" fill="#FFFFFF"/>
      </svg>
    `
  },
  {
    id: 'cyber_neon',
    alias: 'MainActivityNeon',
    name: 'Cyber Neon',
    badge: 'CYBERPUNK',
    description: 'Electric cyan & neon purple glowing edges',
    accentColor: '#00F2FE',
    svg: `
      <svg viewBox="0 0 100 100" class="w-full h-full rounded-[24%] shadow-md select-none overflow-hidden">
        <defs>
          <filter id="cyberGlowCyan" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur1"/>
            <feMerge>
              <feMergeNode in="blur1"/>
              <feMergeNode in="blur1"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="cyberGlowPurple" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur2"/>
            <feMerge>
              <feMergeNode in="blur2"/>
              <feMergeNode in="blur2"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="100" height="100" rx="24" fill="#080812"/>
        <rect width="100" height="100" rx="24" fill="none" stroke="#1D2038" stroke-width="2"/>
        <g filter="url(#cyberGlowCyan)">
          <rect x="23" y="23" width="54" height="54" rx="16" fill="none" stroke="#00F2FE" stroke-width="5"/>
        </g>
        <g filter="url(#cyberGlowPurple)">
          <circle cx="50" cy="50" r="13" fill="none" stroke="#BD00FF" stroke-width="5"/>
        </g>
        <circle cx="64.5" cy="35.5" r="3.6" fill="#FFE600" filter="url(#cyberGlowCyan)"/>
      </svg>
    `
  },
  {
    id: 'sunset',
    alias: 'MainActivityRetro',
    name: 'Sunset Gradient',
    badge: 'SUNSET',
    description: 'Warm golden-orange to violet gradient',
    accentColor: '#FF5E3A',
    svg: `
      <svg viewBox="0 0 100 100" class="w-full h-full rounded-[24%] shadow-md select-none overflow-hidden">
        <defs>
          <linearGradient id="sunsetGradTheme" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FF9500"/>
            <stop offset="45%" stop-color="#FF2D55"/>
            <stop offset="100%" stop-color="#7928CA"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="url(#sunsetGradTheme)"/>
        <rect x="23" y="23" width="54" height="54" rx="16" fill="none" stroke="#FFFFFF" stroke-width="6.5"/>
        <circle cx="50" cy="50" r="13" fill="none" stroke="#FFFFFF" stroke-width="6.5"/>
        <circle cx="64.5" cy="35.5" r="3.6" fill="#FFFFFF"/>
      </svg>
    `
  },
  {
    id: 'dark_matrix',
    alias: 'MainActivityDark',
    name: 'Dark Matrix',
    badge: 'OLED STEALTH',
    description: 'OLED stealth black with glowing white flash accent',
    accentColor: '#FFFFFF',
    svg: `
      <svg viewBox="0 0 100 100" class="w-full h-full rounded-[24%] shadow-md select-none overflow-hidden">
        <defs>
          <filter id="matrixFlashGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="glow"/>
            <feMerge>
              <feMergeNode in="glow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="100" height="100" rx="24" fill="#000000"/>
        <rect x="1" y="1" width="98" height="98" rx="23" fill="none" stroke="#1F1F24" stroke-width="2"/>
        <rect x="23" y="23" width="54" height="54" rx="16" fill="none" stroke="#FFFFFF" stroke-width="6"/>
        <circle cx="50" cy="50" r="13" fill="none" stroke="#FFFFFF" stroke-width="6"/>
        <circle cx="64.5" cy="35.5" r="4" fill="#FFFFFF" filter="url(#matrixFlashGlow)"/>
        <path d="M64.5,29 L64.5,42 M58,35.5 L71,35.5" stroke="#FFFFFF" stroke-width="1.2" opacity="0.8"/>
      </svg>
    `
  },
  {
    id: 'sticker_pop',
    alias: 'MainActivitySketch',
    name: 'Sticker Pop',
    badge: 'POP STICKER',
    description: 'Fun cartoon sticker/doodle outline style',
    accentColor: '#FF2A7A',
    svg: `
      <svg viewBox="0 0 100 100" class="w-full h-full rounded-[24%] shadow-md select-none overflow-hidden">
        <defs>
          <linearGradient id="popStickerBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFF0F5"/>
            <stop offset="100%" stop-color="#FFE4EC"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="url(#popStickerBg)"/>
        <rect x="18" y="18" width="64" height="64" rx="19" fill="#FFFFFF" stroke="#FCE7F3" stroke-width="2"/>
        <rect x="24" y="24" width="52" height="52" rx="15" fill="#FFF5F8" stroke="#FF2A7A" stroke-width="5.5" stroke-linecap="round"/>
        <circle cx="50" cy="50" r="12.5" fill="none" stroke="#FFB703" stroke-width="5.5"/>
        <circle cx="50" cy="50" r="5" fill="#FF2A7A"/>
        <circle cx="64" cy="36" r="3.5" fill="#3A86FF"/>
        <path d="M33,32 L34.5,35 L37.5,35.5 L35,38 L36,41 L33,39.5 L30,41 L31,38 L28.5,35.5 L31.5,35 Z" fill="#FFD166"/>
        <circle cx="70" cy="65" r="2.5" fill="#06D6A0"/>
      </svg>
    `
  },
  {
    id: 'golden_vip',
    alias: 'MainActivityGold',
    name: 'Golden VIP',
    badge: 'VIP LUXE',
    description: 'Luxurious metallic gold brushed finish',
    accentColor: '#D4AF37',
    svg: `
      <svg viewBox="0 0 100 100" class="w-full h-full rounded-[24%] shadow-md select-none overflow-hidden">
        <defs>
          <linearGradient id="goldVipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#9A7B38"/>
            <stop offset="25%" stop-color="#FCF6BA"/>
            <stop offset="50%" stop-color="#B38728"/>
            <stop offset="75%" stop-color="#FBF5B7"/>
            <stop offset="100%" stop-color="#8B5E14"/>
          </linearGradient>
          <linearGradient id="goldInnerGlint" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF"/>
            <stop offset="100%" stop-color="#FFF3C4"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="url(#goldVipGrad)"/>
        <rect x="23" y="23" width="54" height="54" rx="16" fill="none" stroke="url(#goldInnerGlint)" stroke-width="6.5"/>
        <circle cx="50" cy="50" r="13" fill="none" stroke="url(#goldInnerGlint)" stroke-width="6.5"/>
        <circle cx="64.5" cy="35.5" r="3.6" fill="#FFFFFF"/>
        <path d="M50,13 L52,19 L58,21 L52,23 L50,29 L48,23 L42,21 L48,19 Z" fill="#FFFFFF" opacity="0.95"/>
      </svg>
    `
  }
];

let isAppIconModalOpen = false;
let previousRouteBeforeIconModal = '/';

/**
 * Trigger vibration / haptic feedback
 */
export async function triggerHaptic(style = ImpactStyle.Medium) {
  try {
    await Haptics.impact({ style });
  } catch (_) {
    if (navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(style === ImpactStyle.Medium ? 40 : 25);
    }
  }
}

/**
 * Get the currently active app icon ID
 */
export function getActiveAppIconId() {
  try {
    const saved = localStorage.getItem('activeAppIcon');
    if (!saved) return 'original';
    if (saved === 'default') return 'original';
    if (saved === 'neon') return 'cyber_neon';
    if (saved === 'retro') return 'sunset';
    if (saved === 'dark') return 'dark_matrix';
    if (saved === 'sketch') return 'sticker_pop';
    if (saved === 'gold') return 'golden_vip';
    return saved;
  } catch (_) {
    return 'original';
  }
}

/**
 * Get custom app icon data URL from storage
 */
export function getCustomAppIconData() {
  try {
    return localStorage.getItem('customAppIcon') || null;
  } catch (_) {
    return null;
  }
}

/**
 * Dynamically switch the web tab favicon to match the selected icon
 */
export function updateWebFavicon(iconId) {
  try {
    let faviconLink = document.getElementById('dynamicAppFavicon');
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.id = 'dynamicAppFavicon';
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }

    if (iconId === 'custom') {
      const customImg = getCustomAppIconData();
      if (customImg) {
        faviconLink.href = customImg;
        return;
      }
    }

    const icon = APP_ICONS.find(i => i.id === iconId) || APP_ICONS[0];
    if (icon && icon.svg) {
      const svgBlob = new Blob([icon.svg.trim()], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      faviconLink.href = url;
    }
  } catch (e) {
    console.warn('Could not update favicon:', e);
  }
}

/**
 * Bridge call to Android native Activity-Alias switching
 */
export function setNativeAppIcon(iconId) {
  try {
    if (window.NativeAppIconBridge && typeof window.NativeAppIconBridge.changeAppIcon === 'function') {
      window.NativeAppIconBridge.changeAppIcon(iconId);
      console.log(`[AppIconBridge] Switched native launcher alias to: ${iconId}`);
    }
  } catch (err) {
    console.warn('[AppIconBridge] Native bridge error:', err);
  }
}

/**
 * Displays smooth celebration toast
 */
export function showIconCelebrationToast(iconName = '') {
  const oldToast = document.getElementById('iconCelebrationToast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.id = 'iconCelebrationToast';
  toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 z-[170] flex items-center gap-3 px-4 py-3 bg-neutral-900/95 dark:bg-neutral-100/95 text-white dark:text-neutral-900 rounded-2xl shadow-2xl backdrop-blur-md border border-white/10 dark:border-black/10 pointer-events-none select-none transition-all duration-300';
  toast.innerHTML = `
    <div class="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 dark:text-sky-600 flex items-center justify-center shrink-0">
      <i class="fa-solid fa-sparkles text-sm"></i>
    </div>
    <div class="text-[13px] font-semibold tracking-tight">
      App icon updated successfully! ${iconName ? `<span class="text-sky-400 dark:text-sky-600 font-bold">(${iconName})</span>` : ''}
    </div>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, 12px)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

/**
 * Open the interactive square & circular crop preview modal
 */
export function openCropPreviewModal(imageSource) {
  const existingModal = document.getElementById('customIconCropModal');
  if (existingModal) existingModal.remove();

  const cropModal = document.createElement('div');
  cropModal.id = 'customIconCropModal';
  cropModal.className = 'fixed inset-0 z-[160] bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 select-none overflow-hidden';
  cropModal.innerHTML = `
    <!-- Top Bar -->
    <div class="w-full max-w-md mx-auto flex items-center justify-between pt-2 pb-3 border-b border-white/10 shrink-0">
      <button type="button" id="cropCancelBtn" class="text-neutral-400 hover:text-white active:scale-95 text-sm font-semibold px-2.5 py-1.5 transition-colors">
        Cancel
      </button>
      <div class="text-center">
        <h2 class="text-white text-[15px] font-bold tracking-tight">Crop App Icon</h2>
        <p class="text-neutral-400 text-[11px]">Position your image within the icon frame</p>
      </div>
      <button type="button" id="cropApplyBtn" class="bg-sky-500 hover:bg-sky-400 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-sky-500/30 transition-all flex items-center gap-1.5">
        <i class="fa-solid fa-check text-xs"></i>
        <span>Apply</span>
      </button>
    </div>

    <!-- Interactive Crop Viewport -->
    <div class="flex-1 flex flex-col items-center justify-center my-3 relative min-h-0">
      <div id="cropViewport" class="w-[260px] h-[260px] relative rounded-[24%] overflow-hidden shadow-2xl border-2 border-white/30 bg-neutral-900 select-none touch-none cursor-grab active:cursor-grabbing">
        <!-- User Image -->
        <img id="cropTargetImg" src="${imageSource}" alt="Crop Preview" class="absolute pointer-events-none origin-center max-w-none transition-none" />
        
        <!-- Center icon guidelines overlay -->
        <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
          <!-- Circular crop preview guide -->
          <div class="w-[220px] h-[220px] rounded-full border border-dashed border-white/40"></div>
          <!-- Center crosshair -->
          <div class="absolute w-3 h-0.5 bg-white/40"></div>
          <div class="absolute w-0.5 h-3 bg-white/40"></div>
        </div>
      </div>

      <!-- Drag & Zoom Hint -->
      <div class="mt-3 text-[11.5px] text-neutral-400 flex items-center gap-2">
        <i class="fa-solid fa-arrows-up-down-left-right text-xs"></i>
        <span>Drag to pan &bull; Use slider to zoom</span>
      </div>

      <!-- Zoom Range Control -->
      <div class="w-full max-w-[280px] mt-3.5 flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
        <i class="fa-solid fa-magnifying-glass-minus text-neutral-400 text-xs"></i>
        <input type="range" id="cropZoomSlider" min="1" max="3" step="0.02" value="1" class="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-sky-500" />
        <i class="fa-solid fa-magnifying-glass-plus text-neutral-400 text-xs"></i>
        <button type="button" id="cropResetBtn" class="text-[10.5px] text-sky-400 hover:text-sky-300 font-semibold uppercase tracking-wider pl-1.5 shrink-0" title="Center image">
          Center
        </button>
      </div>

      <!-- Live Previews Row -->
      <div class="mt-4 flex items-center gap-6">
        <div class="flex flex-col items-center gap-1.5">
          <div id="previewSquircle" class="w-12 h-12 rounded-[24%] overflow-hidden shadow-md ring-2 ring-white/20 bg-neutral-800 relative">
            <img id="miniPreviewSquircleImg" src="${imageSource}" class="w-full h-full object-cover" />
          </div>
          <span class="text-[10px] text-neutral-400 font-medium">Squircle</span>
        </div>
        <div class="flex flex-col items-center gap-1.5">
          <div id="previewCircle" class="w-12 h-12 rounded-full overflow-hidden shadow-md ring-2 ring-white/20 bg-neutral-800 relative">
            <img id="miniPreviewCircleImg" src="${imageSource}" class="w-full h-full object-cover" />
          </div>
          <span class="text-[10px] text-neutral-400 font-medium">Circle</span>
        </div>
      </div>
    </div>

    <!-- Bottom note -->
    <div class="text-center pb-2 text-[11px] text-neutral-500 shrink-0">
      Custom icons are cropped into a high-resolution launcher asset.
    </div>
  `;

  document.body.appendChild(cropModal);

  const targetImg = cropModal.querySelector('#cropTargetImg');
  const miniSquircle = cropModal.querySelector('#miniPreviewSquircleImg');
  const miniCircle = cropModal.querySelector('#miniPreviewCircleImg');
  const viewport = cropModal.querySelector('#cropViewport');
  const zoomSlider = cropModal.querySelector('#cropZoomSlider');
  const resetBtn = cropModal.querySelector('#cropResetBtn');
  const cancelBtn = cropModal.querySelector('#cropCancelBtn');
  const applyBtn = cropModal.querySelector('#cropApplyBtn');

  let scale = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let naturalW = 260;
  let naturalH = 260;

  const updateTransform = () => {
    // Base fit
    const baseScale = Math.max(260 / naturalW, 260 / naturalH);
    const currentScale = baseScale * scale;
    const renderedW = naturalW * currentScale;
    const renderedH = naturalH * currentScale;

    // Constrain pan within reasonable boundaries
    const maxPanX = Math.max(0, (renderedW - 260) / 2);
    const maxPanY = Math.max(0, (renderedH - 260) / 2);
    panX = Math.max(-maxPanX - 40, Math.min(maxPanX + 40, panX));
    panY = Math.max(-maxPanY - 40, Math.min(maxPanY + 40, panY));

    const left = (260 - renderedW) / 2 + panX;
    const top = (260 - renderedH) / 2 + panY;

    targetImg.style.width = `${renderedW}px`;
    targetImg.style.height = `${renderedH}px`;
    targetImg.style.left = `${left}px`;
    targetImg.style.top = `${top}px`;

    // Update mini previews
    if (miniSquircle) {
      miniSquircle.style.width = `${renderedW * (48 / 260)}px`;
      miniSquircle.style.height = `${renderedH * (48 / 260)}px`;
      miniSquircle.style.position = 'absolute';
      miniSquircle.style.left = `${left * (48 / 260)}px`;
      miniSquircle.style.top = `${top * (48 / 260)}px`;
    }
    if (miniCircle) {
      miniCircle.style.width = `${renderedW * (48 / 260)}px`;
      miniCircle.style.height = `${renderedH * (48 / 260)}px`;
      miniCircle.style.position = 'absolute';
      miniCircle.style.left = `${left * (48 / 260)}px`;
      miniCircle.style.top = `${top * (48 / 260)}px`;
    }
  };

  targetImg.onload = () => {
    naturalW = targetImg.naturalWidth || 260;
    naturalH = targetImg.naturalHeight || 260;
    updateTransform();
  };

  // Pointer drag handling for both desktop mouse and mobile touch
  viewport.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransform();
  });

  const stopDrag = (e) => {
    if (isDragging) {
      isDragging = false;
      try { viewport.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  };

  viewport.addEventListener('pointerup', stopDrag);
  viewport.addEventListener('pointercancel', stopDrag);

  // Zoom control
  zoomSlider.addEventListener('input', (e) => {
    scale = parseFloat(e.target.value) || 1;
    updateTransform();
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    scale = 1;
    panX = 0;
    panY = 0;
    zoomSlider.value = 1;
    updateTransform();
  });

  // Cancel
  cancelBtn.addEventListener('click', () => {
    cropModal.remove();
  });

  // Apply Cropped Image
  applyBtn.addEventListener('click', () => {
    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 512;
      exportCanvas.height = 512;
      const ctx = exportCanvas.getContext('2d');

      const baseScale = Math.max(260 / naturalW, 260 / naturalH);
      const currentScale = baseScale * scale;
      const renderedW = naturalW * currentScale;
      const renderedH = naturalH * currentScale;
      const left = (260 - renderedW) / 2 + panX;
      const top = (260 - renderedH) / 2 + panY;

      // Scale up factor to 512
      const factor = 512 / 260;
      ctx.drawImage(
        targetImg,
        left * factor,
        top * factor,
        renderedW * factor,
        renderedH * factor
      );

      const croppedDataUrl = exportCanvas.toDataURL('image/png', 0.95);

      // Persist custom icon
      localStorage.setItem('customAppIcon', croppedDataUrl);
      localStorage.setItem('activeAppIcon', 'custom');

      // Bridge calls
      setNativeAppIcon('custom');
      updateWebFavicon('custom');
      triggerHaptic(ImpactStyle.Light);

      cropModal.remove();

      // Refresh Grid & Toast
      renderIconGrid();
      showIconCelebrationToast('Custom Icon');
    } catch (err) {
      console.error('Failed to crop icon:', err);
      cropModal.remove();
    }
  });
}

/**
 * Trigger file upload picker for custom icon
 */
export function triggerCustomIconUpload() {
  let fileInput = document.getElementById('customIconFileInput');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'customIconFileInput';
    fileInput.accept = 'image/*';
    fileInput.className = 'hidden';
    document.body.appendChild(fileInput);
  }

  fileInput.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      openCropPreviewModal(loadEvt.target.result);
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  };

  fileInput.click();
}

/**
 * Build the modal DOM element
 */
function createOrGetModalDOM() {
  let modal = document.getElementById('appIconChangerModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'appIconChangerModal';
  modal.className = 'fixed inset-0 z-[130] bg-white dark:bg-black text-neutral-900 dark:text-white flex flex-col hidden select-none overflow-hidden';
  modal.innerHTML = `
    <!-- Header -->
    <header class="h-14 px-4 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 bg-white/95 dark:bg-black/95 backdrop-blur-md sticky top-0 z-10 shrink-0">
      <div class="flex items-center gap-3 min-w-0">
        <button type="button" id="appIconChangerBackBtn" class="w-9 h-9 rounded-full flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-transform" aria-label="Back">
          <i class="fa-solid fa-arrow-left text-[17px]"></i>
        </button>
        <div class="min-w-0">
          <h1 class="text-[16px] font-bold text-neutral-900 dark:text-white tracking-tight truncate">
            Change Your App Icon
          </h1>
          <p class="text-[11.5px] text-neutral-500 dark:text-neutral-400 truncate">Select a Flashgram style or upload from gallery</p>
        </div>
      </div>
      <button type="button" id="appIconChangerCloseBtn" class="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 active:scale-95 transition-transform">
        <i class="fa-solid fa-xmark text-[16px]"></i>
      </button>
    </header>

    <!-- Content / Grid -->
    <div class="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-16">
      <div class="max-w-md mx-auto space-y-4">
        <!-- 2-Column Grid -->
        <div id="appIconCardsGrid" class="grid grid-cols-2 gap-3.5 pt-1">
          <!-- Dynamically populated -->
        </div>

        <!-- Help note at bottom -->
        <div class="text-center pt-3 pb-6 text-[11.5px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
          Active icon updates dynamically across your web browser tab and Android launcher screen via Activity-Alias.
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Wire back/close buttons
  const backBtn = modal.querySelector('#appIconChangerBackBtn');
  const closeBtn = modal.querySelector('#appIconChangerCloseBtn');
  if (backBtn) backBtn.onclick = () => closeAppIconChanger();
  if (closeBtn) closeBtn.onclick = () => closeAppIconChanger();

  return modal;
}

/**
 * Render all 6 icon cards + prominent Custom Icon card with active selection states
 */
function renderIconGrid() {
  const modal = createOrGetModalDOM();
  const grid = modal.querySelector('#appIconCardsGrid');
  if (!grid) return;

  const currentIconId = getActiveAppIconId();
  const customIconData = getCustomAppIconData();
  const isCustomSelected = currentIconId === 'custom';

  // 1. Preset Flashgram Theme Cards
  const presetCardsHTML = APP_ICONS.map(icon => {
    const isSelected = icon.id === currentIconId;
    return `
      <div 
        class="icon-card relative flex flex-col items-center p-3.5 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.97] border ${
          isSelected 
            ? 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-500 ring-2 ring-sky-500/40 shadow-md shadow-sky-500/10' 
            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
        }"
        data-icon-id="${icon.id}"
        onclick="window.selectAppIcon && window.selectAppIcon('${icon.id}')"
      >
        <!-- Top selection check badge -->
        ${
          isSelected
            ? `<div class="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs shadow-md ring-2 ring-white dark:ring-black">
                <i class="fa-solid fa-check"></i>
               </div>`
            : ''
        }

        <!-- Icon Container -->
        <div class="w-20 h-20 relative my-1 transition-transform duration-200 ${isSelected ? 'scale-105' : 'hover:scale-102'}">
          ${icon.svg}
        </div>

        <!-- Badge -->
        <div class="mt-2.5 mb-1">
          <span class="text-[9.5px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full ${
            isSelected 
              ? 'bg-sky-500 text-white' 
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }">
            ${icon.badge}
          </span>
        </div>

        <!-- Title & description -->
        <div class="text-[13px] font-bold text-neutral-900 dark:text-white text-center leading-snug truncate w-full">
          ${icon.name}
        </div>
        <div class="text-[10.5px] text-neutral-500 dark:text-neutral-400 text-center line-clamp-2 mt-0.5 leading-tight">
          ${icon.description}
        </div>

        <!-- Pill Status -->
        <div class="mt-3 w-full">
          <div class="w-full py-1 text-center text-[11px] font-semibold rounded-lg transition-colors ${
            isSelected 
              ? 'bg-sky-500 text-white shadow-sm' 
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
          }">
            ${isSelected ? 'Active Icon' : 'Select'}
          </div>
        </div>
      </div>
    `;
  });

  // 2. Prominent Gallery Custom Icon Card
  const customCardHTML = `
    <div 
      class="icon-card relative flex flex-col items-center p-3.5 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.97] border ${
        isCustomSelected
          ? 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-500 ring-2 ring-sky-500/40 shadow-md shadow-sky-500/10'
          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
      }"
      data-icon-id="custom"
      onclick="${
        customIconData
          ? `window.selectAppIcon && window.selectAppIcon('custom')`
          : `window.triggerCustomIconUpload && window.triggerCustomIconUpload()`
      }"
    >
      <!-- Top selection check badge -->
      ${
        isCustomSelected
          ? `<div class="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs shadow-md ring-2 ring-white dark:ring-black">
              <i class="fa-solid fa-check"></i>
             </div>`
          : ''
      }

      <!-- Icon Container / Custom Preview or Upload Plus -->
      <div class="w-20 h-20 relative my-1 transition-transform duration-200 ${isCustomSelected ? 'scale-105' : 'hover:scale-102'}">
        ${
          customIconData
            ? `
              <img src="${customIconData}" alt="Custom Icon" class="w-full h-full rounded-[24%] object-cover shadow-md select-none ring-1 ring-black/10 dark:ring-white/10" />
              <!-- Change photo button overlay -->
              <button 
                type="button" 
                onclick="event.stopPropagation(); window.triggerCustomIconUpload && window.triggerCustomIconUpload();"
                class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-neutral-900/90 text-white flex items-center justify-center text-[10px] shadow-md border border-white/20 hover:bg-black active:scale-95 transition-transform"
                title="Upload another photo"
              >
                <i class="fa-solid fa-camera"></i>
              </button>
            `
            : `
              <div 
                onclick="window.triggerCustomIconUpload && window.triggerCustomIconUpload()"
                class="w-full h-full rounded-[24%] border-2 border-dashed border-sky-400 dark:border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 flex flex-col items-center justify-center text-sky-500 shadow-inner group-hover:border-sky-500"
              >
                <i class="fa-solid fa-plus text-2xl group-hover:scale-110 transition-transform"></i>
                <span class="text-[9px] font-extrabold tracking-tight mt-1">UPLOAD</span>
              </div>
            `
        }
      </div>

      <!-- Badge -->
      <div class="mt-2.5 mb-1">
        <span class="text-[9.5px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full ${
          isCustomSelected 
            ? 'bg-sky-500 text-white' 
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
        }">
          ${customIconData ? 'CUSTOM' : 'GALLERY'}
        </span>
      </div>

      <!-- Title & description -->
      <div class="text-[13px] font-bold text-neutral-900 dark:text-white text-center leading-snug truncate w-full">
        Custom Icon
      </div>
      <div class="text-[10.5px] text-neutral-500 dark:text-neutral-400 text-center line-clamp-2 mt-0.5 leading-tight">
        Upload from Gallery
      </div>

      <!-- Pill Status -->
      <div class="mt-3 w-full">
        <button 
          type="button"
          onclick="${
            customIconData
              ? `event.stopPropagation(); window.selectAppIcon && window.selectAppIcon('custom');`
              : `event.stopPropagation(); window.triggerCustomIconUpload && window.triggerCustomIconUpload();`
          }"
          class="w-full py-1 text-center text-[11px] font-semibold rounded-lg transition-colors ${
            isCustomSelected 
              ? 'bg-sky-500 text-white shadow-sm' 
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
          }"
        >
          ${
            isCustomSelected 
              ? 'Active Icon' 
              : customIconData 
                ? 'Select' 
                : 'Upload +'
          }
        </button>
      </div>
    </div>
  `;

  // Combine: Flashgram Original first, Custom Icon card second, followed by other themes
  const combinedCards = [
    presetCardsHTML[0], // Flashgram Original
    customCardHTML,     // Custom Icon Card
    ...presetCardsHTML.slice(1) // Cyber Neon, Sunset Gradient, Dark Matrix, Sticker Pop, Golden VIP
  ];

  grid.innerHTML = combinedCards.join('');
}

/**
 * Handle user tapping an icon
 */
export async function selectAppIcon(iconId) {
  // If custom icon
  if (iconId === 'custom') {
    const customData = getCustomAppIconData();
    if (!customData) {
      triggerCustomIconUpload();
      return;
    }

    await triggerHaptic(ImpactStyle.Light);
    localStorage.setItem('activeAppIcon', 'custom');
    setNativeAppIcon('custom');
    updateWebFavicon('custom');
    renderIconGrid();
    showIconCelebrationToast('Custom Icon');
    return;
  }

  const icon = APP_ICONS.find(i => i.id === iconId);
  if (!icon) return;

  // 1. Light haptic feedback
  await triggerHaptic(ImpactStyle.Light);

  // 2. Persist in localStorage
  localStorage.setItem('activeAppIcon', icon.id);

  // 3. Native Activity-Alias invocation
  setNativeAppIcon(icon.id);

  // 4. Update Web Favicon
  updateWebFavicon(icon.id);

  // 5. Re-render Grid with selected state
  renderIconGrid();

  // 6. Show pleasant celebration toast
  showIconCelebrationToast(icon.name);
}

/**
 * Open the full-screen App Icon Changer screen
 */
export async function openAppIconChanger() {
  if (isAppIconModalOpen) return;
  isAppIconModalOpen = true;

  // 1. Audio safety: Pause feed videos & audio immediately
  try {
    if (typeof pauseAllHomeVideos === 'function') pauseAllHomeVideos();
    if (typeof pauseAllReels === 'function') pauseAllReels();
    document.querySelectorAll('video, audio').forEach(el => {
      try { el.pause(); } catch (_) {}
    });
  } catch (_) {}

  // 2. Medium haptic vibration
  await triggerHaptic(ImpactStyle.Medium);

  // 3. Render and show modal
  const modal = createOrGetModalDOM();
  renderIconGrid();

  modal.classList.remove('hidden');
  modal.style.display = 'flex';

  // 4. Update route to /change-app-icon
  previousRouteBeforeIconModal = window.location.pathname || '/';
  try {
    if (window.location.pathname !== '/change-app-icon') {
      window.history.pushState({ appIconChanger: true, from: previousRouteBeforeIconModal }, '', '/change-app-icon');
    }
  } catch (_) {}
}

/**
 * Close the App Icon Changer screen and restore home view
 */
export function closeAppIconChanger() {
  if (!isAppIconModalOpen) return;
  isAppIconModalOpen = false;

  const modal = document.getElementById('appIconChangerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }

  // Restore route if it was pushed
  try {
    if (window.location.pathname === '/change-app-icon') {
      window.history.replaceState({}, '', previousRouteBeforeIconModal || '/');
    }
  } catch (_) {}

  // Restore home feed observer cleanly
  try {
    if (typeof setupHomeFeedObserver === 'function') {
      setupHomeFeedObserver();
    }
  } catch (_) {}
}

/**
 * Set up long-press listener on Header Logo
 */
export function setupHeaderLogoEasterEgg() {
  const logoElements = document.querySelectorAll('#topNavLogo, .top-bar .logo');
  if (!logoElements || logoElements.length === 0) return;

  logoElements.forEach(logo => {
    let pressTimer = null;
    let startX = 0;
    let startY = 0;
    let didLongPress = false;

    const startTimer = (e) => {
      didLongPress = false;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;

      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        didLongPress = true;
        openAppIconChanger();
      }, 700); // 700ms long-press threshold
    };

    const cancelTimer = () => {
      clearTimeout(pressTimer);
      pressTimer = null;
    };

    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      if (Math.hypot(clientX - startX, clientY - startY) > 12) {
        cancelTimer();
      }
    };

    // Touch events
    logo.addEventListener('touchstart', startTimer, { passive: true });
    logo.addEventListener('touchend', cancelTimer, { passive: true });
    logo.addEventListener('touchcancel', cancelTimer, { passive: true });
    logo.addEventListener('touchmove', onMove, { passive: true });

    // Mouse events
    logo.addEventListener('mousedown', startTimer);
    logo.addEventListener('mouseup', cancelTimer);
    logo.addEventListener('mouseleave', cancelTimer);

    // Context menu (Right-click or mobile long-press native trigger)
    logo.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      didLongPress = true;
      cancelTimer();
      openAppIconChanger();
    });

    // Wrap click to avoid trigger when long-press occurred
    const originalOnClick = logo.onclick;
    logo.onclick = (e) => {
      if (didLongPress) {
        e.preventDefault();
        e.stopImmediatePropagation();
        didLongPress = false;
        return;
      }
      if (typeof originalOnClick === 'function') {
        originalOnClick.call(logo, e);
      }
    };
  });
}

// Global exposure for window / inline usage
if (typeof window !== 'undefined') {
  window.openAppIconChanger = openAppIconChanger;
  window.__realOpenAppIconChanger = openAppIconChanger;
  window.closeAppIconChanger = closeAppIconChanger;
  window.selectAppIcon = selectAppIcon;
  window.triggerCustomIconUpload = triggerCustomIconUpload;
  window.openCropPreviewModal = openCropPreviewModal;
  window.setupHeaderLogoEasterEgg = setupHeaderLogoEasterEgg;

  // Initialize saved favicon on load
  const savedIcon = getActiveAppIconId();
  if (savedIcon) {
    updateWebFavicon(savedIcon);
  }
}
