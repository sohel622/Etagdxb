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
// প্রোফাইল লোড করার সঠিক ফাংশন
async function loadFlashgramProfile() {
  try {
    // বর্তমান ইউজারের সেশন চেক করা
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log("No user logged in");
      return;
    }

    // Supabase এর profiles বা users টেবিল থেকে রিয়েল ডাটা আনা
    // এখানে তোমার টেবিলের কলামগুলোর নাম মিলিয়ে নেবে (যেমন: full_name, username, avatar_url)
    const { data: profileData, error } = await supabase
      .from('profiles') // অথবা তোমার ইউজার টেবিলের নাম
      .select('full_name, username, avatar_url')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile data:', error.message);
      return;
    }

    if (profileData) {
      // ১. রিয়েল নেম (Real Name) সেট করা (স্ক্রিনশটের ওপরের ও নিচের নামের জায়গায়)
      const realName = profileData.full_name || profileData.username || "Creator";
      const userHandle = profileData.username ? `@${profileData.username}` : "@creator";

      // হেডারের নাম ও ইউজারনেম আপডেট
      if(document.getElementById('header-username')) {
        document.getElementById('header-username').innerText = realName;
      }
      if(document.getElementById('profile-display-name')) {
        document.getElementById('profile-display-name').innerText = realName;
      }
      if(document.getElementById('profile-handle')) {
        document.getElementById('profile-handle').innerText = userHandle;
      }

      // ২. প্রোফাইল লোগো / অবতার (Avatar/Logo) ঠিক করা
      const profileLogoUrl = profileData.avatar_url || 'default-avatar.png';
      
      // প্রোফাইল পিকচার এবং নেভবার লোগো একসাথে আপডেট করার জন্য
      document.querySelectorAll('.profile-avatar-img, #main-avatar, .nav-profile-logo').forEach(imgElement => {
        imgElement.src = profileLogoUrl;
      });

      console.log("Profile Name & Logo updated successfully!");
    }

  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

// পেজ লোড হওয়ার সাথে সাথে ফাংশনটি রান হবে
document.addEventListener('DOMContentLoaded', () => {
  loadFlashgramProfile();
});
    
