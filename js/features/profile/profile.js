// js/features/profile/profile.js - Profile Screen & Post Grid Module
import {
  openProfile,
  handleProfileBack,
  closeUserProfile,
  renderProfileGrid,
  updateProfilePostsCount,
  switchProfileTab,
  openProfilePostModal
} from "../../../src/components/Profile.js";

export function initProfileView() {
  renderProfileGrid();
}

export {
  openProfile,
  handleProfileBack,
  closeUserProfile,
  renderProfileGrid,
  updateProfilePostsCount,
  switchProfileTab,
  openProfilePostModal
};
