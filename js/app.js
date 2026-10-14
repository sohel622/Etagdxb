// js/app.js - Flashgram Core Application Bootstrapper
import { switchTab, renderNavigation } from "../src/components/BottomNavigation.js";
import { initChatDrawer, openChatDrawer, closeChatDrawer, startNewChat } from "./features/chat/chatDrawer.js";
import { initChatReactions, openContextMenu, closeContextMenu } from "./features/chat/chatReactions.js";
import { initChatActions, setReplyMessage, cancelReply, pinMessage, unpinMessage, copyMessage } from "./features/chat/chatActions.js";
import { initHomeFeed, renderHomeFeed } from "./features/home-feed/homeFeed.js";
import { initFeedAudioSync } from "./features/home-feed/feedAudio.js";
import { initReelsPlayer, loadReels } from "./features/reels/reelsPlayer.js";
import { initMediaPicker, openPicker, closePicker } from "./features/media-picker/mediaPicker.js";
import { initMusicPlayer } from "./features/music/musicPlayer.js";
import { initProfileView, renderProfileGrid } from "./features/profile/profile.js";
import { App } from "../src/App.js";

// Export Core Modular Controller
export const FlashgramApp = {
  init() {
    // 1. Initialize legacy shell bindings
    App.init();

    // 2. Initialize modular features
    initChatDrawer();
    initChatReactions();
    initChatActions();
    initHomeFeed();
    initFeedAudioSync();
    initReelsPlayer();
    initMediaPicker();
    initMusicPlayer();
    initProfileView();

    console.log("Flashgram modular architecture booted successfully.");
  },

  switchTab(tabId) {
    return switchTab(tabId);
  }
};

// Auto boot on DOM Ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => FlashgramApp.init());
} else {
  FlashgramApp.init();
}

// Global safety bridge for inline onclick attributes in existing DOM templates
if (typeof window !== "undefined") {
  window.FlashgramApp = FlashgramApp;
  window.openShabnamHistoryDrawer = openChatDrawer;
  window.closeShabnamHistoryDrawer = closeChatDrawer;
  window.startNewShabnamChat = startNewChat;
  window.openChatMessageContextMenu = openContextMenu;
  window.closeChatMessageContextMenu = closeContextMenu;
  window.openInstagramMediaPicker = openPicker;
  window.closeInstagramMediaPicker = closePicker;
}
