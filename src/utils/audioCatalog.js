// Curated Music Library with 30-Second Audio Snippets for Post Attachments
// Fallback to Web Audio synthesized melodic preview if network audio fails

export const TRENDING_TRACKS = [
  {
    id: "track_1",
    title: "Blinding Lights",
    artist: "The Weeknd",
    duration: 30,
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=synthwave-80s-110045.mp3"
  },
  {
    id: "track_2",
    title: "Shape of You",
    artist: "Ed Sheeran",
    duration: 30,
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=pop-summer-fashion-122792.mp3"
  },
  {
    id: "track_3",
    title: "As It Was",
    artist: "Harry Styles",
    duration: 30,
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=indie-pop-energetic-108868.mp3"
  },
  {
    id: "track_4",
    title: "Levitating",
    artist: "Dua Lipa",
    duration: 30,
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=disco-funk-103328.mp3"
  },
  {
    id: "track_5",
    title: "Starboy",
    artist: "The Weeknd ft. Daft Punk",
    duration: 30,
    cover: "https://images.unsplash.com/photo-1445985543469-433ecdd62977?w=300&auto=format&fit=crop&q=80",
    audioUrl: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_bb630cc098.mp3?filename=electronic-future-beats-117997.mp3"
  },
  {
    id: "track_6",
    title: "Stay",
    artist: "The Kid LAROI, Justin Bieber",
    duration: 30,
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&auto=format&fit=crop&q=80",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=summer-tropical-pop-115317.mp3"
  },
  {
    id: "track_7",
    title: "Despacito",
    artist: "Luis Fonsi ft. Daddy Yankee",
    duration: 30,
    cover: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/11/06/audio_c1cfa15259.mp3?filename=reggaeton-summer-latin-124956.mp3"
  },
  {
    id: "track_8",
    title: "Flowers",
    artist: "Miley Cyrus",
    duration: 30,
    cover: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/26/audio_d0c6ff1101.mp3?filename=uplifting-day-10654.mp3"
  }
];

// Audio playback controller with strict 30-second cut off / fade
class Audio30sController {
  constructor() {
    this.audioElement = null;
    this.currentPostId = null;
    this.currentTrack = null;
    this.timerId = null;
    this.fadeInterval = null;
    this.synthContext = null;
    this.synthOscillator = null;
  }

  playTrackForPost(postId, track) {
    if (!track) return;
    if (this.currentPostId === postId && this.audioElement && !this.audioElement.paused) {
      return; // Already playing for this post
    }

    this.stopPlayback();

    this.currentPostId = postId;
    this.currentTrack = track;

    try {
      this.audioElement = new Audio();
      this.audioElement.src = track.audioUrl;
      this.audioElement.volume = 1.0;
      this.audioElement.loop = false;

      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("[Audio30s] Direct play prevented or network error, starting synth fallback:", err);
          this.playSynthesizedSnippet(track);
        });
      }

      // Notify post indicator that music is playing
      this.notifyPlaybackState(postId, true);

      // Strict 30-second duration cutoff with gentle 2-second fade-out starting at 28s
      this.timerId = setTimeout(() => {
        this.fadeOutAndStop();
      }, 28000);

      this.audioElement.onended = () => {
        this.stopPlayback();
      };
    } catch (e) {
      console.warn("[Audio30s] Exception starting audio:", e);
      this.playSynthesizedSnippet(track);
    }
  }

  // Graceful 2-second volume fade down before stop
  fadeOutAndStop() {
    if (!this.audioElement) {
      this.stopPlayback();
      return;
    }

    let vol = this.audioElement.volume;
    if (this.fadeInterval) clearInterval(this.fadeInterval);

    this.fadeInterval = setInterval(() => {
      if (this.audioElement && vol > 0.05) {
        vol = Math.max(0, vol - 0.1);
        this.audioElement.volume = vol;
      } else {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        this.stopPlayback();
      }
    }, 200);
  }

  stopPlayback() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (_) {}
      this.audioElement = null;
    }
    if (this.synthContext) {
      try {
        this.synthContext.close();
      } catch (_) {}
      this.synthContext = null;
    }

    if (this.currentPostId) {
      this.notifyPlaybackState(this.currentPostId, false);
      this.currentPostId = null;
    }
    this.currentTrack = null;
  }

  // Browser Web Audio synthesized melodic beat fallback for offline / restricted environments
  playSynthesizedSnippet(track) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.synthContext = new AudioCtx();
      const now = this.synthContext.currentTime;

      // Create a warm rhythmic chord progression
      const chords = [
        [261.63, 329.63, 392.00], // C
        [220.00, 261.63, 329.63], // Am
        [174.61, 220.00, 261.63], // F
        [196.00, 246.94, 293.66]  // G
      ];

      chords.forEach((chord, chordIdx) => {
        chord.forEach((freq) => {
          const osc = this.synthContext.createOscillator();
          const gain = this.synthContext.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + chordIdx * 1.5);

          gain.gain.setValueAtTime(0, now + chordIdx * 1.5);
          gain.gain.linearRampToValueAtTime(0.08, now + chordIdx * 1.5 + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + chordIdx * 1.5 + 1.4);

          osc.connect(gain);
          gain.connect(this.synthContext.destination);

          osc.start(now + chordIdx * 1.5);
          osc.stop(now + chordIdx * 1.5 + 1.5);
        });
      });

      this.notifyPlaybackState(this.currentPostId, true);

      this.timerId = setTimeout(() => {
        this.stopPlayback();
      }, 30000);
    } catch (e) {
      console.warn("Synth fallback warning:", e);
    }
  }

  notifyPlaybackState(postId, isPlaying) {
    const badge = document.querySelector(`.post-card[data-post-id="${postId}"] .post-music-badge, .profile-post-modal[data-post-id="${postId}"] .post-music-badge`);
    if (badge) {
      badge.classList.toggle("is-playing", isPlaying);
      const icon = badge.querySelector(".music-status-icon");
      if (icon) {
        icon.className = isPlaying 
          ? "fa-solid fa-volume-high music-status-icon text-pink-500 animate-pulse" 
          : "fa-solid fa-music music-status-icon text-neutral-300";
      }
    }
  }
}

export const audio30sController = new Audio30sController();
