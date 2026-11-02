import { defineStore } from 'pinia';

interface PlayerState {
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

export const usePlayerStore = defineStore('player', {
  state: (): PlayerState => ({
    isPlaying: false,
    isBuffering: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
  }),

  actions: {
    setPlaying(isPlaying: boolean) {
      this.isPlaying = isPlaying;
    },
    setBuffering(isBuffering: boolean) {
      this.isBuffering = isBuffering;
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
    reset() {
      this.$reset();
    },
  },
});
