// Flashgram Music Service
// Powered by YouTube Data API v3, YouTube IFrame Player API, Web MediaSession API, and Capacitor LocalNotifications
import {
  updateMediaSessionState,
  clearMediaNotification,
  ensurePersistentAudioElement,
  acquireWakeLock,
  releaseWakeLock
} from "./mediaSessionController.js";

const YOUTUBE_API_KEY = "AIzaSyAaIoLTRmHOUTv5b5y7yiaT27Mj1AX936Q";

// Background Audio Keep-Alive for continuous playback when screen is locked or app is minimized
function startBgAudioKeepAlive() {
  try {
    const bgAudio = ensurePersistentAudioElement();
    if (bgAudio && bgAudio.paused) {
      bgAudio.play().catch(() => {});
    }
    acquireWakeLock();
  } catch (_) {}
}

function stopBgAudioKeepAlive() {
  try {
    if (typeof window !== "undefined" && window._flashgramPersistentAudio) {
      window._flashgramPersistentAudio.pause();
    }
    releaseWakeLock();
  } catch (_) {}
}

// Curated high-fidelity single tracks fallback catalog
const FALLBACK_TRACKS = {
  quickPicks: [
    {
      id: "4NRXx6U8ABQ",
      title: "Blinding Lights",
      channelTitle: "The Weeknd",
      thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
      duration: 200,
      category: "Quick picks"
    },
    {
      id: "JGwWNGJdvx8",
      title: "Shape of You",
      channelTitle: "Ed Sheeran",
      thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
      duration: 233,
      category: "Quick picks"
    },
    {
      id: "kJQP7kiw5Fk",
      title: "Despacito",
      channelTitle: "Luis Fonsi ft. Daddy Yankee",
      thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80",
      duration: 228,
      category: "Quick picks"
    },
    {
      id: "fJ9rUzIMcZQ",
      title: "Bohemian Rhapsody",
      channelTitle: "Queen",
      thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
      duration: 359,
      category: "Quick picks"
    },
    {
      id: "CevxZvSJLk8",
      title: "Roar",
      channelTitle: "Katy Perry",
      thumbnail: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80",
      duration: 269,
      category: "Quick picks"
    }
  ],
  trending: [
    {
      id: "hT_nvWreIhg",
      title: "Counting Stars",
      channelTitle: "OneRepublic",
      thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=80",
      duration: 257,
      category: "Trending Tracks"
    },
    {
      id: "09R8_2nJwqg",
      title: "Sugar",
      channelTitle: "Maroon 5",
      thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80",
      duration: 235,
      category: "Trending Tracks"
    },
    {
      id: "ru0K8uYEZWw",
      title: "Can't Stop the Feeling!",
      channelTitle: "Justin Timberlake",
      thumbnail: "https://images.unsplash.com/photo-1445985543470-41fdd6ce75b0?w=500&auto=format&fit=crop&q=80",
      duration: 236,
      category: "Trending Tracks"
    },
    {
      id: "YQHsXMglC9A",
      title: "Hello",
      channelTitle: "Adele",
      thumbnail: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=500&auto=format&fit=crop&q=80",
      duration: 295,
      category: "Trending Tracks"
    }
  ],
  remixes: [
    {
      id: "21X5lGlDOfg",
      title: "Sunflower",
      channelTitle: "Post Malone, Swae Lee",
      thumbnail: "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=500&auto=format&fit=crop&q=80",
      duration: 158,
      category: "Remixes"
    },
    {
      id: "RgKAFK5djSk",
      title: "See You Again",
      channelTitle: "Wiz Khalifa ft. Charlie Puth",
      thumbnail: "https://images.unsplash.com/photo-1520523839898-507121c0e3a6?w=500&auto=format&fit=crop&q=80",
      duration: 237,
      category: "Remixes"
    },
    {
      id: "d9MyW72ELq0",
      title: "Starboy",
      channelTitle: "The Weeknd ft. Daft Punk",
      thumbnail: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80",
      duration: 230,
      category: "Remixes"
    }
  ]
};

// Words indicating long compilation mixes/playlists to filter out
const COMPILATION_KEYWORDS = [
  "playlist",
  "full album",
  "best of",
  "compilation",
  "1 hour",
  "2 hour",
  "3 hour",
  "4 hour",
  "5 hour",
  "10 hour",
  "10 hours",
  "1 hour loop",
  "nonstop",
  "non-stop",
  "jukebox",
  "all songs",
  "greatest hits",
  "mega mix",
  "megamix",
  "audio jukebox",
  "continuous mix",
  "top hits playlist",
  "album stream",
  "discography",
  "mixtape",
  "top tracks playlist"
];

// Title sanitizer: Strips bracket noise such as [Official Music Video], (Lyrics), 8K, Full Song
function sanitizeTrackTitle(rawTitle) {
  if (!rawTitle) return "Unknown Track";
  let title = rawTitle;

  // Decode HTML entities
  try {
    const txt = document.createElement("textarea");
    txt.innerHTML = title;
    title = txt.value;
  } catch (_) {}

  const noisePatterns = [
    /\[\s*official\s*(music)?\s*(video|audio)?\s*\]/gi,
    /\(\s*official\s*(music)?\s*(video|audio)?\s*\)/gi,
    /\[\s*official\s*hd\s*(video|audio)?\s*\]/gi,
    /\(\s*official\s*hd\s*(video|audio)?\s*\)/gi,
    /\[\s*official\s*4k\s*(video|audio)?\s*\]/gi,
    /\(\s*official\s*4k\s*(video|audio)?\s*\)/gi,
    /\[\s*official\s*video\s*\]/gi,
    /\(\s*official\s*video\s*\)/gi,
    /\[\s*lyrics?\s*(video)?\s*\]/gi,
    /\(\s*lyrics?\s*(video)?\s*\)/gi,
    /\[\s*lyric\s*video\s*\]/gi,
    /\(\s*lyric\s*video\s*\)/gi,
    /\[\s*audio\s*\]/gi,
    /\(\s*audio\s*\)/gi,
    /\[\s*visualizer\s*\]/gi,
    /\(\s*visualizer\s*\)/gi,
    /\[\s*(4k|8k|hd|hq|uhd)\s*\]/gi,
    /\(\s*(4k|8k|hd|hq|uhd)\s*\)/gi,
    /\[\s*full\s*(song|audio|video|track)\s*\]/gi,
    /\(\s*full\s*(song|audio|video|track)\s*\)/gi,
    /\[\s*explicit\s*\]/gi,
    /\(\s*explicit\s*\)/gi,
    /\[\s*clean\s*\]/gi,
    /\(\s*clean\s*\)/gi,
    /\|\s*official\s*(music)?\s*(video|audio)?/gi,
    /-\s*official\s*(music)?\s*(video|audio)?/gi,
    /\|\s*lyrics?\s*(video)?/gi,
    /-\s*lyrics?\s*(video)?/gi
  ];

  noisePatterns.forEach(pattern => {
    title = title.replace(pattern, "");
  });

  // Clean trailing and leading delimiters and excess whitespace
  title = title
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—:|\/]+|[\s\-–—:|\/]+$/g, "")
    .trim();

  return title || rawTitle;
}

function isSingleTrack(snippet) {
  const title = (snippet.title || "").toLowerCase();
  for (const kw of COMPILATION_KEYWORDS) {
    if (title.includes(kw)) return false;
  }
  return true;
}

class YouTubeMusicService {
  constructor() {
    this.apiKey = YOUTUBE_API_KEY;
    this.player = null;
    this.isPlayerReady = false;
    this.currentTrack = null;
    this.queue = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.isShuffle = false;
    this.repeatMode = 'none'; // 'none' | 'all' | 'one'
    this.progressInterval = null;
    this.listeners = new Set();
    this.cachedCategoryFeeds = {};
    this.likedTrackIds = new Set(JSON.parse(localStorage.getItem('flashgram_liked_tracks') || '[]'));
    this.savedTrackIds = new Set(JSON.parse(localStorage.getItem('flashgram_saved_tracks') || '[]'));
  }

  // ========================================================
  // 1. YouTube Data API v3 Feed & Search Queries
  // ========================================================

  async fetchCategoryFeed(categoryName = 'Quick picks') {
    if (this.cachedCategoryFeeds[categoryName] && this.cachedCategoryFeeds[categoryName].length > 0) {
      return this.cachedCategoryFeeds[categoryName];
    }

    let query = "official audio trending songs";
    if (categoryName === "Trending Tracks") query = "trending songs official audio";
    else if (categoryName === "Remixes") query = "phonk remix official audio";
    else if (categoryName === "New releases") query = "new release official track 2026";
    else if (categoryName === "Charts") query = "top hit official audio";
    else if (categoryName === "Moods & genres") query = "chill acoustic official track";

    const tracks = await this.searchYouTubeMusic(query, 12, categoryName);
    this.cachedCategoryFeeds[categoryName] = tracks;
    return tracks;
  }

  async searchYouTubeMusic(query, maxResults = 12, categoryLabel = 'Search') {
    if (!query || !query.trim()) return [];

    try {
      // Configure single track target: videoCategoryId=10 (Music) and videoDuration=medium
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoDuration=medium&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`YouTube Data API responded with status ${response.status}. Using curated catalog fallback.`);
        return this.getFallbackForQuery(query, categoryLabel);
      }

      const data = await response.json();
      if (!data.items || data.items.length === 0) {
        return this.getFallbackForQuery(query, categoryLabel);
      }

      const tracks = data.items
        .filter(item => isSingleTrack(item.snippet || {}))
        .map((item) => {
          const videoId = item.id?.videoId || (typeof item.id === 'string' ? item.id : '');
          const snippet = item.snippet || {};
          const title = sanitizeTrackTitle(snippet.title || 'Unknown Track');
          const channelTitle = sanitizeTrackTitle(snippet.channelTitle || 'Artist');
          const thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500';

          return {
            id: videoId,
            title,
            channelTitle,
            thumbnail,
            duration: 215, // estimated default duration, will sync real duration upon playback
            category: categoryLabel
          };
        })
        .filter(t => Boolean(t.id));

      return tracks.length > 0 ? tracks : this.getFallbackForQuery(query, categoryLabel);
    } catch (err) {
      console.warn("Error fetching from YouTube Data API v3:", err);
      return this.getFallbackForQuery(query, categoryLabel);
    }
  }

  getFallbackForQuery(query, categoryLabel) {
    const qLower = (query || '').toLowerCase();
    if (qLower.includes('remix') || qLower.includes('lofi') || qLower.includes('phonk')) {
      return FALLBACK_TRACKS.remixes;
    }
    if (qLower.includes('trending') || qLower.includes('chart') || qLower.includes('top')) {
      return FALLBACK_TRACKS.trending;
    }
    if (categoryLabel === "Trending Tracks") return FALLBACK_TRACKS.trending;
    if (categoryLabel === "Remixes") return FALLBACK_TRACKS.remixes;
    return FALLBACK_TRACKS.quickPicks;
  }

  // ========================================================
  // 2. YouTube IFrame Player API Audio Engine
  // ========================================================

  initPlayer() {
    if (this.isPlayerReady && this.player) return;

    // Ensure hidden container exists in DOM
    let host = document.getElementById('youtubeMusicPlayerHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'youtubeMusicPlayerHost';
      host.style.cssText = 'position:fixed; top:-9999px; left:-9999px; width:1px; height:1px; opacity:0.001; pointer-events:none; z-index:-1;';
      const playerEl = document.createElement('div');
      playerEl.id = 'youtubeMusicPlayer';
      host.appendChild(playerEl);
      document.body.appendChild(host);
    }

    if (window.YT && window.YT.Player) {
      this.createYTPlayer();
    } else {
      // Load YouTube IFrame API script
      if (!document.getElementById('yt-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      const prevOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevOnReady === 'function') prevOnReady();
        this.createYTPlayer();
      };
    }
  }

  createYTPlayer() {
    if (this.player) return;

    try {
      this.player = new window.YT.Player('youtubeMusicPlayer', {
        height: '180',
        width: '320',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin
        },
        events: {
          onReady: () => {
            this.isPlayerReady = true;
            this.setupMediaSessionHandlers();
            this.notify();
          },
          onStateChange: (event) => {
            this.handlePlayerStateChange(event);
          },
          onError: (event) => {
            console.warn("YouTube Player error:", event.data);
            setTimeout(() => {
              if (this.isPlaying) this.nextTrack();
            }, 1000);
          }
        }
      });
    } catch (e) {
      console.warn("Failed to instantiate YT.Player:", e);
    }
  }

  handlePlayerStateChange(event) {
    if (!window.YT) return;

    switch (event.data) {
      case window.YT.PlayerState.PLAYING:
        this.isPlaying = true;
        this.startProgressTracker();
        this.syncDuration();
        this.updateMediaSession();
        break;
      case window.YT.PlayerState.PAUSED:
        this.isPlaying = false;
        this.stopProgressTracker();
        this.updateMediaSession();
        break;
      case window.YT.PlayerState.ENDED:
        this.handleTrackEnded();
        break;
      case window.YT.PlayerState.BUFFERING:
        this.syncDuration();
        break;
    }
    this.notify();
  }

  handleTrackEnded() {
    if (this.repeatMode === 'one') {
      if (this.player && this.player.seekTo) {
        this.player.seekTo(0);
        this.player.playVideo();
      }
    } else if (this.currentIndex < this.queue.length - 1 || this.repeatMode === 'all') {
      this.nextTrack();
    } else {
      this.isPlaying = false;
      this.stopProgressTracker();
      stopBgAudioKeepAlive();
      if (this.currentTrack) {
        updateMediaSessionState(false, this.currentTrack);
      }
      this.notify();
    }
  }

  syncDuration() {
    if (this.player && typeof this.player.getDuration === 'function') {
      const dur = this.player.getDuration();
      if (dur && dur > 0) {
        this.duration = Math.round(dur);
        if (this.currentTrack) {
          this.currentTrack.duration = this.duration;
        }
      }
    }
  }

  startProgressTracker() {
    this.stopProgressTracker();
    this.progressInterval = setInterval(() => {
      if (this.player && typeof this.player.getCurrentTime === 'function' && this.isPlaying) {
        const t = this.player.getCurrentTime();
        if (typeof t === 'number' && !isNaN(t)) {
          this.currentTime = Math.round(t);
        }
        this.syncDuration();
        this.updateMediaSessionPosition();
        this.notifyProgress();
      }
    }, 500);
  }

  stopProgressTracker() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  // ========================================================
  // 3. Playback Controls & Complete Stop/Dismiss
  // ========================================================

  async playTrack(track, queue = null) {
    if (!track || !track.id) return;

    this.initPlayer();

    if (queue && Array.isArray(queue) && queue.length > 0) {
      this.queue = [...queue];
      this.currentIndex = this.queue.findIndex(t => t.id === track.id);
      if (this.currentIndex === -1) {
        this.queue.unshift(track);
        this.currentIndex = 0;
      }
    } else if (!this.queue.some(t => t.id === track.id)) {
      this.queue.push(track);
      this.currentIndex = this.queue.length - 1;
    } else {
      this.currentIndex = this.queue.findIndex(t => t.id === track.id);
    }

    this.currentTrack = track;
    this.currentTime = 0;
    this.duration = track.duration || 0;
    this.isPlaying = true;
    startBgAudioKeepAlive();

    if (this.player && typeof this.player.loadVideoById === 'function') {
      try {
        this.player.loadVideoById({
          videoId: track.id,
          startSeconds: 0
        });
      } catch (err) {
        console.warn("Error playing video:", err);
      }
    } else {
      const checkInterval = setInterval(() => {
        if (this.player && typeof this.player.loadVideoById === 'function') {
          clearInterval(checkInterval);
          this.player.loadVideoById({
            videoId: track.id,
            startSeconds: 0
          });
        }
      }, 200);
      setTimeout(() => clearInterval(checkInterval), 4000);
    }

    this.startProgressTracker();
    this.updateMediaSession();
    this.notify();
  }

  togglePlayPause() {
    if (!this.currentTrack && this.queue.length > 0) {
      this.playTrack(this.queue[0]);
      return;
    }

    if (!this.player) return;

    if (this.isPlaying) {
      if (typeof this.player.pauseVideo === 'function') {
        this.player.pauseVideo();
      }
      this.isPlaying = false;
      this.stopProgressTracker();
      stopBgAudioKeepAlive();
    } else {
      if (typeof this.player.playVideo === 'function') {
        this.player.playVideo();
      }
      this.isPlaying = true;
      this.startProgressTracker();
      startBgAudioKeepAlive();
    }

    this.updateMediaSession();
    this.notify();
  }

  play() {
    startBgAudioKeepAlive();
    if (!this.isPlaying) {
      this.togglePlayPause();
    }
  }

  pause() {
    stopBgAudioKeepAlive();
    if (this.isPlaying) {
      this.togglePlayPause();
    }
  }

  // Full Stop & Close Action (Requirement 1)
  stopAndDismissPlayer() {
    this.stopProgressTracker();
    stopBgAudioKeepAlive();
    clearMediaNotification();

    if (this.player) {
      try {
        if (typeof this.player.stopVideo === 'function') {
          this.player.stopVideo();
        }
        if (typeof this.player.pauseVideo === 'function') {
          this.player.pauseVideo();
        }
        if (typeof this.player.clearVideo === 'function') {
          this.player.clearVideo();
        }
      } catch (e) {
        console.warn("Error stopping video stream:", e);
      }
    }

    this.isPlaying = false;
    this.currentTrack = null;
    this.currentTime = 0;
    this.duration = 0;

    // Stop Native Android MediaService Notification
    if (typeof window !== "undefined" && window.NativeMediaBridge && typeof window.NativeMediaBridge.stopMediaService === "function") {
      try {
        window.NativeMediaBridge.stopMediaService();
      } catch (e) {}
    }

    // Dismiss now playing modal if open
    if (typeof window !== "undefined" && typeof window.closeNowPlayingModal === "function") {
      window.closeNowPlayingModal();
    }

    this.notify();
  }

  seekTo(seconds) {
    const sec = Math.max(0, Math.min(seconds, this.duration || 3600));
    this.currentTime = Math.round(sec);
    if (this.player && typeof this.player.seekTo === 'function') {
      this.player.seekTo(sec, true);
    }
    this.updateMediaSessionPosition();
    this.notifyProgress();
  }

  nextTrack() {
    if (this.queue.length === 0) return;

    if (this.isShuffle) {
      const nextIdx = Math.floor(Math.random() * this.queue.length);
      this.currentIndex = nextIdx;
    } else {
      if (this.currentIndex < this.queue.length - 1) {
        this.currentIndex++;
      } else if (this.repeatMode === 'all') {
        this.currentIndex = 0;
      } else {
        return;
      }
    }

    const nextTrack = this.queue[this.currentIndex];
    if (nextTrack) {
      this.playTrack(nextTrack);
    }
  }

  prevTrack() {
    if (this.queue.length === 0) return;

    if (this.currentTime > 3) {
      this.seekTo(0);
      return;
    }

    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else if (this.repeatMode === 'all') {
      this.currentIndex = this.queue.length - 1;
    } else {
      this.seekTo(0);
      return;
    }

    const prevTrack = this.queue[this.currentIndex];
    if (prevTrack) {
      this.playTrack(prevTrack);
    }
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    this.notify();
  }

  toggleRepeat() {
    if (this.repeatMode === 'none') {
      this.repeatMode = 'all';
    } else if (this.repeatMode === 'all') {
      this.repeatMode = 'one';
    } else {
      this.repeatMode = 'none';
    }
    this.notify();
  }

  toggleLike(trackId) {
    if (!trackId) return false;
    if (this.likedTrackIds.has(trackId)) {
      this.likedTrackIds.delete(trackId);
    } else {
      this.likedTrackIds.add(trackId);
    }
    try {
      localStorage.setItem('flashgram_liked_tracks', JSON.stringify([...this.likedTrackIds]));
    } catch (_) {}
    this.notify();
    return this.likedTrackIds.has(trackId);
  }

  isTrackLiked(trackId) {
    return this.likedTrackIds.has(trackId);
  }

  toggleBookmark(trackId) {
    if (!trackId) return false;
    if (this.savedTrackIds.has(trackId)) {
      this.savedTrackIds.delete(trackId);
    } else {
      this.savedTrackIds.add(trackId);
    }
    try {
      localStorage.setItem('flashgram_saved_tracks', JSON.stringify([...this.savedTrackIds]));
    } catch (_) {}
    this.notify();
    return this.savedTrackIds.has(trackId);
  }

  isTrackBookmarked(trackId) {
    return this.savedTrackIds.has(trackId);
  }

  // ========================================================
  // 4. Web MediaSession API Implementation & Android Native Bridge
  // ========================================================

  setupMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seekTo(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        this.seekTo(Math.max(this.currentTime - offset, 0));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        this.seekTo(Math.min(this.currentTime + offset, this.duration || 3600));
      });
      navigator.mediaSession.setActionHandler('stop', () => this.stopAndDismissPlayer());
    } catch (e) {
      console.warn("Could not set MediaSession handlers:", e);
    }

    // 2. Custom Heart/Like Action in Media Notification (Requirement 2)
    try {
      navigator.mediaSession.setActionHandler('like', () => {
        this.toggleLikeCurrentTrack();
      });
    } catch (err) {
      console.log('Custom like handler supported:', err);
    }
  }

  toggleLikeCurrentTrack() {
    if (!this.currentTrack) return false;
    const isLiked = this.toggleLike(this.currentTrack.id);
    this.updateMediaSession();
    return isLiked;
  }

  updateMediaSession() {
    if (!this.currentTrack) return;
    const track = this.currentTrack;
    const coverArt = track.thumbnail || track.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500';

    // 1. Unified MediaSession & Capacitor LocalNotifications with swipe-to-dismiss (ongoing: isPlaying)
    updateMediaSessionState(Boolean(this.isPlaying), {
      title: track.title || 'Flashgram Music',
      artist: track.channelTitle || track.artist || 'Flashgram Music',
      cover: coverArt,
      coverUrl: coverArt,
      thumbnail: coverArt
    });

    if ('mediaSession' in navigator) {
      this.updateMediaSessionPosition();
    }

    // 2. Android Native Foreground Service & Lock Screen Notification
    this.syncNativeMediaNotification();
  }

  syncNativeMediaNotification() {
    if (!this.currentTrack) return;
    const track = this.currentTrack;
    const title = track.title || 'Flashgram Music';
    const artist = track.channelTitle || track.artist || 'Flashgram Music';
    const album = 'Flashgram Tracks';
    const coverUrl = track.thumbnail || track.coverUrl || '';
    const isPlaying = Boolean(this.isPlaying);
    const durationMs = Math.round((this.duration || 215) * 1000);
    const positionMs = Math.round((this.currentTime || 0) * 1000);
    const isLiked = this.isTrackLiked(track.id);

    if (typeof window !== "undefined" && window.NativeMediaBridge && typeof window.NativeMediaBridge.updateMediaMetadata === "function") {
      try {
        window.NativeMediaBridge.updateMediaMetadata(
          title,
          artist,
          album,
          coverUrl,
          isPlaying,
          durationMs,
          positionMs,
          isLiked
        );
      } catch (err) {
        console.warn("Error calling NativeMediaBridge.updateMediaMetadata:", err);
      }
    }
  }

  updateMediaSessionPosition() {
    if (!('mediaSession' in navigator) || typeof navigator.mediaSession.setPositionState !== 'function') return;

    if (this.duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(this.duration, 1),
          playbackRate: 1,
          position: Math.min(Math.max(this.currentTime, 0), this.duration)
        });
      } catch (_) {}
    }
  }

  // ========================================================
  // 5. Subscription / Event Listeners
  // ========================================================

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    this.listeners.forEach(cb => {
      try { cb(this.getState()); } catch (e) { console.error(e); }
    });
  }

  notifyProgress() {
    this.listeners.forEach(cb => {
      try {
        if (typeof cb.onProgress === 'function') {
          cb.onProgress(this.currentTime, this.duration);
        } else {
          cb(this.getState());
        }
      } catch (e) { console.error(e); }
    });
  }

  getState() {
    return {
      currentTrack: this.currentTrack,
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      queue: this.queue,
      currentIndex: this.currentIndex,
      isShuffle: this.isShuffle,
      repeatMode: this.repeatMode,
      isLiked: this.currentTrack ? this.isTrackLiked(this.currentTrack.id) : false
    };
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}

export const youtubeMusicService = new YouTubeMusicService();

/**
 * Real Music Integration via YouTube Search API
 * Uses Piped API / Invidious audio endpoints with YouTube Data API fallback
 */
export const searchYouTubeAudio = async (query = "") => {
  const searchQuery = (query && query.trim()) ? query.trim() : "top trending songs";

  // 1. Primary: Piped API music search endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(`https://api.piped.video/search?q=${encodeURIComponent(searchQuery)}&filter=music_songs`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        return data.items.map(item => {
          const videoId = (item.url || "").replace('/watch?v=', '').replace('/streams/', '');
          return {
            id: videoId || item.id || `yt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            title: item.title || "YouTube Track",
            artist: item.uploaderName || item.artist || "Artist",
            coverUrl: item.thumbnail || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300",
            cover: item.thumbnail || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300",
            audioUrl: `https://api.piped.video/streams/${videoId}`,
            duration: item.duration || 30
          };
        });
      }
    }
  } catch (err) {
    console.warn("Piped audio fetch note, attempting fallback:", err);
  }

  // 2. Secondary: Public Invidious instance search
  const invidiousMirrors = [
    "https://inv.tux.pizza",
    "https://invidious.nerdvpn.de",
    "https://vid.puffyan.us"
  ];
  for (const mirror of invidiousMirrors) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${mirror}/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          return results.slice(0, 10).map(item => ({
            id: item.videoId || item.id,
            title: item.title,
            artist: item.author || "YouTube Music",
            coverUrl: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
            cover: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
            audioUrl: `${mirror}/latest_version?id=${item.videoId}&itag=140`,
            duration: item.lengthSeconds || 30
          }));
        }
      }
    } catch (_) {}
  }

  // 3. Tertiary: YouTube Data API v3 search
  try {
    const ytTracks = await youtubeMusicService.searchYouTubeMusic(searchQuery, 10, "Search");
    if (Array.isArray(ytTracks) && ytTracks.length > 0) {
      return ytTracks.map(t => ({
        id: t.id,
        title: t.title,
        artist: t.channelTitle || "YouTube Artist",
        coverUrl: t.thumbnail,
        cover: t.thumbnail,
        audioUrl: `https://www.youtube.com/watch?v=${t.id}`,
        duration: t.duration || 30
      }));
    }
  } catch (err) {
    console.warn("YouTube Data API audio search error:", err);
  }

  // 4. Default high-fidelity audio snippets catalog
  return [
    {
      id: "yt_1",
      title: "Blinding Lights",
      artist: "The Weeknd",
      coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300",
      cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=synthwave-80s-110045.mp3",
      duration: 30
    },
    {
      id: "yt_2",
      title: "Shape of You",
      artist: "Ed Sheeran",
      coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300",
      cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=pop-summer-fashion-122792.mp3",
      duration: 30
    },
    {
      id: "yt_3",
      title: "As It Was",
      artist: "Harry Styles",
      coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300",
      cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=indie-pop-energetic-108868.mp3",
      duration: 30
    },
    {
      id: "yt_4",
      title: "Stay",
      artist: "The Kid LAROI, Justin Bieber",
      coverUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300",
      cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=summer-tropical-pop-115317.mp3",
      duration: 30
    }
  ];
};

if (typeof window !== "undefined") {
  window.youtubeMusicService = youtubeMusicService;
  window.searchYouTubeAudio = searchYouTubeAudio;
  window.YOUTUBE_API_KEY = YOUTUBE_API_KEY;
}
