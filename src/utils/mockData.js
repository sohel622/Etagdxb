// Flashgram Mock Data and Defaults

export const DEFAULT_USER_PROFILE = {
  username: "sohel_077",
  name: "Sohel ✨",
  pronouns: "he/him",
  bio: "🚀 Digital Creator & Explorer. Daily reels & updates!",
  link: "flashgram.me/sohel",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
};

export const SHABNAM_AI_PROFILE = {
  id: "shabnam_ai",
  username: "shabnam_ai",
  name: "Shabnam AI",
  handle: "@shabnam_ai",
  isVerified: true,
  followersCount: "1.2M",
  postsCount: 1,
  category: "Official AI Assistant",
  bio: "Your friendly AI assistant ✨ Ask me anything or share your pictures!",
  link: "flashgram.ai/shabnam",
  avatar: "https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/IMG_20260921_164350.png",
  videoUrl: "https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/0chichan077-20260921-0001.mp4",
  caption: "Meet Shabnam AI ✨ Your personal creative companion right inside Flashgram!"
};

export const DEFAULT_NAV = [
  { id: "home", icon: "fa-solid fa-house", name: "Home", label: "Home" },
  { id: "reels", icon: "fa-solid fa-play", name: "Reels", label: "Reels" },
  { id: "search", icon: "fa-solid fa-magnifying-glass", name: "Search", label: "Search" },
  { id: "messages", icon: "fa-regular fa-comment-dots", name: "Messages", label: "Messages" },
  { id: "profile", icon: "fa-solid fa-user", isProfile: true, name: "Profile", label: "Profile" }
];

export const DEFAULT_CONVERSATIONS = [
  {
    id: "alex_rivera",
    name: "Alex Rivera",
    username: "alex_r",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80",
    lastMessage: "See you tomorrow! 🔥",
    time: "2h",
    isAi: false
  },
  {
    id: "sophia_patel",
    name: "Sophia Patel",
    username: "sophiap",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    lastMessage: "Liked a message",
    time: "1d",
    isAi: false
  }
];

export const SAMPLE_VIDEOS = [];
