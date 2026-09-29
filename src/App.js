// Main App Controller
import { initDatabase } from "./services/database.js";
import { UserProfileStore } from "./utils/storage.js";
import { renderNavigation, renderDragBox } from "./components/BottomNavigation.js";
import { renderHomeFeed } from "./components/Feed.js";
import { loadReels } from "./components/ReelsViewer.js";
import { initProfileInteractions, updateProfilePostsCount, renderProfileGrid } from "./components/Profile.js";
import { initStories } from "./components/Stories.js";
import { initModals, requestInitialBrowserNotificationPermission } from "./components/Modals.js";
import { isUserAuthenticated, openAuthOnboardingFlow, triggerGoogleOneTap } from "./services/supabaseAuth.js";

export const App = {
  async init() {
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
    renderNavigation();
    renderDragBox();
    renderHomeFeed();
    await loadReels();
    initProfileInteractions();
    initModals();
    updateProfilePostsCount();
    renderProfileGrid();
    initStories();

    // 5. Browser notifications
    requestInitialBrowserNotificationPermission();

    // 6. Multi-step Authentication check
    if (!isUserAuthenticated()) {
      openAuthOnboardingFlow(1);
      setTimeout(triggerGoogleOneTap, 500);
    }
  }
};

window.App = App;
