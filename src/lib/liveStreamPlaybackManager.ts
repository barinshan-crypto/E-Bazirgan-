/**
 * Live Stream Playback Manager
 * Provides memory-safe lifecycle management, playback state preservation across
 * component unmounting/remounting, and resize stabilization for live video streams.
 */

export interface LivePlaybackState {
  currentTime: number;
  isMuted: boolean;
  isPlaying: boolean;
  volume: number;
  updatedAt: number;
}

// In-memory cache to preserve state across component unmounts (e.g., PiP minimize/maximize)
const playbackStateCache = new Map<string, LivePlaybackState>();

// Global mute preference (persisted in localStorage)
const STORAGE_KEY_MUTED = 'payv_live_stream_muted';

export function getStoredMutePreference(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(STORAGE_KEY_MUTED);
    return val !== null ? val === 'true' : true; // Default to muted for auto-play policy
  } catch {
    return true;
  }
}

export function setStoredMutePreference(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_MUTED, muted ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function savePlaybackState(sessionId: string, state: Partial<LivePlaybackState>): void {
  if (!sessionId) return;
  const existing = playbackStateCache.get(sessionId) || {
    currentTime: 0,
    isMuted: getStoredMutePreference(),
    isPlaying: true,
    volume: 1,
    updatedAt: Date.now()
  };

  const updated: LivePlaybackState = {
    ...existing,
    ...state,
    updatedAt: Date.now()
  };

  playbackStateCache.set(sessionId, updated);
  if (typeof state.isMuted === 'boolean') {
    setStoredMutePreference(state.isMuted);
  }
}

export function getPlaybackState(sessionId: string): LivePlaybackState | null {
  if (!sessionId) return null;
  const cached = playbackStateCache.get(sessionId);
  if (cached && Date.now() - cached.updatedAt < 30 * 60 * 1000) { // 30 min cache
    return cached;
  }
  return null;
}

export function clearPlaybackState(sessionId: string): void {
  playbackStateCache.delete(sessionId);
}

/**
 * Gracefully teardown a video element on unmount to prevent:
 * 1. AbortError: play() request interrupted
 * 2. Memory leaks from decoding pipelines
 * 3. Lingering audio or WebRTC streams
 */
export function safelyTeardownVideo(video: HTMLVideoElement | null): void {
  if (!video) return;

  try {
    // 1. Pause video
    video.pause();

    // 2. Detach srcObject and stop non-shared tracks
    if (video.srcObject) {
      const stream = video.srcObject as MediaStream;
      if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((track) => {
          // If the track is a remote viewer track, stop it to free up hardware decoder
          if (track.readyState === 'live') {
            try {
              track.stop();
            } catch (_) {}
          }
        });
      }
      video.srcObject = null;
    }

    // 3. Clear src attribute to halt network buffering
    video.removeAttribute('src');
    video.load();
  } catch (err) {
    // Safe fallback - swallow teardown errors during unmount
    console.debug('Teardown video warning (handled):', err);
  }
}
