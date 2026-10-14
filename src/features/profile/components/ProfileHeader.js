// YouTube-Style Channel Profile Header with Avatar Elastic Spring Physics
import { UserProfileStore } from "../../../utils/storage.js";

export function getProfileHeaderData() {
  const profile = UserProfileStore.state;
  return {
    username: profile.username || "sohelmommy_077",
    name: profile.name || "Sohel Mommy",
    avatar: profile.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
    bio: profile.bio || "Digital Creator ✨ Daily reels & updates!",
    link: profile.link || "flashgram.me/sohelmommy_077"
  };
}
