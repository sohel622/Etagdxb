// Main App Controller
import { initDatabase } from "./services/database.js";
import { UserProfileStore } from "./utils/storage.js";
import { initTopNavbar, renderNavigation, renderDragBox } from "./components/navigation/index.js";
import { renderHomeFeed } from "./components/Feed.js";
import { loadReels } from "./components/ReelsViewer.js";
import { initProfileInteractions, updateProfilePostsCount, renderProfileGrid, syncCurrentLoggedInUserProfile } from "./components/Profile.js";
import { initStories } from "./components/Stories.js";
import { initModals, requestInitialBrowserNotificationPermission } from "./components/Modals.js";
import { isUserAuthenticated, openAuthOnboardingFlow, triggerGoogleOneTap } from "./services/supabaseAuth.js";
import { initIncomingShareListener } from "./services/shareIntentHandler.js";
import { initAvatarRealtimeSync } from "./services/avatarService.js";
import { initAccountSwitcher } from "./components/AccountSwitcher.js";
import { initRealtimeMessagesListener } from "./services/chatService.js";
import { preloadFollowStatus } from "./services/followService.js";
import { initStatusBarListener } from "./services/statusBarService.js";
import { checkAndPromptPermissionsOnLaunch } from "./services/notificationService.js";
import { initReelsPipHandler } from "./services/pipService.js";

export const App = {
  async init() {
    // 0. Wipe old deprecated dummy/cached post entries
    try {
      localStorage.removeItem("cached_posts");
      localStorage.removeItem("user_videos");
      localStorage.removeItem("videos");
      localStorage.removeItem("mock_videos");
      localStorage.removeItem("flashgram_sample_posts");
    } catch (_) {}

    // 1. Restore persisted session user data if present
    try {
      const savedAuth = localStorage.getItem("flashgram_authenticated");
      const savedSession = localStorage.getItem("flashgram_user_session");
      if (savedAuth === "true" && savedSession) {
        const sessionData = JSON.parse(savedSession);
        if (sessionData && (sessionData.displayName || sessionData.name)) {
          UserProfileStore.setState({
            name: sessionData.displayName || sessionData.name,
            ...(sessionData.email ? { email: sessionData.email } : {}),
            ...(sessionData.photoURL ? { avatar: sessionData.photoURL } : {})
          });
        }
      }
    } catch (_) {}

    // 2. Initialize IndexedDB database
    await initDatabase();

    // 3. Sync Profile Store with DOM
    UserProfileStore.syncDOM();

    // 4. Render main UI components
    initTopNavbar();
    renderNavigation();
    renderDragBox();
    renderHomeFeed();
    await loadReels();
    initProfileInteractions();
    initModals();
    await syncCurrentLoggedInUserProfile();
    updateProfilePostsCount();
    renderProfileGrid();
    initStories();
    initAccountSwitcher();

    // 5. Browser notifications
    requestInitialBrowserNotificationPermission();

    // 6. Multi-step Authentication check
    if (!isUserAuthenticated()) {
      openAuthOnboardingFlow(1);
      setTimeout(triggerGoogleOneTap, 500);
    }

    // 7. Android Native & Web Share Intent Receiver
    initIncomingShareListener();

    // 8. Live Real-Time Avatar Synchronization across App
    initAvatarRealtimeSync();

    // 9. Realtime Direct Messaging & Follows Synchronization
    initRealtimeMessagesListener();
    preloadFollowStatus();

    // 10. Dynamic Instagram-style Status Bar listener
    initStatusBarListener();

    // 11. Instagram-style Permission Onboarding check on App Launch
    checkAndPromptPermissionsOnLaunch();

    // 12. Hardware Back Button & Reels Picture-in-Picture Handler
    initReelsPipHandler();
  }
};

window.App = App;
