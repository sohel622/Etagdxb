// Flashgram Main Entry Point
import './styles/global.css';

// Utilities & Services
import * as MockData from './utils/mockData.js';
import * as Storage from './utils/storage.js';
import * as Database from './services/database.js';
import * as DataService from './services/dataService.js';
import * as SupabaseAuth from './services/supabaseAuth.js';
import { supabase } from './supabaseClient.js';

// Components
import * as Navbar from './components/Navbar.js';
import * as Stories from './components/Stories.js';
import * as SuggestedReels from './components/SuggestedReels.js';
import * as Feed from './components/Feed.js';
import * as ReelsViewer from './components/ReelsViewer.js';
import * as Profile from './components/Profile.js';
import * as BottomNavigation from './components/BottomNavigation.js';
import * as ShabnamAI from './components/ShabnamAI.js';
import * as Modals from './components/Modals.js';
import * as ReelsComponents from './components/reels/index.js';
import * as ShareModal from './components/FlashgramShareModal.js';
import * as ShareIntentHandler from './services/shareIntentHandler.js';
import * as CloudinaryService from './services/cloudinaryService.js';
import * as AvatarService from './services/avatarService.js';

// App Controller
import { App } from './App.js';

// Attach modules to window for backwards compatibility with HTML inline onclick events
Object.assign(window, {
  ...MockData,
  ...Storage,
  ...Database,
  ...DataService,
  ...SupabaseAuth,
  ...Navbar,
  ...Stories,
  ...SuggestedReels,
  ...Feed,
  ...ReelsViewer,
  ...Profile,
  ...BottomNavigation,
  ...ShabnamAI,
  ...Modals,
  ...ReelsComponents,
  ...ShareModal,
  ...ShareIntentHandler,
  ...CloudinaryService,
  ...AvatarService,
  supabase,
  App
});

// Boot the application on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}

console.log("Flashgram initialized with modular component architecture.");
