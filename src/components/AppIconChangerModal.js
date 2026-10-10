// AppIconChangerModal.js - Secret Easter Egg App Icon Changer Screen
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { pauseAllHomeVideos, setupHomeFeedObserver } from './Feed.js';
import { pauseAllReels } from './ReelsViewer.js';

export const APP_ICONS = [
  {
    id: 'default',
    alias: 'MainActivityDefault',
    name: 'Default Flashgram',
    badge: 'ORIGINAL',
    description: 'Current pink-orange gradient logo',
    accentColor: '#E1306C',
    svg: `
      <svg viewBox="0 0 100 100" class="w-full h-full rounded-[24%] shadow-md select-none overflow-hidden">
        <defs>
          <linearGradient id="iconGradDefault" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#f09433"/>
            <stop offset="25%" stop-color="#e6683c"/>
            <stop offset="50%" stop-color="#dc2743"/>
            <stop offset="75%" stop-color="#cc2366"/>
            <stop offset="100%" stop-color="#bc1888"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="url(#iconGradDefault)"/>
        <!-- Instagram glyph -->
        <rect x="23" y="23" width="54" height="54" rx="16" fill="none" stroke="#ffffff" stroke-width="6.5"/>
        <circle cx="50" cy="50" r="13" fill="none" stroke="#ffffff" stroke-width="6.5"/>
        <circle cx="64.5" cy="35.5" r="3.5" fill="#ffffff"/>
      </svg>
    `
  },
  {
    id: 'retro',
    alias: 'MainActivityRetro',
    name: 'Retro Throwback',
    badge: '2010 CLASSIC',
    description: 'Classic vintage camera aesthetic',
    accentColor: '#8C5A32',
    svg: `
      <svg viewBox="0 0 100 100" class="w-full h-full rounded-[24%] shadow-md select-none overflow-hidden">
        <defs>
          <linearGradient id="retroLeather" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#9C6638"/>
            <stop offset="100%" stop-color="#6F421D"/>
          </linearGradient>
          <linearGradient id="retroLens" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4a4a4a"/>
            <stop offset="50%" stop-color="#1a1a1a"/>
            <stop offset="100%" stop-color="#0a0a0a"/>
          </linearGradient>
        </defs>
        <!-- Cream Top -->
        <rect width="100" height="100" rx="24" fill="#F4EADB"/>
        <!-- Rainbow stripes in top-right -->
        <rect x="62" y="0" width="7" height="38" fill="#3897f0"/>
        <rect x="69" y="0" width="7" height="38" fill="#70c05a"/>
        <rect x="76" y="0" width="7" height="38" fill="#fdcb38"/>
        <rect x="83" y="0" width="7" height="38" fill="#ed4956"/>
        <!-- Leather bottom -->
        <path d="M0,38 H100 V76 C100,89.25 89.25,100 76,100 H24 C10.75,100 0,89.25 0,76 Z" fill="url(#retroLeather)"/>
        <!-- Viewfinder -->
        <rect x="18" y="14" width="16" height="14" rx="3.5" fill="#2b2b2b" stroke="#777" stroke-width="1.5"/>
        <circle cx="26" cy="21" r="3.5" fill="#4fe0b6"/>
        <!-- Lens ring & glass -->
        <circle cx="50" cy="58" r="23" fill="#D8D8D8" stroke="#A0A0A0" stroke-width="2"/>
        <circle cx="50" cy="58" r="19" fill="url(#retroLens)"/>
        <circle cx="50" cy="58" r="12" fill="#111" stroke="#3897f0" stroke-width="1.5"/>
        <circle cx="46" cy="54" r="3" fill="#ffffff" opacity="0.6"/>
      </svg>
    `
  },
  {
    id: 'sketch',
    alias: 'MainActivitySketch',
    name: 'Sketch',
    badge: 'HAND-DRAWN',
    description: 'Minimal hand-drawn doodle outline style',
    accentColor: '#1F2937',
    svg: `
      <svg viewBox="0 0 100 100" class="w-full h-full rounded-[24%] shadow-md select-none overflow-hidden">
        <defs>
          <radialGradient id="sketchPaper" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#FFFFFF"/>
            <stop offset="100%" stop-color="#F3F4F6"/>
          </radialGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="url(#sketchPaper)" stroke="#E5E7EB" stroke-width="2"/>
        <!-- Sketchy hand-drawn camera box -->
        <rect x="23" y="23" width="54" height="54" rx="16" fill="none" stroke="#1F2937" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 1"/>
        <circle cx="50" cy="50" r="13" fill="none" stroke="#1F2937" stroke-width="5" stroke-linecap="round"/>
        <!-- Hand-drawn hatch mark accents -->
        <circle cx="64" cy="36" r="3.5" fill="#1F2937"/>
        <path d="M72,20 L76,16 M77,23 L83,21 M71,27 L78,30" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>
        <path d="M28,70 L34,76 M22,68 L27,73" stroke="#D1D5DB" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `
  },
  {
    id: 'neon',
    alias: 'MainActivityNeon',
    name: 'Ultragram Neon',
    badge: 'CYBERPUNK',
    description: 'Cyberpunk holographic glow',
    accentColor: '#00F2FE',
    svg: `
      <svg viewBox="0 0 100 100" class="w-full h-full rounded-[24%] shadow-md select-none overflow-hidden">
        <defs>
          <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <!-- Dark Obsidian Background -->
        <rect width="100" height="100" rx="24" fill="#080811"/>
        <rect width="100" height="100" rx="24" fill="none" stroke="#1E1E38" stroke-width="2"/>
        <!-- Glowing Cyan & Magenta Silhouette -->
        <g filter="url(#neonGlow)">
          <rect x="23" y="23" width="54" height="54" rx="16" fill="none" stroke="#00F2FE" stroke-width="5"/>
          <circle cx="50" cy="50" r="13" fill="none" stroke="#FF007F" stroke-width="5"/>
          <circle cx="64.5" cy="35.5" r="3.5" fill="#FFE600"/>
        </g>
      </svg>
    `
  },
  {
    id: 'dark',
    alias: 'MainActivityDark',
    name: 'Midnight Dark',
    badge: 'OLED BLACK',
    description: 'Pitch black & clean white minimal icon',
    accentColor: '#FFFFFF',
    svg: `
      <svg viewBox="0 0 100 100" class="w-full h-full rounded-[24%] shadow-md select-none overflow-hidden">
        <rect width="100" height="100" rx="24" fill="#050505"/>
        <rect x="1" y="1" width="98" height="98" rx="23" fill="none" stroke="#262626" stroke-width="2"/>
        <!-- Minimal Crisp White Glyph -->
        <rect x="23" y="23" width="54" height="54" rx="16" fill="none" stroke="#FFFFFF" stroke-width="6"/>
        <circle cx="50" cy="50" r="13" fill="none" stroke="#FFFFFF" stroke-width="6"/>
        <circle cx="64.5" cy="35.5" r="3.5" fill="#FFFFFF"/>
      </svg>
    `
  },
  {
    id: 'gold',
    alias: 'MainActivityGold',
    name: 'Golden Luxe',
    badge: 'VIP LUXE',
    description: 'Luxury metallic gold finish',
    accentColor: '#D4AF37',
    svg: `
      <svg viewBox="0 0 100 100" class="w-full h-full rounded-[24%] shadow-md select-none overflow-hidden">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#BF953F"/>
            <stop offset="25%" stop-color="#FCF6BA"/>
            <stop offset="50%" stop-color="#B38728"/>
            <stop offset="75%" stop-color="#FBF5B7"/>
            <stop offset="100%" stop-color="#AA771C"/>
          </linearGradient>
          <linearGradient id="goldInner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF"/>
            <stop offset="100%" stop-color="#FFF3C4"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="url(#goldGrad)"/>
        <!-- Gold Luxury Camera -->
        <rect x="23" y="23" width="54" height="54" rx="16" fill="none" stroke="url(#goldInner)" stroke-width="6.5"/>
        <circle cx="50" cy="50" r="13" fill="none" stroke="url(#goldInner)" stroke-width="6.5"/>
        <circle cx="64.5" cy="35.5" r="3.5" fill="#FFFFFF"/>
        <!-- Shimmer Star -->
        <path d="M50,14 L52,19 L57,21 L52,23 L50,28 L48,23 L43,21 L48,19 Z" fill="#FFFFFF" opacity="0.9"/>
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
    return localStorage.getItem('activeAppIcon') || 'default';
  } catch (_) {
    return 'default';
  }
}

/**
 * Dynamically switch the web tab favicon to match the selected icon
 */
export function updateWebFavicon(iconId) {
  const icon = APP_ICONS.find(i => i.id === iconId) || APP_ICONS[0];
  try {
    let faviconLink = document.getElementById('dynamicAppFavicon');
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.id = 'dynamicAppFavicon';
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }
    const svgBlob = new Blob([icon.svg.trim()], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    faviconLink.href = url;
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
 * Displays an Instagram-style celebration toast
 */
export function showIconCelebrationToast(iconName) {
  // Remove existing toast if any
  const oldToast = document.getElementById('iconCelebrationToast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.id = 'iconCelebrationToast';
  toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 z-[140] flex items-center gap-3 px-4 py-3 bg-neutral-900/95 dark:bg-neutral-100/95 text-white dark:text-neutral-900 rounded-2xl shadow-2xl backdrop-blur-md border border-white/10 dark:border-black/10 animate-bounce-subtle pointer-events-none select-none transition-all duration-300';
  toast.innerHTML = `
    <div class="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 dark:text-sky-600 flex items-center justify-center shrink-0">
      <i class="fa-solid fa-sparkles text-sm"></i>
    </div>
    <div class="text-[13px] font-semibold tracking-tight">
      App icon updated to <span class="text-sky-400 dark:text-sky-600 font-bold">${iconName}</span>! 🎉
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
          <h1 class="text-[15.5px] font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-1.5 truncate">
            <span>Flashgram Plus</span>
            <span class="text-[11px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gradient-to-r from-pink-500 to-amber-500 text-white tracking-wide">Easter Egg</span>
          </h1>
          <p class="text-[11.5px] text-neutral-500 dark:text-neutral-400 truncate">Change your app icon</p>
        </div>
      </div>
      <button type="button" id="appIconChangerCloseBtn" class="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
        <i class="fa-solid fa-xmark text-[16px]"></i>
      </button>
    </header>

    <!-- Content / Grid -->
    <div class="flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-16">
      <div class="max-w-md mx-auto space-y-5">

        <!-- Easter Egg Story Banner -->
        <div class="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800 flex items-start gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 text-white flex items-center justify-center shrink-0 shadow-sm text-base">
            ✨
          </div>
          <div class="text-[12.5px] leading-relaxed text-neutral-600 dark:text-neutral-300">
            <span class="font-bold text-neutral-900 dark:text-white">You found the secret Easter Egg!</span>
            Long-press the top Flashgram logo anytime to open this drawer and switch your launcher icon.
          </div>
        </div>

        <!-- 2-Column Grid -->
        <div id="appIconCardsGrid" class="grid grid-cols-2 gap-3.5 pt-1">
          <!-- Dynamically populated -->
        </div>

        <!-- Help note at bottom -->
        <div class="text-center pt-2 pb-6 text-[11.5px] text-neutral-400 dark:text-neutral-500">
          On Android, selected icon will update dynamically on your home launcher screen via Activity-Alias.
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
 * Render all 6 icon cards with active selection states
 */
function renderIconGrid() {
  const modal = createOrGetModalDOM();
  const grid = modal.querySelector('#appIconCardsGrid');
  if (!grid) return;

  const currentIconId = getActiveAppIconId();

  grid.innerHTML = APP_ICONS.map(icon => {
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
  }).join('');
}

/**
 * Handle user tapping an icon
 */
export async function selectAppIcon(iconId) {
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
  window.setupHeaderLogoEasterEgg = setupHeaderLogoEasterEgg;

  // Initialize saved favicon on load
  const savedIcon = getActiveAppIconId();
  if (savedIcon && savedIcon !== 'default') {
    updateWebFavicon(savedIcon);
  }
}
