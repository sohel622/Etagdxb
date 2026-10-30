// src/features/explore/exploreService.js - Explore Feed & Search Service
import { fetchSupabasePosts, getOptimizedVideoUrl } from "../../services/cloudinaryService.js";
import { SHABNAM_AI_PROFILE } from "../../utils/mockData.js";

const EXPLORE_CACHE_KEY = "flashgram_explore_cached_feed";
const SEARCH_HISTORY_KEY = "flashgram_recent_search_history";

// Import curated explore feed catalog, trending accounts & tags from dedicated data folder
export { CURATED_EXPLORE_ITEMS, SEARCHABLE_ACCOUNTS, TRENDING_TAGS } from "../../data/exploreData.js";
import { CURATED_EXPLORE_ITEMS, SEARCHABLE_ACCOUNTS, TRENDING_TAGS } from "../../data/exploreData.js";


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
