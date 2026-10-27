// src/features/explore/exploreService.js - Explore Feed & Search Service
import { fetchSupabasePosts, getOptimizedVideoUrl } from "../../services/cloudinaryService.js";
import { SHABNAM_AI_PROFILE } from "../../utils/mockData.js";

const EXPLORE_CACHE_KEY = "flashgram_explore_cached_feed";
const SEARCH_HISTORY_KEY = "flashgram_recent_search_history";

// Curated high-res trending explore feed items with authentic Instagram-style view counts
export const CURATED_EXPLORE_ITEMS = [
  {
    id: "exp_1",
    type: "video",
    video_url: "https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/0chichan077-20260921-0001.mp4",
    thumbnail: "https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/IMG_20260921_164350.png",
    caption: "Meet Shabnam AI ✨ Your personal creative companion right inside Flashgram! #shabnam #ai #lifestyle",
    user: "shabnam_ai",
    avatar: "https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/IMG_20260921_164350.png",
    views: "1.2M",
    likes: "142K",
    isReel: true,
    isSpan2: true // Feature tall reel in staggered grid
  },
  {
    id: "exp_2",
    type: "image",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
    caption: "Golden hour glow in the city 🌇✨ #lifestyle #goldenhour #fashion",
    user: "alexperry",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    views: "93.5K",
    likes: "8.4K",
    isCarousel: false
  },
  {
    id: "exp_3",
    type: "image",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    caption: "Weekend aesthetics and cafe hopping ☕ #coffee #vibes #minimalism",
    user: "elena_v",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    views: "148K",
    likes: "16.2K",
    isCarousel: true,
    carouselItems: [
      { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800", type: "image" },
      { url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800", type: "image" }
    ]
  },
  {
    id: "exp_4",
    type: "video",
    video_url: "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-light-1232-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80",
    caption: "Cyberpunk street style in Tokyo Shibuya ⚡🇯🇵 #tokyo #neon #reels",
    user: "sohelmommy_077",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
    views: "450K",
    likes: "42.1K",
    isReel: true
  },
  {
    id: "exp_5",
    type: "image",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80",
    caption: "Breathtaking mountain reflections at Yosemite 🏔️🌲 #nature #travel #explore",
    user: "marcus_k",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
    views: "820K",
    likes: "74K"
  },
  {
    id: "exp_6",
    type: "image",
    url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
    caption: "Vintage film collection shot on 35mm 📸🎞️ #film #analog #portrait",
    user: "sophia_patel",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    views: "215K",
    likes: "19.8K"
  },
  {
    id: "exp_7",
    type: "video",
    video_url: "https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&auto=format&fit=crop&q=80",
    caption: "Deep breath of fresh forest air 🌿 Calm your mind today #peace #nature #mindfulness",
    user: "zen_vibes",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    views: "640K",
    likes: "55K",
    isReel: true,
    isSpan2: true
  },
  {
    id: "exp_8",
    type: "image",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    caption: "Studio acoustic sessions with electric warmth 🎸🎶 #music #studio #art",
    user: "soundwave_lab",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
    views: "310K",
    likes: "27.3K"
  },
  {
    id: "exp_9",
    type: "image",
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80",
    caption: "Festival lights and unforgettable summer energy ✨🎉 #concert #lights #friends",
    user: "rave_culture",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
    views: "525K",
    likes: "48K"
  },
  {
    id: "exp_10",
    type: "video",
    video_url: "https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    caption: "Sunset drone perspective over Iceland canyons 🚁🌅 #drone #iceland #sunset",
    user: "aerial_voyage",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    views: "1.5M",
    likes: "138K",
    isReel: true
  },
  {
    id: "exp_11",
    type: "image",
    url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80",
    caption: "Autumn street fashion in Paris 🍂 High contrast styling #fashion #paris #style",
    user: "haute_couture",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
    views: "710K",
    likes: "61K"
  },
  {
    id: "exp_12",
    type: "image",
    url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&auto=format&fit=crop&q=80",
    caption: "Glacial lakes of the Swiss Alps 🇨🇭 Crystal clear water #switzerland #alps #adventure",
    user: "alpine_roamer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    views: "980K",
    likes: "89K"
  }
];

// Authentic searchable accounts
export const SEARCHABLE_ACCOUNTS = [
  {
    id: "shabnam_ai",
    username: "shabnam_ai",
    name: "Shabnam AI",
    avatar: "https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/IMG_20260921_164350.png",
    isVerified: true,
    followers: "1.2M",
    category: "Official AI Assistant"
  },
  {
    id: "sohelmommy_077",
    username: "sohelmommy_077",
    name: "Sohel Mommy",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
    isVerified: true,
    followers: "14.8K",
    category: "Digital Creator"
  },
  {
    id: "alexperry",
    username: "alexperry",
    name: "Alex Perry",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    isVerified: false,
    followers: "82.4K",
    category: "Photographer & Filmmaker"
  },
  {
    id: "elena_v",
    username: "elena_v",
    name: "Elena Vance",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    isVerified: true,
    followers: "340K",
    category: "Fashion & Lifestyle"
  },
  {
    id: "marcus_k",
    username: "marcus_k",
    name: "Marcus Kane",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
    isVerified: false,
    followers: "65.1K",
    category: "Outdoor Explorer"
  },
  {
    id: "sophia_patel",
    username: "sophia_patel",
    name: "Sophia Patel",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100",
    isVerified: true,
    followers: "192K",
    category: "Art Director"
  }
];

// Trending hashtags catalog
export const TRENDING_TAGS = [
  { tag: "lifestyle", postsCount: "1.4M", isTrending: true },
  { tag: "reels", postsCount: "28.4M", isTrending: true },
  { tag: "fashion", postsCount: "9.8M", isTrending: true },
  { tag: "tokyo", postsCount: "4.1M", isTrending: true },
  { tag: "travel", postsCount: "12.2M", isTrending: false },
  { tag: "flashgram", postsCount: "520K", isTrending: true },
  { tag: "photography", postsCount: "8.5M", isTrending: false },
  { tag: "music", postsCount: "15.1M", isTrending: false }
];

/**
 * Normalizes media URL to its canonical filename / core asset ID
 */
export function extractCanonicalMediaKey(url) {
  if (!url || typeof url !== "string") return "";
  const clean = url.split("?")[0].replace(/\/upload\/(?:[a-zA-Z0-9_,:]+\/)?/, "/upload/").trim();
  const filename = clean.split("/").pop();
  return (filename && filename.length > 4) ? filename.toLowerCase() : clean.toLowerCase();
}

/**
 * Filter out invalid placeholder assets (e.g. sample.mp4, test.mp4, empty)
 */
export function isValidMediaItem(item) {
  if (!item) return false;
  const rawVid = item.video_url || item.url || "";
  const thumb = item.thumbnail || item.thumbnail_url || "";
  if (!rawVid && !thumb) return false;
  if (rawVid.endsWith("/sample.mp4") || rawVid.endsWith("/test.mp4") || rawVid === "sample.mp4" || rawVid === "test.mp4") {
    return false;
  }
  return true;
}

/**
 * Deduplicate feed items and ensure diversity without consecutive duplicates
 */
export function deduplicateAndDiversifyFeed(items = []) {
  if (!Array.isArray(items)) return [];

  const seenMedia = new Set();
  const seenThumbs = new Set();
  const seenIds = new Set();
  const uniqueItems = [];

  for (const item of items) {
    if (!isValidMediaItem(item)) continue;

    const id = String(item.id || "");
    const mediaKey = extractCanonicalMediaKey(item.video_url || item.url);
    const thumbKey = extractCanonicalMediaKey(item.thumbnail || item.thumbnail_url);

    if (id && seenIds.has(id)) continue;
    if (mediaKey && seenMedia.has(mediaKey)) continue;
    if (thumbKey && seenThumbs.has(thumbKey)) continue;

    if (id) seenIds.add(id);
    if (mediaKey) seenMedia.add(mediaKey);
    if (thumbKey) seenThumbs.add(thumbKey);

    uniqueItems.push(item);
  }

  // Prevent consecutive items with identical user or media type if other items exist
  const diversified = [];
  const remaining = [...uniqueItems];

  while (remaining.length > 0) {
    const lastItem = diversified[diversified.length - 1];
    let nextIdx = 0;

    if (lastItem && remaining.length > 1) {
      // Find candidate that has different creator and different thumbnail
      const candidateIdx = remaining.findIndex(candidate =>
        candidate.user !== lastItem.user &&
        extractCanonicalMediaKey(candidate.thumbnail) !== extractCanonicalMediaKey(lastItem.thumbnail)
      );
      if (candidateIdx !== -1) {
        nextIdx = candidateIdx;
      }
    }

    diversified.push(remaining.splice(nextIdx, 1)[0]);
  }

  return diversified;
}

export class ExploreService {
  constructor() {
    this.cachedFeed = null;
    this.recentSearches = this.loadRecentSearches();
  }

  loadRecentSearches() {
    try {
      const data = localStorage.getItem(SEARCH_HISTORY_KEY);
      return data ? JSON.parse(data) : ["shabnam_ai", "tokyo", "lifestyle", "reels"];
    } catch (_) {
      return ["shabnam_ai", "tokyo", "lifestyle"];
    }
  }

  saveRecentSearches() {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(this.recentSearches));
    } catch (_) {}
  }

  addRecentSearch(term) {
    if (!term || typeof term !== "string") return;
    const clean = term.trim();
    if (!clean) return;
    this.recentSearches = [clean, ...this.recentSearches.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
    this.saveRecentSearches();
  }

  removeRecentSearch(term) {
    this.recentSearches = this.recentSearches.filter(s => s.toLowerCase() !== term.toLowerCase());
    this.saveRecentSearches();
  }

  clearRecentSearches() {
    this.recentSearches = [];
    this.saveRecentSearches();
  }

  getRecentSearches() {
    return [...this.recentSearches];
  }

  // Fast synchronous retrieve from local cache to prevent layout flicker
  getCachedFeed() {
    if (this.cachedFeed && this.cachedFeed.length > 0) {
      return deduplicateAndDiversifyFeed(this.cachedFeed);
    }
    try {
      const cachedStr = localStorage.getItem(EXPLORE_CACHE_KEY);
      if (cachedStr) {
        const parsed = JSON.parse(cachedStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deduplicated = deduplicateAndDiversifyFeed(parsed);
          this.cachedFeed = deduplicated;
          return deduplicated;
        }
      }
    } catch (_) {}
    const defaultDeduplicated = deduplicateAndDiversifyFeed(CURATED_EXPLORE_ITEMS);
    this.cachedFeed = defaultDeduplicated;
    return defaultDeduplicated;
  }

  // Asynchronous refresh merging Supabase posts with strict deduplication
  async fetchExploreFeed() {
    try {
      const supabasePosts = await fetchSupabasePosts();
      let formattedSupabase = [];

      if (Array.isArray(supabasePosts) && supabasePosts.length > 0) {
        formattedSupabase = supabasePosts
          .filter(p => isValidMediaItem(p))
          .map((p, idx) => {
            const rawVid = p.video_url || p.url || "";
            const isVid = Boolean(p.video_url || (rawVid && rawVid.match(/\.(mp4|webm|mov|m4v)($|\?)/i)));
            const vidUrl = isVid ? getOptimizedVideoUrl(rawVid) : null;
            const thumbUrl = p.thumbnail_url || p.thumbnail || (vidUrl ? (p.thumbnail_url || vidUrl.replace(/\.[^/.]+$/, ".jpg")) : p.url);

            return {
              id: String(p.id || `sp_${idx}`),
              type: isVid ? "video" : "image",
              video_url: vidUrl || rawVid,
              url: vidUrl || p.url,
              thumbnail: thumbUrl,
              caption: p.caption || "Flashgram moments ✨",
              user: p.author_name || p.username || "creator",
              avatar: p.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
              views: `${(Math.floor(Math.random() * 850) + 50)}K`,
              likes: `${(p.likes_count || 1248).toLocaleString()}`,
              isReel: isVid,
              isSpan2: idx % 6 === 0
            };
          });
      }

      // Merge Supabase authentic items first, complemented by curated items, strictly deduplicated
      const rawCombined = [...formattedSupabase, ...CURATED_EXPLORE_ITEMS];
      const uniqueFeed = deduplicateAndDiversifyFeed(rawCombined);

      this.cachedFeed = uniqueFeed;
      try {
        localStorage.setItem(EXPLORE_CACHE_KEY, JSON.stringify(uniqueFeed.slice(0, 40)));
      } catch (_) {}

      return uniqueFeed;
    } catch (err) {
      console.warn("Explore feed load warning, falling back to cache:", err);
      return this.getCachedFeed();
    }
  }

  search(query = "", filter = "Top") {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        accounts: SEARCHABLE_ACCOUNTS,
        tags: TRENDING_TAGS,
        items: this.getCachedFeed().slice(0, 12)
      };
    }

    const accounts = SEARCHABLE_ACCOUNTS.filter(a =>
      a.username.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.category && a.category.toLowerCase().includes(q))
    );

    const tags = TRENDING_TAGS.filter(t =>
      t.tag.toLowerCase().includes(q.replace(/^#/, ""))
    );

    const items = this.getCachedFeed().filter(item =>
      (item.caption && item.caption.toLowerCase().includes(q)) ||
      (item.user && item.user.toLowerCase().includes(q))
    );

    return { accounts, tags, items };
  }
}

export const exploreService = new ExploreService();

// Debounce helper
export function debounce(fn, wait = 180) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}
