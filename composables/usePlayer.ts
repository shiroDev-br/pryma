import { computed, toValue, watch, onScopeDispose } from 'vue';
import type PlyrInstance from 'plyr';
import { HEARTBEAT_INTERVAL_MS, SKIP_SECONDS } from '~/constants';
import { sendPlaybackHeartbeat } from '~/services/player.service';
import { usePlayerStore } from '~/stores/player';
import type { MaybeRefOrGetter } from 'vue';

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
  /** Pula ±segundos (±10 por padrão). */
  skip(deltaSeconds: number): void;
  /** Busca por razão 0..1 (clique na barra de progresso). */
  seekToRatio(ratio: number): void;
  setVolume(volume: number): void;
  toggleMute(): void;
  setSpeed(rate: number): void;
  getSpeed(): number;
  /** Fração já bufferizada (0..1). */
  getBufferedRatio(): number;
  toggleFullscreen(): void;
  getPlayer(): PlyrInstance | null;
  isPlaying: ComputedRef<boolean>;
  currentTime: ComputedRef<number>;
  duration: ComputedRef<number>;
  isFullscreen: ComputedRef<boolean>;
}

/**
 * Ponte entre Plyr e o player store.
 * A instância do Plyr vive aqui (fora do store, que só guarda estado serializável).
 * Sem UI nativa do Plyr (`controls: []`) — o HUD custom é da página.
 */
export function usePlayer(videoEl: Ref<HTMLVideoElement | null>, options: UsePlayerOptions): PlayerControls {
  const store = usePlayerStore();
  const mediaId = computed(() => toValue(options.mediaId));

  let player: PlyrInstance | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  function startHeartbeat(): void {
    if (options.heartbeat === false || heartbeatTimer) return;

    heartbeatTimer = setInterval(() => {
      if (!mediaId.value) return;

      sendPlaybackHeartbeat({
        mediaId: mediaId.value,
        sessionId,
        positionSec: Math.floor(player?.currentTime ?? 0),
      });
    }, HEARTBEAT_INTERVAL_MS);
  }

  function stopHeartbeat(): void {
    if (!heartbeatTimer) return;
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  /** Import dinâmico — Plyr toca `document` e quebraria o SSR. */
  async function setup(): Promise<void> {
    if (!videoEl.value || player) return;

    const { default: Plyr } = await import('plyr');
    if (!videoEl.value) return;

    player = new Plyr(videoEl.value, {
      controls: [],
      keyboard: { focused: false, global: true },
      seekTime: SKIP_SECONDS,
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      // Tela cheia é gerenciada pela página (raiz, com HUD junto do vídeo).
      fullscreen: { enabled: false },
      storage: { enabled: true, key: 'iptv-plyr' },
    });

    store.setMedia(mediaId.value);

    player.on('ready', () => {
      store.setVolume(player?.volume ?? 1);
      store.setMuted(player?.muted ?? false);
    });

    player.on('volumechange', () => {
      if (!player) return;
      store.setVolume(player.volume);
      store.setMuted(player.muted);
    });

    player.on('play', () => {
      store.setPlaying(true);
      startHeartbeat();
    });

    player.on('pause', () => {
      store.setPlaying(false);
      stopHeartbeat();
    });

    player.on('ended', () => {
      store.setPlaying(false);
      stopHeartbeat();
    });

    player.on('waiting', () => store.setBuffering(true));
    player.on('playing', () => store.setBuffering(false));

    player.on('timeupdate', () => {
      store.setProgress(player?.currentTime ?? 0, player?.duration ?? 0);
    });

    player.on('enterfullscreen', () => store.setFullscreen(true));
    player.on('exitfullscreen', () => store.setFullscreen(false));
  }

  function teardown(): void {
    stopHeartbeat();
    player?.destroy();
    player = null;
    store.reset();
  }

  watch(videoEl, (element) => {
    if (element) void setup();
  }, { immediate: true, flush: 'post' });

  onScopeDispose(teardown);

  return {
    play: () => player?.play(),
    pause: () => player?.pause(),
    toggle: () => (store.isPlaying ? player?.pause() : player?.play()),
    seek: (seconds: number) => {
      if (player) player.currentTime = seconds;
    },
    skip: (deltaSeconds: number) => {
      if (!player) return;
      const duration = player.duration || Number.POSITIVE_INFINITY;
      player.currentTime = Math.min(Math.max(player.currentTime + deltaSeconds, 0), duration);
    },
    seekToRatio: (ratio: number) => {
      if (!player || !player.duration) return;
      player.currentTime = Math.min(Math.max(ratio, 0), 1) * player.duration;
    },
    setVolume: (volume: number) => {
      if (player) player.volume = volume;
      store.setVolume(volume);
    },
    toggleMute: () => {
      if (!player) return;
      player.muted = !player.muted;
      store.setMuted(player.muted);
    },
    setSpeed: (rate: number) => {
      if (player) player.speed = rate;
    },
    getSpeed: () => player?.speed ?? 1,
    getBufferedRatio: () => {
      const media = videoEl.value;
      if (!media || !media.duration || media.buffered.length === 0) return 0;
      return Math.min(media.buffered.end(media.buffered.length - 1) / media.duration, 1);
    },
    toggleFullscreen: () => {
      if (!player) return;
      if (player.fullscreen.active) player.fullscreen.exit();
      else player.fullscreen.enter();
    },
    getPlayer: () => player,
    isPlaying: computed(() => store.isPlaying),
    currentTime: computed(() => store.currentTime),
    duration: computed(() => store.duration),
    isFullscreen: computed(() => store.isFullscreen),
  };
}
