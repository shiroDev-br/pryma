import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Ref } from 'vue';
// Só tipos — hls.js/mpegts.js entram por import dinâmico (mesmo chunk do player).
import type Hls from 'hls.js';
import type mpegts from 'mpegts.js';
import { canPlayNativeHls, loadHls, loadMpegts, streamKindOf } from '~/utils/stream';
import type { HlsCtor } from '~/utils/stream';
import { releaseVideo } from '~/utils/video';
import { usePlayback } from '~/composables/usePlayback';
import { useLiveFailover } from '~/composables/useLiveFailover';
import type { LiveSource } from '~/composables/useLiveFailover';
import type { MediaSummary } from '~/types';

/** Espera curta antes de abrir o stream. O canal só muda com OK (a seta não
 *  troca a prévia); a espera absorve trocas rápidas de versão (FHD/HD…) e dá
 *  tempo do fundo animado soltar o decodificador (Fire Stick/TV box têm um só). */
const DWELL_MS = 400;

/** Prévia em aparelho fraco (Fire Stick): o 1º quadro e as travadas demoram mais
 *  que no player — com o prazo do player ela trocava de fonte à toa até "Sem sinal". */
const PREVIEW_STALL_MS = 8000;
const PREVIEW_START_MS = 15_000;

export interface UseLivePreviewOptions {
  /** <video> da prévia — um só, reaproveitado entre canais. */
  videoEl: Ref<HTMLVideoElement | null>;
  /** Canal em foco (null = nada tocando). */
  media: () => MediaSummary | null;
  /** Todas as entradas do mesmo canal (melhor → pior) — fontes do failover. */
  alternatives: Ref<MediaSummary[]>;
  /** false = versão escolhida à mão (chips FHD/HD/SD): não troca pela fonte lembrada. */
  useRemembered?: () => boolean;
  /** false pausa e derruba o stream (ex.: saindo pro player). */
  enabled: () => boolean;
  /** false = com som (prévia expandida em tela cheia). Padrão: mudo. */
  muted?: () => boolean;
}

export type LivePreviewState = 'idle' | 'waiting' | 'loading' | 'playing' | 'failed';

export interface UseLivePreviewReturn {
  /** true quando já tem imagem rodando — a prévia faz o fade da arte pro vídeo. */
  playing: Ref<boolean>;
  /** Estado detalhado (diagnóstico) e o motivo da última falha. */
  state: Ref<LivePreviewState>;
  reason: Ref<string>;
  /** Handlers do <video> — ligados no template pra sobreviver a v-if/troca de elemento. */
  onPlaying: () => void;
  onTimeUpdate: () => void;
  onVideoError: () => void;
  /** Derruba o stream agora (ex.: clique em "Assistir", pra não ter 2 conexões abertas). */
  stop: () => void;
  /** Aviso do failover ("Reconectando…", "Trocando de fonte…"). */
  notice: Ref<string | null>;
  /** Versão que está tocando de fato (o failover pode ter trocado). */
  current: Ref<LiveSource | null>;
}

/**
 * Prévia ao vivo, leve, da coluna da direita da TV ao vivo.
 *
 * Diferenças do player de verdade (useStreamEngine), de propósito:
 *  - mudo, sem controles, sem áudio/PiP; um único decoder por vez;
 *  - só abre o canal escolhido com OK e cancela tudo ao trocar;
 *  - HLS começa na menor qualidade, buffer curto (~12s) e sem back-buffer;
 *  - mpegts sem stash buffer e com limpeza agressiva do buffer;
 *  - travou 5 s ou deu erro: o failover reconecta e troca de fonte (outro
 *    formato, outra versão do canal); esgotou, fica a arte do canal;
 *  - derruba o stream ao esconder a aba, ao sair da tela e ao ir pro player
 *    (provedores IPTV costumam limitar conexões simultâneas).
 */
export function useLivePreview(options: UseLivePreviewOptions): UseLivePreviewReturn {
  const { videoEl, enabled } = options;
  const mediaId = (): string | null => options.media()?.id ?? null;

  const playing = ref(false);
  const state = ref<LivePreviewState>('idle');
  const reason = ref('');
  const playback = usePlayback();

  function dbg(message: string, extra?: unknown): void {
    if (import.meta.dev) console.info('[LivePreview]', message, extra ?? '');
  }

  let hls: Hls | null = null;
  let ts: mpegts.Player | null = null;
  /** Muda a cada teardown — descarta attach/await obsoleto. */
  let generation = 0;
  let dwellTimer: ReturnType<typeof setTimeout> | undefined;

  const failover = useLiveFailover({
    videoEl,
    media: options.media,
    alternatives: options.alternatives,
    attach: (source) => attachSource(source),
    detach: teardownEngine,
    useRemembered: options.useRemembered,
    stallMs: PREVIEW_STALL_MS,
    startMs: PREVIEW_START_MS,
  });

  /** Derruba só o stream (conexão + decoder) — o failover chama entre uma fonte e outra. */
  function teardownEngine(): void {
    generation += 1;
    if (hls) {
      hls.destroy();
      hls = null;
    }
    if (ts) {
      try {
        ts.pause();
        ts.unload();
        ts.detachMediaElement();
      } catch {
        /* já desmontado */
      }
      ts.destroy();
      ts = null;
    }

    releaseVideo(videoEl.value);
    playing.value = false;
  }

  function teardown(): void {
    clearTimeout(dwellTimer);
    playback.reset(); // aborta o request de sessão em voo
    failover.stop();
    teardownEngine();
    state.value = 'idle';
  }

  /** Fonte falhou: o failover decide (reconectar / outra fonte / desistir). */
  function fail(why: string, extra?: unknown): void {
    dbg(`falhou: ${why}`, extra);
    reason.value = why;
    failover.fail();
  }

  // Esgotou todas as fontes: fica só a arte do canal.
  watch(failover.exhausted, (value) => {
    if (value) state.value = 'failed';
  });

  function saveDataOn(): boolean {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    return connection?.saveData === true;
  }

  function schedule(): void {
    teardown();
    reason.value = '';
    const id = mediaId();
    if (!id || !enabled() || saveDataOn()) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    const gen = generation;
    state.value = 'waiting';
    dwellTimer = setTimeout(() => void start(id, gen), DWELL_MS);
  }

  async function start(id: string, gen: number): Promise<void> {
    state.value = 'loading';
    const session = await playback.load(id);
    if (gen !== generation) return;
    if (!session) {
      dbg('sem sessão de playback', playback.error.value);
      state.value = 'failed';
      reason.value = 'sem sessão de playback';
      return;
    }
    await failover.start(session);
  }

  /** Liga uma fonte (chamado pelo failover, já com o stream anterior derrubado). */
  async function attachSource(source: LiveSource): Promise<void> {
    const gen = generation;
    const video = videoEl.value;
    if (!video) return;
    state.value = 'loading';
    // Autoplay só é permitido mudo; garante pelas duas vias (atributo e propriedade).
    // Expandida, a prévia toca com som (o OK do usuário já é o gesto exigido).
    const muted = options.muted?.() ?? true;
    video.defaultMuted = muted;
    video.muted = muted;

    const { url, protocol } = source;
    dbg('abrindo', { id: source.mediaId, protocol, url });
    const kind = streamKindOf(url, protocol);

    if (kind === 'file') {
      video.src = url;
      void video.play().catch(() => undefined);
      return;
    }

    if (kind === 'hls') {
      const Ctor = await loadHls();
      if (gen !== generation) return;

      if (Ctor.isSupported()) {
        attachHls(video, url, Ctor, gen);
      } else if (canPlayNativeHls(video)) {
        video.src = url;
        void video.play().catch(() => undefined);
      } else {
        await attachMpegTs(video, url, gen);
      }
      return;
    }

    await attachMpegTs(video, url, gen);
  }

  function attachHls(video: HTMLVideoElement, url: string, Ctor: HlsCtor, gen: number): void {
    const instance = new Ctor({
      enableWorker: true,
      lowLatencyMode: false,
      startLevel: 0, // menor qualidade primeiro — a prévia é pequena
      capLevelToPlayerSize: true,
      // Buffer curto mas não apertado: com 6 s, rede/CPU lentas (Fire Stick)
      // esvaziavam o buffer e o failover trocava de fonte sem motivo.
      maxBufferLength: 12,
      maxMaxBufferLength: 20,
      maxBufferSize: 20 * 1000 * 1000,
      backBufferLength: 0,
      liveSyncDurationCount: 3,
      manifestLoadingMaxRetry: 2,
      levelLoadingMaxRetry: 2,
      fragLoadingMaxRetry: 3,
    });
    hls = instance;

    instance.loadSource(url);
    instance.attachMedia(video);
    instance.on(Ctor.Events.MANIFEST_PARSED, () => {
      void video.play().catch(() => undefined);
    });
    instance.on(Ctor.Events.ERROR, (_event, data) => {
      if (gen !== generation) return;
      // Lista que não é HLS de verdade → tenta MPEG-TS uma única vez.
      if (data.details === 'manifestParsingError' || data.details === 'manifestLoadError') {
        teardownEngineOnly();
        void attachMpegTs(video, url, gen);
        return;
      }
      if (data.fatal) fail(`hls fatal: ${data.details}`, data);
    });
  }

  /** Troca de motor sem invalidar a geração (o teardown completo cancelaria o fallback). */
  function teardownEngineOnly(): void {
    if (hls) {
      hls.destroy();
      hls = null;
    }
  }

  async function attachMpegTs(video: HTMLVideoElement, url: string, gen: number): Promise<void> {
    const mpegtsLib = await loadMpegts();
    if (gen !== generation) return;
    if (!mpegtsLib.isSupported()) {
      fail('mpegts.js sem suporte neste navegador');
      return;
    }

    const player = mpegtsLib.createPlayer(
      { type: 'mse', isLive: true, url },
      {
        enableWorker: true,
        // Stash ligado: sem ele, CPU fraca recebia pedaços pequenos demais e engasgava.
        enableStashBuffer: true,
        stashInitialSize: 384 * 1024,
        liveBufferLatencyChasing: false,
        autoCleanupSourceBuffer: true,
        autoCleanupMaxBackwardDuration: 12,
        autoCleanupMinBackwardDuration: 8,
      },
    );
    ts = player;

    player.on(mpegtsLib.Events.ERROR, (type, detail) => {
      if (gen === generation) fail(`mpegts erro: ${type}/${detail}`);
    });
    player.attachMediaElement(video);
    player.load();
    const result = player.play();
    if (result instanceof Promise) result.catch(() => undefined);
  }

  function onPlaying(): void {
    playing.value = true;
    state.value = 'playing';
    dbg('tocando');
  }

  /** Algumas WebViews de TV não disparam `playing` com MSE — currentTime andando basta. */
  function onTimeUpdate(): void {
    if (playing.value) return;
    const video = videoEl.value;
    if (video && video.currentTime > 0) onPlaying();
  }

  function onVideoError(): void {
    // `video.load()` do próprio teardown (inclusive entre fontes do failover) pode
    // gerar erro residual — só conta se há stream ligado agora.
    const attached = hls !== null || ts !== null || !!videoEl.value?.getAttribute('src');
    if (attached && (state.value === 'loading' || state.value === 'playing')) {
      const code = videoEl.value?.error?.code;
      fail(`erro do <video>${code ? ` (code ${code})` : ''}`);
    }
  }

  function onVisibility(): void {
    if (document.hidden) teardown();
    else schedule();
  }

  // Trocou o canal (ou pausou/liberou): recomeça do zero com a espera.
  watch([mediaId, enabled], schedule);

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility);
    schedule();
  });

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    teardown();
  });

  return {
    playing,
    state,
    reason,
    onPlaying,
    onTimeUpdate,
    onVideoError,
    stop: teardown,
    notice: failover.notice,
    current: failover.current,
  };
}
