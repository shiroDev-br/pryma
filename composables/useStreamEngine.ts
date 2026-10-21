// hls.js só entra na tela de player — import estático puxava ~600 KB pro
// entry e travava o boot em chip fraco. Type-only aqui, runtime é dinâmico.
import type Hls from 'hls.js';
// mpegts.js toca `self` no escopo do módulo — quebra SSR. Import dinâmico só no cliente.
import type mpegts from 'mpegts.js';

type HlsCtor = typeof import('hls.js').default;

/** Chunk do hls.js — cacheado por módulo, baixado uma vez por sessão. */
let hlsChunk: Promise<HlsCtor> | null = null;
function loadHls(): Promise<HlsCtor> {
  if (!hlsChunk) hlsChunk = import('hls.js').then((m) => m.default);
  return hlsChunk;
}

export interface StreamEngine {
  /** Anexa stream ao <video> — detecta HLS, MPEG-TS ou arquivo direto. */
  attachStream(video: HTMLVideoElement, url: string, protocol: string): Promise<void>;
  /** Destrói as instâncias ativas — chamado na troca de fonte e ao desmontar. */
  destroyStreams(): void;
  /** true se o hls.js já está plugado (ele usa MediaSource e não define `src`). */
  hasHls(): boolean;
}

/**
 * Motor de stream da tela de player: hls.js + mpegts.js com cadeia de
 * fallback (manifest inválido → mpegts, fatal → mpegts, 5s sem dados → mpegts).
 * O estado (instâncias + geração anti-attach-obsoleto) é por instância do
 * composable — uma tela de player, um motor.
 */
export function useStreamEngine(): StreamEngine {
  let hlsInstance: Hls | null = null;
  let mpegtsInstance: mpegts.Player | null = null;

  /** Geração do stream — muda durante `await import()` pra abortar attach obsoleto. */
  let streamGeneration = 0;

  function destroyStreams(): void {
    streamGeneration += 1;
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    if (mpegtsInstance) {
      mpegtsInstance.destroy();
      mpegtsInstance = null;
    }
  }

  async function attachStream(video: HTMLVideoElement, url: string, protocol: string): Promise<void> {
    destroyStreams();

    const hasM3u8 = url.includes('.m3u8') || url.includes('m3u8');
    const hasVideoExt = /\.(mp4|webm|mkv|ogv)(\?|#|$)/i.test(url);

    console.log('[Player] attachStream:', { url, protocol, hasM3u8, hasVideoExt });

    // Arquivo direto (mp4, webm) → src direto
    if (hasVideoExt || protocol === 'file') {
      console.log('[Player] Using direct file src');
      video.src = url;
      video.play().catch((e: Error) => console.warn('[Player] play() blocked:', e));
      return;
    }

    // URL com .m3u8 → HLS (chunk do hls.js baixado só aqui)
    if (hasM3u8) {
      const generation = streamGeneration;
      const Hls = await loadHls();
      if (generation !== streamGeneration) return; // tela trocou durante o import

      if (Hls.isSupported()) {
        console.log('[Player] Using hls.js');
        attachHls(video, url, Hls);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('[Player] Using native HLS (Safari)');
        video.src = url;
        video.play().catch((e: Error) => console.warn('[Player] play() blocked:', e));
      } else {
        console.log('[Player] Using mpegts.js (no HLS support)');
        await attachMpegTs(video, url);
      }
      return;
    }

    // Live stream sem extensão (.ts implícito) → MPEG-TS
    console.log('[Player] Live stream, using mpegts.js');
    await attachMpegTs(video, url);
  }

  function attachHls(video: HTMLVideoElement, url: string, Hls: HlsCtor): void {
    hlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
    });
    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(video);

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('[HLS] Manifest parsed, playing...');
      video.play().catch((e: Error) => console.warn('[HLS] play() blocked:', e));
    });

    hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
      console.error('[HLS] Error:', { type: data.type, details: data.details, fatal: data.fatal });

      if (data.details === 'manifestParsingError' || data.details === 'manifestLoadError') {
        console.log('[HLS] Not valid HLS, trying mpegts.js...');
        destroyStreams();
        void attachMpegTs(video, url);
        return;
      }

      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hlsInstance?.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hlsInstance?.recoverMediaError();
            break;
          default:
            destroyStreams();
            void attachMpegTs(video, url);
            break;
        }
      }
    });

    // Timeout: se não carregar em 5s, fallback pra mpegts
    const timeout = setTimeout(() => {
      if (hlsInstance && !video.duration) {
        console.log('[HLS] Timeout (5s), trying mpegts.js...');
        destroyStreams();
        void attachMpegTs(video, url);
      }
    }, 5000);

    hlsInstance.on(Hls.Events.DESTROYING, () => clearTimeout(timeout));
  }

  async function attachMpegTs(video: HTMLVideoElement, url: string): Promise<void> {
    console.log('[Player] Using mpegts.js for:', url);

    const generation = streamGeneration;
    const mpegts = (await import('mpegts.js')).default;
    if (generation !== streamGeneration) return; // tela trocou durante o import

    mpegtsInstance = mpegts.createPlayer(
      { type: 'mse', isLive: true, url },
      {
        enableWorker: true,
        // Buffer menor = carrega mais rápido
        liveBufferLatencyChasing: false,
        liveSyncTargetLatency: 1.5,
        liveSyncMaxLatency: 4,
        // Stash buffer menor pra início rápido
        stashInitialSize: 128,
        // Auto soberwrite buffer antigo
        autoCleanupSourceBuffer: true,
      },
    );

    mpegtsInstance.attachMediaElement(video);
    mpegtsInstance.load();

    // Tenta play imediatamente
    const playResult = mpegtsInstance.play();
    if (playResult instanceof Promise) {
      playResult.catch((e: Error) => console.warn('[mpegts] play() failed:', e));
    }

    mpegtsInstance.on(mpegts.Events.ERROR, (errorType, errorDetail, errorInfo) => {
      console.error('[mpegts] Error:', { errorType, errorDetail, errorInfo });
    });

    mpegtsInstance.on(mpegts.Events.MEDIA_INFO, (info) => {
      console.log('[mpegts] Media info:', { duration: info.duration, hasAudio: info.hasAudio, hasVideo: info.hasVideo });
    });

    mpegtsInstance.on(mpegts.Events.METADATA_ARRIVED, () => {
      console.log('[mpegts] Metadata arrived, playing...');
      video.play().catch((e: Error) => console.warn('[mpegts] play() blocked:', e));
    });
  }

  return { attachStream, destroyStreams, hasHls: () => hlsInstance !== null };
}
