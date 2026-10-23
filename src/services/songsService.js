// Supabase Songs Table Service
// Handles real-time music fetching, trending tracks, duration formatting, and post song binding
import { supabase } from '../supabaseClient.js';

export const DEFAULT_MUSIC_COVER = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80";

/**
 * Normalizes a row from the Supabase `songs` table
 * Handles domain corrections and default values
 */
export function normalizeSongRecord(song) {
  if (!song) return null;

  let audioUrl = song.audio_url || '';
  if (audioUrl.includes('gxotjbncfpwhisehvbcff')) {
    audioUrl = audioUrl.replace('gxotjbncfpwhisehvbcff', 'gxoajbncfpwhisehvbcf');
  }

  let coverUrl = song.cover_url || '';
  if (coverUrl && coverUrl.includes('gxotjbncfpwhisehvbcff')) {
    coverUrl = coverUrl.replace('gxotjbncfpwhisehvbcff', 'gxoajbncfpwhisehvbcf');
  }
  if (!coverUrl) {
    coverUrl = DEFAULT_MUSIC_COVER;
  }

  const durationSec = typeof song.duration === 'number' && song.duration > 0 ? song.duration : 30;

  return {
    id: String(song.id),
    song_id: String(song.id),
    title: song.title || 'Untitled Track',
    artist: song.artist || 'Unknown Artist',
    duration: durationSec,
    formattedDuration: formatSongDuration(durationSec),
    audio_url: audioUrl,
    audioUrl: audioUrl,
    cover_url: coverUrl,
    coverUrl: coverUrl,
    cover: coverUrl,
    country: song.country || '',
    category: song.category || 'Trending',
    is_viral: Boolean(song.is_viral)
  };
}

/**
 * Formats duration in seconds to M:SS (e.g. 30 -> "0:30")
 */
export function formatSongDuration(seconds = 30) {
  const sec = Math.max(0, Math.floor(seconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Fetches real-time songs from the Supabase `songs` table with optional search query
 * @param {string} query - Filter by title, artist, or category
 * @returns {Promise<Array>}
 */
export async function fetchSongsFromSupabase(query = '') {
  try {
    let q = supabase
      .from('songs')
      .select('*')
      .order('is_viral', { ascending: false })
      .order('created_at', { ascending: false });

    const trimmed = (query || '').trim();
    if (trimmed) {
      q = q.or(`title.ilike.%${trimmed}%,artist.ilike.%${trimmed}%,category.ilike.%${trimmed}%`);
    }

    const { data, error } = await q;
    if (error) {
      console.warn('[SongsService] Supabase query notice:', error.message || error);
      return [];
    }

    return (data || []).map(normalizeSongRecord).filter(Boolean);
  } catch (err) {
    console.error('[SongsService] Exception fetching songs:', err);
    return [];
  }
}

/**
 * Fetches trending tracks directly from Supabase `songs` table
 * @returns {Promise<Array>}
 */
export async function fetchTrendingSongs() {
  try {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('is_viral', { ascending: false })
      .limit(20);

    if (error) {
      console.warn('[SongsService] Trending query notice:', error.message || error);
      return [];
    }

    return (data || []).map(normalizeSongRecord).filter(Boolean);
  } catch (err) {
    console.error('[SongsService] Exception fetching trending tracks:', err);
    return [];
  }
}

/**
 * Fetches a single song by its UUID
 * @param {string} songId
 */
export async function fetchSongById(songId) {
  if (!songId) return null;
  try {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('id', songId)
      .single();

    if (error || !data) return null;
    return normalizeSongRecord(data);
  } catch (_) {
    return null;
  }
}

/**
 * Strips out internal [FLASHGRAM_SONG: ...] JSON tags, storage URLs,
 * and any raw metadata from captions so only clean user text/hashtags are rendered.
 */
export function sanitizeCaptionText(rawCaption = '') {
  if (!rawCaption || typeof rawCaption !== 'string') return '';
  return rawCaption
    .replace(/\[FLASHGRAM_SONG:[\s\S]*?\]/gi, '')
    .replace(/https?:\/\/[^\s]+\.supabase\.co\/storage\/[^\s]+/gi, '')
    .replace(/https?:\/\/[^\s]*res\.cloudinary\.com\/[^\s]*/gi, '')
    .trim();
}

/**
 * Encodes song metadata into the caption text to guarantee 100% persistence
 * in the Supabase `posts` table across all sessions and client queries.
 */
export function encodePostCaptionWithSong(userCaption = '', song = null) {
  const baseCaption = sanitizeCaptionText(userCaption);
  if (!song) return baseCaption;

  const normalized = normalizeSongRecord(song);
  if (!normalized) return baseCaption;

  const meta = JSON.stringify({
    song_id: normalized.id,
    title: normalized.title,
    artist: normalized.artist,
    audio_url: normalized.audio_url,
    cover_url: normalized.cover_url,
    duration: normalized.duration
  });

  return `${baseCaption}\n\n[FLASHGRAM_SONG:${meta}]`;
}

/**
 * Decodes the clean user-facing caption and any attached song metadata from the database caption
 */
export function decodePostCaptionAndSong(rawCaption = '') {
  if (!rawCaption || typeof rawCaption !== 'string') {
    return { caption: rawCaption || '', song: null };
  }

  let extractedSong = null;
  const match = rawCaption.match(/\[FLASHGRAM_SONG:([\s\S]*?)\]/i);
  if (match) {
    try {
      const songData = JSON.parse(match[1]);
      extractedSong = normalizeSongRecord(songData);
    } catch (_) {}
  }

  const cleanCaption = sanitizeCaptionText(rawCaption);
  return {
    caption: cleanCaption,
    song: extractedSong
  };
}

// Global Reel Audio Mixer instance for synchronized background music playback
class ReelAudioMixer {
  constructor() {
    this.audioElement = null;
    this.activeReelId = null;
    this.activeSongUrl = null;
    this.boundVideo = null;
  }

  /**
   * Play the selected background song for a reel, strictly muting the video audio
   * @param {string} reelId
   * @param {Object} song
   * @param {HTMLVideoElement} videoElement
   */
  playSongForReel(reelId, song, videoElement) {
    if (!song || (!song.audio_url && !song.audioUrl)) {
      this.stop();
      if (videoElement) {
        videoElement.muted = false;
      }
      return;
    }

    const audioUrl = song.audio_url || song.audioUrl;

    // Strictly mute original video audio
    if (videoElement) {
      videoElement.muted = true;
      this.boundVideo = videoElement;
    }

    if (this.activeReelId === reelId && this.activeSongUrl === audioUrl && this.audioElement) {
      if (this.audioElement.paused) {
        this.audioElement.play().catch(() => {});
      }
      return;
    }

    this.stop();
    this.activeReelId = reelId;
    this.activeSongUrl = audioUrl;

    try {
      this.audioElement = new Audio(audioUrl);
      this.audioElement.loop = true;
      this.audioElement.volume = 1.0;

      // Sync with video if available
      if (videoElement) {
        if (!isNaN(videoElement.currentTime) && videoElement.currentTime > 0) {
          const songDuration = song.duration || 30;
          this.audioElement.currentTime = videoElement.currentTime % songDuration;
        }
      }

      this.audioElement.play().catch((err) => {
        console.warn('[ReelAudioMixer] Autoplay note:', err);
      });
    } catch (err) {
      console.warn('[ReelAudioMixer] Playback exception:', err);
    }
  }

  pause() {
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
    }
  }

  resume() {
    if (this.audioElement && this.audioElement.paused) {
      this.audioElement.play().catch(() => {});
    }
  }

  syncWithVideo(videoElement) {
    if (!this.audioElement || !videoElement) return;
    if (videoElement.paused) {
      this.pause();
    } else {
      this.resume();
    }
  }

  seek(timeInSeconds, songDuration = 30) {
    if (!this.audioElement) return;
    try {
      const dur = songDuration || 30;
      this.audioElement.currentTime = timeInSeconds % dur;
    } catch (_) {}
  }

  setMuted(muted) {
    if (this.audioElement) {
      this.audioElement.muted = Boolean(muted);
    }
  }

  setVolume(volume) {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  stop() {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.audioElement.src = '';
      } catch (_) {}
      this.audioElement = null;
    }
    this.activeReelId = null;
    this.activeSongUrl = null;
    this.boundVideo = null;
  }
}

export const reelAudioMixer = new ReelAudioMixer();

if (typeof window !== 'undefined') {
  window.fetchSongsFromSupabase = fetchSongsFromSupabase;
  window.fetchTrendingSongs = fetchTrendingSongs;
  window.reelAudioMixer = reelAudioMixer;
}
