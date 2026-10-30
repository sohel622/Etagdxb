// YouTube-Style Channel Profile Header with Avatar Elastic Spring Physics
import { UserProfileStore } from "../../../utils/storage.js";
import { getUniqueUserAvatar } from "../../../services/avatarService.js";

export function getProfileHeaderData() {
  const profile = UserProfileStore.state || {};
  const username = profile.username || (profile.email ? profile.email.split('@')[0] : "creator");
  const name = profile.name || (profile.email ? profile.email.split('@')[0] : username);
  const avatar = profile.avatar || getUniqueUserAvatar(profile.id || username, username);
  return {
    username: username,
    name: name,
    avatar: avatar,
    bio: profile.bio || "Digital Creator ✨ Daily reels & updates!",
    link: profile.link || `flashgram.me/${username}`
  };
}
