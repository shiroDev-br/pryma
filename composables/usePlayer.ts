import { computed, toValue, watch, onScopeDispose } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';
import { HEARTBEAT_INTERVAL_MS, STORAGE_KEYS } from '~/constants';
import { sendPlaybackHeartbeat } from '~/services/player.service';
import { usePlayerStore } from '~/stores/player';

export interface UsePlayerOptions {
  /** Pode chegar depois (ex.: seleção assíncrona) — null ainda não há mídia. */
  mediaId: MaybeRefOrGetter<string | null>;
  /** Enviar heartbeat periodicamente durante a reprodução. */
  heartbeat?: boolean;
}

export interface PlayerControls {
  play(): void;
  pause(): void;
  toggle(): void;
  seek(seconds: number): void;
  /** Busca por razão 0..1 (clique na barra de progresso). */
  seekToRatio(ratio: number): void;
  setVolume(volume: number): void;
  toggleMute(): void;
  setSpeed(rate: number): void;
  /** Fração já bufferizada (0..1). */
  getBufferedRatio(): number;
  isPlaying: ComputedRef<boolean>;
  currentTime: ComputedRef<number>;
  duration: ComputedRef<number>;
}

interface SavedAudio {
  volume?: number;
  muted?: boolean;
}

function readSavedAudio(): SavedAudio {
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEYS.playerAudio) ?? '{}') as SavedAudio) ?? {};
  } catch {
    return {};
  }
}

function saveAudio(video: HTMLVideoElement): void {
  try {
    localStorage.setItem(STORAGE_KEYS.playerAudio, JSON.stringify({ volume: video.volume, muted: video.muted }));
  } catch {
    // Sem storage: vale só nesta sessão.
  }
}

/**
 * Ponte entre o <video> e o player store: estado de reprodução, volume salvo e
 * heartbeat. Fala direto com o elemento — o HUD é da página e não há nada entre
 * os dois (sem wrapper no DOM, sem chunk extra e sem corrida entre o `play` e a
 * biblioteca terminar de carregar, que deixava o card de pausa sobre o filme).
 */
export function usePlayer(videoEl: Ref<HTMLVideoElement | null>, options: UsePlayerOptions): PlayerControls {
  const store = usePlayerStore();
  const mediaId = computed(() => toValue(options.mediaId));

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  function startHeartbeat(): void {
    if (options.heartbeat === false || heartbeatTimer) return;

    heartbeatTimer = setInterval(() => {
      if (!mediaId.value) return;

      sendPlaybackHeartbeat({
        mediaId: mediaId.value,
        sessionId,
        positionSec: Math.floor(videoEl.value?.currentTime ?? 0),
      });
    }, HEARTBEAT_INTERVAL_MS);
  }

  function stopHeartbeat(): void {
    if (!heartbeatTimer) return;
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  let unbindNative: (() => void) | null = null;

  function syncPlaying(video: HTMLVideoElement): void {
    const playing = !video.paused && !video.ended;
    if (playing !== store.isPlaying) store.setPlaying(playing);
    if (playing) startHeartbeat();
    else stopHeartbeat();
  }

  function bindNative(video: HTMLVideoElement): void {
    unbindNative?.();

    const saved = readSavedAudio();
    if (typeof saved.volume === 'number') video.volume = Math.min(Math.max(saved.volume, 0), 1);
    if (typeof saved.muted === 'boolean') video.muted = saved.muted;
    store.setVolume(video.volume);
    store.setMuted(video.muted);

    const onPlayState = () => syncPlaying(video);
    const onWaiting = () => store.setBuffering(true);
    const onPlaying = () => {
      store.setBuffering(false);
      syncPlaying(video);
    };
    const onTime = () => {
      store.setProgress(video.currentTime || 0, Number.isFinite(video.duration) ? video.duration : 0);
      // Tempo andando = tocando: corrige qualquer evento `play` que a WebView não mandou.
      if (!video.paused !== store.isPlaying) syncPlaying(video);
    };
    const onVolume = () => {
      store.setVolume(video.volume);
      store.setMuted(video.muted);
      saveAudio(video);
    };
    const events: [string, () => void][] = [
      ['play', onPlayState],
      ['pause', onPlayState],
      ['ended', onPlayState],
      ['playing', onPlaying],
      ['waiting', onWaiting],
      ['timeupdate', onTime],
      ['volumechange', onVolume],
    ];
    for (const [name, handler] of events) video.addEventListener(name, handler);
    syncPlaying(video); // já estava tocando antes de ligar
    unbindNative = () => {
      for (const [name, handler] of events) video.removeEventListener(name, handler);
      unbindNative = null;
    };
  }

  watch(videoEl, (element) => {
    if (element) bindNative(element);
    else unbindNative?.();
  }, { immediate: true, flush: 'post' });

  onScopeDispose(() => {
    unbindNative?.();
    stopHeartbeat();
    store.reset();
  });

  return {
    play: () => void videoEl.value?.play().catch(() => undefined),
    pause: () => videoEl.value?.pause(),
    toggle: () => {
      const video = videoEl.value;
      if (!video) return;
      if (video.paused || video.ended) void video.play().catch(() => undefined);
      else video.pause();
    },
    seek: (seconds: number) => {
      if (videoEl.value) videoEl.value.currentTime = seconds;
    },
    seekToRatio: (ratio: number) => {
      const video = videoEl.value;
      if (!video || !video.duration) return;
      video.currentTime = Math.min(Math.max(ratio, 0), 1) * video.duration;
    },
    setVolume: (volume: number) => {
      if (videoEl.value) videoEl.value.volume = Math.min(Math.max(volume, 0), 1);
    },
    toggleMute: () => {
      if (videoEl.value) videoEl.value.muted = !videoEl.value.muted;
    },
    setSpeed: (rate: number) => {
      if (videoEl.value) videoEl.value.playbackRate = rate;
    },
    getBufferedRatio: () => {
      const media = videoEl.value;
      if (!media || !media.duration || media.buffered.length === 0) return 0;
      return Math.min(media.buffered.end(media.buffered.length - 1) / media.duration, 1);
    },
    isPlaying: computed(() => store.isPlaying),
    currentTime: computed(() => store.currentTime),
    duration: computed(() => store.duration),
  };
}
