import { defineStore } from 'pinia';

interface PlayerState {
  isPlaying: boolean;
  isBuffering: boolean;
  isFullscreen: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  /** Mídia carregada no player (só o id — a UI reage a isso). */
  currentMediaId: string | null;
}

export const usePlayerStore = defineStore('player', {
  state: (): PlayerState => ({
    isPlaying: false,
    isBuffering: false,
    isFullscreen: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    currentMediaId: null,
  }),

  getters: {
    progress: (state): number =>
      state.duration > 0 ? Math.min(state.currentTime / state.duration, 1) : 0,
  },

  actions: {
    setPlaying(isPlaying: boolean) {
      this.isPlaying = isPlaying;
    },
    setBuffering(isBuffering: boolean) {
      this.isBuffering = isBuffering;
    },
    setFullscreen(isFullscreen: boolean) {
      this.isFullscreen = isFullscreen;
    },
    setProgress(currentTime: number, duration: number) {
      this.currentTime = currentTime;
      this.duration = duration;
    },
    setVolume(volume: number) {
      this.volume = Math.min(Math.max(volume, 0), 1);
    },
    setMuted(isMuted: boolean) {
      this.isMuted = isMuted;
    },
    setMedia(mediaId: string | null) {
      if (mediaId === this.currentMediaId) return;

      this.currentMediaId = mediaId;
      this.currentTime = 0;
      this.duration = 0;
      this.isPlaying = false;
      this.isBuffering = false;
    },
    reset() {
      this.isPlaying = false;
      this.isBuffering = false;
      this.isFullscreen = false;
      this.currentTime = 0;
      this.duration = 0;
      this.volume = 1;
      this.isMuted = false;
      this.currentMediaId = null;
    },
  },
});
