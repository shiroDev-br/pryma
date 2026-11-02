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
  /** Atalhos globais do Plyr (espaço/k pausa, ←/→ ±10s, 0–9 pula). Desligar em
   *  transmissão ao vivo: lá não há o que pausar nem pular. Padrão: ligado. */
  keyboard?: MaybeRefOrGetter<boolean>;
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
    syncKeyboard();

    player.on('ready', () => {
      store.setVolume(player?.volume ?? 1);
      store.setMuted(player?.muted ?? false);
    });

    player.on('volumechange', () => {
      if (!player) return;
      store.setVolume(player.volume);
      store.setMuted(player.muted);
    });

    // Tocando/pausado/progresso vêm do <video> (bindNative) — não do Plyr.
    player.on('enterfullscreen', () => store.setFullscreen(true));
    player.on('exitfullscreen', () => store.setFullscreen(false));
  }

  /* ── Estado de reprodução direto do <video> ──────────────────────────────
   * O Plyr chega por import dinâmico; o stream é ligado em paralelo. Quando o
   * vídeo dava `play` antes do Plyr existir, o evento se perdia: a tela achava
   * que estava pausado e o card de pausa ficava por cima do filme rodando, sem
   * sumir nunca. Os eventos nativos entram junto com o elemento, e o
   * `timeupdate` corrige qualquer evento perdido (tempo andando = tocando). */

  let unbindNative: (() => void) | null = null;

  function syncPlaying(video: HTMLVideoElement): void {
    const playing = !video.paused && !video.ended;
    if (playing !== store.isPlaying) store.setPlaying(playing);
    if (playing) startHeartbeat();
    else stopHeartbeat();
  }

  function bindNative(video: HTMLVideoElement): void {
    unbindNative?.();
    const onPlayState = () => syncPlaying(video);
    const onWaiting = () => store.setBuffering(true);
    const onPlaying = () => {
      store.setBuffering(false);
      syncPlaying(video);
    };
    const onTime = () => {
      store.setProgress(video.currentTime || 0, Number.isFinite(video.duration) ? video.duration : 0);
      if (!video.paused !== store.isPlaying) syncPlaying(video);
    };
    const events: [string, () => void][] = [
      ['play', onPlayState],
      ['pause', onPlayState],
      ['ended', onPlayState],
      ['playing', onPlaying],
      ['waiting', onWaiting],
      ['timeupdate', onTime],
    ];
    for (const [name, handler] of events) video.addEventListener(name, handler);
    syncPlaying(video); // já estava tocando antes de ligar
    unbindNative = () => {
      for (const [name, handler] of events) video.removeEventListener(name, handler);
      unbindNative = null;
    };
  }

  /** Estado atual do listener global de teclado do Plyr (liga ao criar). */
  let keyboardOn = true;

  /** Liga/desliga o listener global (`listeners.global` é interno do Plyr: não há
   *  API pública pra isso). Guarda o estado — ligar duas vezes duplicaria o listener. */
  function syncKeyboard(): void {
    const wanted = options.keyboard === undefined ? true : toValue(options.keyboard);
    const listeners = (player as unknown as { listeners?: { global?: (toggle: boolean) => void } } | null)?.listeners;
    if (!listeners?.global || wanted === keyboardOn) return;
    listeners.global(wanted);
    keyboardOn = wanted;
  }

  watch(() => (options.keyboard === undefined ? true : toValue(options.keyboard)), syncKeyboard);

  function teardown(): void {
    unbindNative?.();
    stopHeartbeat();
    player?.destroy();
    player = null;
    keyboardOn = true;
    store.reset();
  }

  watch(videoEl, (element) => {
    if (element) {
      bindNative(element);
      void setup();
    } else {
      unbindNative?.();
    }
  }, { immediate: true, flush: 'post' });

  onScopeDispose(teardown);

  return {
    // Direto no <video>: funciona mesmo antes do Plyr terminar de carregar.
    play: () => void videoEl.value?.play().catch(() => undefined),
    pause: () => videoEl.value?.pause(),
    toggle: () => {
      const video = videoEl.value;
      if (!video) return;
      if (video.paused || video.ended) void video.play().catch(() => undefined);
      else video.pause();
    },
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
