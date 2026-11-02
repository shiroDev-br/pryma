// Só tipos — as bibliotecas entram por import dinâmico (utils/stream).
import type Hls from 'hls.js';
import type mpegts from 'mpegts.js';
import { canPlayNativeHls, loadHls, loadMpegts, streamKindOf } from '~/utils/stream';
import type { HlsCtor } from '~/utils/stream';
import { releaseVideo } from '~/utils/video';

/** Log só em dev: a URL do stream leva usuário/senha do provedor (Xtream) e,
 *  no APK, console vai pro logcat — qualquer um com adb lê. */
function dbg(...args: unknown[]): void {
  if (import.meta.dev) console.log(...args);
}

/** Erros fatais de rede: novas tentativas com espera crescente (1s, 2s, 4s) — sem
 *  isso o `startLoad()` imediato virava um loop de requisições num link caído. */
const MAX_NETWORK_RETRIES = 3;
/** Erros de mídia: `recoverMediaError` no máximo isso, depois cai pro mpegts. */
const MAX_MEDIA_RECOVERIES = 2;

export interface StreamEngine {
  /** Anexa stream ao <video> — detecta HLS, MPEG-TS ou arquivo direto. */
  attachStream(video: HTMLVideoElement, url: string, protocol: string): Promise<void>;
  /** Destrói as instâncias ativas — chamado na troca de fonte e ao desmontar. */
  destroyStreams(): void;
  /** true se já há stream ligado ou ligando (hls.js usa MediaSource e não define
   *  `src`, e o import do hls.js é assíncrono — `src` vazio não quer dizer livre). */
  isAttached(): boolean;
}

/**
 * Motor de stream da tela de player: hls.js + mpegts.js com cadeia de
 * fallback (manifest inválido → mpegts, fatal → mpegts, 5s sem dados → mpegts).
 * O estado (instâncias + geração anti-attach-obsoleto) é por instância do
 * composable — uma tela de player, um motor.
 */
export interface StreamEngineOptions {
  /** O motor desistiu (formato que a TV não decodifica, rede caída de vez) — a tela mostra o erro. */
  onFatal?: (message: string) => void;
}

export function useStreamEngine(options: StreamEngineOptions = {}): StreamEngine {
  let hlsInstance: Hls | null = null;
  let mpegtsInstance: mpegts.Player | null = null;
  /** <video> com fonte direta (mp4/webm) — precisa ser esvaziado pra soltar a conexão. */
  let directVideo: HTMLVideoElement | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  /** URL ligada (ou ligando) — evita o segundo attach durante o import do hls.js. */
  let activeUrl: string | null = null;

  /** Geração do stream — muda durante `await import()` pra abortar attach obsoleto. */
  let streamGeneration = 0;

  function destroyStreams(): void {
    streamGeneration += 1;
    activeUrl = null;
    clearTimeout(retryTimer);
    // Arquivo direto: só tirar o <video> da tela não fecha o download — a conexão
    // (e o decoder) ficava viva até o GC e estourava o limite de conexões do provedor.
    releaseVideo(directVideo);
    directVideo = null;
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
    activeUrl = url;

    const kind = streamKindOf(url, protocol);
    dbg('[Player] attachStream:', { protocol, kind });

    if (kind === 'file') {
      attachDirect(video, url);
      return;
    }

    if (kind === 'hls') {
      const generation = streamGeneration;
      const Hls = await loadHls();
      if (generation !== streamGeneration) return; // tela trocou durante o import

      if (Hls.isSupported()) {
        dbg('[Player] Using hls.js');
        attachHls(video, url, Hls);
      } else if (canPlayNativeHls(video)) {
        dbg('[Player] Using native HLS (Safari)');
        attachDirect(video, url);
      } else {
        dbg('[Player] Using mpegts.js (no HLS support)');
        await attachMpegTs(video, url);
      }
      return;
    }

    // Live stream sem extensão (.ts implícito) → MPEG-TS
    dbg('[Player] Live stream, using mpegts.js');
    await attachMpegTs(video, url);
  }

  function attachDirect(video: HTMLVideoElement, url: string): void {
    directVideo = video;
    video.src = url;
    video.play().catch((e: Error) => console.warn('[Player] play() blocked:', e));
  }

  function attachHls(video: HTMLVideoElement, url: string, Hls: HlsCtor): void {
    hlsInstance = new Hls({
      enableWorker: true,
      // Low-latency só serve pra LL-HLS (IPTV não usa): mais requisições e CPU à toa.
      lowLatencyMode: false,
      // Padrão do hls.js guarda TODO o vídeo já assistido (backBufferLength infinito)
      // e até 60 MB à frente — em TV com ~1 GB de RAM, sessão longa travava/fechava o app.
      // Fire Stick (1 GB, 1080p): 30 s para trás em 4K já eram ~100 MB presos no
      // SourceBuffer e o player engasgava depois de um tempo assistindo.
      backBufferLength: 10,
      maxBufferLength: 20,
      maxMaxBufferLength: 30,
      maxBufferSize: 30 * 1000 * 1000,
      // Não baixa/decodifica qualidade acima do tamanho da tela (4K num stick
      // 1080p só gasta memória e CPU). Só age quando o stream tem várias versões.
      capLevelToPlayerSize: true,
    });
    let networkRetries = 0;
    let mediaRecoveries = 0;
    /** Playlist lida: é HLS de verdade — o mpegts não tem como tocar isto. */
    let manifestParsed = false;
    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(video);

    // Voltou a baixar: zera as tentativas (queda isolada numa sessão longa não acumula).
    hlsInstance.on(Hls.Events.FRAG_LOADED, () => {
      networkRetries = 0;
    });

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      manifestParsed = true;
      dbg('[HLS] Manifest parsed, playing...');
      video.play().catch((e: Error) => console.warn('[HLS] play() blocked:', e));
    });

    hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
      // Não-fatais (bufferStalled etc.) chegam em rajada — no APK cada log é escrita no logcat.
      if (data.fatal || import.meta.dev) {
        console.error('[HLS] Error:', { type: data.type, details: data.details, fatal: data.fatal });
      }

      if (data.details === 'manifestParsingError' || data.details === 'manifestLoadError') {
        dbg('[HLS] Not valid HLS, trying mpegts.js...');
        destroyStreams();
        void attachMpegTs(video, url);
        return;
      }

      // Codec que esta TV não decodifica (ex.: H265 sem suporte): nenhuma tentativa resolve.
      if (data.details === 'manifestIncompatibleCodecsError') {
        destroyStreams();
        options.onFatal?.('Esta TV não reproduz o formato desta transmissão. Tente outra qualidade.');
        return;
      }

      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (networkRetries >= MAX_NETWORK_RETRIES) {
              destroyStreams();
              options.onFatal?.('A conexão com a transmissão caiu.');
              break;
            }
            clearTimeout(retryTimer);
            retryTimer = setTimeout(() => hlsInstance?.startLoad(), 1000 * 2 ** networkRetries);
            networkRetries += 1;
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            // O mpegts também não toca uma playlist HLS — desiste e avisa em vez de insistir.
            if (mediaRecoveries >= MAX_MEDIA_RECOVERIES) {
              destroyStreams();
              options.onFatal?.('Não foi possível reproduzir esta transmissão.');
              break;
            }
            mediaRecoveries += 1;
            hlsInstance?.recoverMediaError();
            break;
          default:
            destroyStreams();
            void attachMpegTs(video, url);
            break;
        }
      }
    });

    // Timeout: playlist nem chegou em 5s → tenta como MPEG-TS. Com a playlist
    // lida, o mpegts não ajuda (não lê HLS): o hls.js segue com as tentativas dele.
    const timeout = setTimeout(() => {
      if (hlsInstance && !manifestParsed && !video.duration) {
        dbg('[HLS] Timeout (5s), trying mpegts.js...');
        destroyStreams();
        void attachMpegTs(video, url);
      }
    }, 5000);

    hlsInstance.on(Hls.Events.DESTROYING, () => clearTimeout(timeout));
  }

  async function attachMpegTs(video: HTMLVideoElement, url: string): Promise<void> {
    dbg('[Player] Using mpegts.js');
    activeUrl = url;

    const generation = streamGeneration;
    const mpegts = await loadMpegts();
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
        // Sem isto o buffer cresce a sessão inteira e estoura a memória da TV.
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
      // `errorInfo` pode trazer a URL (com credenciais do provedor) — só em dev.
      console.error('[mpegts] Error:', { errorType, errorDetail, ...(import.meta.dev ? { errorInfo } : {}) });
      // Sem destruir, o mpegts seguia rodando quebrado (exceções em loop no console).
      if (generation !== streamGeneration) return;
      destroyStreams();
      options.onFatal?.('Não foi possível reproduzir esta transmissão.');
    });

    mpegtsInstance.on(mpegts.Events.MEDIA_INFO, (info) => {
      dbg('[mpegts] Media info:', { duration: info.duration, hasAudio: info.hasAudio, hasVideo: info.hasVideo });
    });

    mpegtsInstance.on(mpegts.Events.METADATA_ARRIVED, () => {
      dbg('[mpegts] Metadata arrived, playing...');
      video.play().catch((e: Error) => console.warn('[mpegts] play() blocked:', e));
    });
  }

  return { attachStream, destroyStreams, isAttached: () => activeUrl !== null };
}
