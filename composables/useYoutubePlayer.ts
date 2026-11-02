/* eslint-disable @typescript-eslint/no-explicit-any */
// A IFrame API do YouTube não tem tipos oficiais — usamos `any` controlado.

export interface YoutubePlayerOptions {
  /** Disparado quando o vídeo atual termina (ENDED). */
  onEnded?: () => void;
  /** Disparado quando o player está pronto pra tocar. */
  onReady?: () => void;
  /** Disparado quando o player muda de estado (1=playing, 2=paused, 0=ended). */
  onStateChange?: (state: number) => void;
  /** Disparado quando o vídeo dá erro (id inválido, embed bloqueado etc). */
  onError?: (code: number) => void;
  /** Disparado quando a API do YouTube falha ao carregar. */
  onApiError?: (error: Error) => void;
}

export type YoutubeSource = string | { playlistId: string } | { videoIds: string[] };

export interface YoutubePlayerHandle {
  /** Monta o player dentro do elemento alvo (client-only, uma vez).
   *  `source` = id de vídeo, `{ playlistId }` (playlist inteira do YouTube) ou
   *  `{ videoIds }` (fila própria — o primeiro toca, os outros seguem). */
  mount(target: HTMLElement, source: YoutubeSource): Promise<void>;
  /** Troca o vídeo atual (autoplay). */
  load(videoId: string): void;
  pause(): void;
  play(): void;
  /** Playlist: próximo / anterior / pula para um índice. */
  next(): void;
  previous(): void;
  playAt(index: number): void;
  /** Título do vídeo atual (vazio até o player carregar o vídeo). */
  currentTitle(): string;
  /** Playlist: posição atual (0-based) e total de vídeos (0 se não for playlist). */
  playlistPosition(): { index: number; total: number };
  /** Destrói o player e limpa o script da API. */
  destroy(): void;
  /** Indica se a API do YouTube carregou com sucesso. */
  isApiReady: () => boolean;
}

let apiPromise: Promise<any> | null = null;
let apiLoadError: Error | null = null;

/** WebView de TV às vezes nunca dispara onload/onerror nem onReady — sem
 *  limite, a tela da MTV fica carregando pra sempre, sem erro nem retry. */
const API_TIMEOUT_MS = 15000;
const READY_TIMEOUT_MS = 20000;

function ensureApi(): Promise<any> {
  if (import.meta.server) {
    return Promise.reject(new Error('YouTube IFrame API indisponível no servidor.'));
  }
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve(w.YT);

  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previous = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        clearTimeout(timer);
        apiLoadError = null;
        if (typeof previous === 'function') previous();
        resolve(w.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      const fail = (message: string): void => {
        clearTimeout(timer);
        apiPromise = null;
        script.remove(); // o retry injeta um script novo
        apiLoadError = new Error(message);
        reject(apiLoadError);
      };
      const timer = setTimeout(() => fail('A IFrame API do YouTube não respondeu.'), API_TIMEOUT_MS);
      script.onerror = () => fail('Falha ao carregar a IFrame API do YouTube.');
      document.head.appendChild(script);
    });
  }
  return apiPromise.catch((err) => {
    apiLoadError = err;
    throw err;
  });
}

/**
 * Player YouTube via IFrame API — lazy load, singleton promise.
 * Necessário p/ ENDED→próximo, loadVideoById e shuffle (não dá p/ iframe simples).
 */
export function useYoutubePlayer(options: YoutubePlayerOptions): YoutubePlayerHandle {
  let player: any = null;
  let destroyed = false;

  async function mount(target: HTMLElement, source: YoutubeSource): Promise<void> {
    // Playlist: a chave `videoId` não pode existir (nem undefined) — o YouTube
    // a lê e recusa com "Invalid video id" em vez de carregar a lista.
    let videoVars: Record<string, string> = {};
    let playlistVars: Record<string, string> = {};
    if (typeof source === 'string') {
      videoVars = { videoId: source };
    } else if ('playlistId' in source) {
      playlistVars = { listType: 'playlist', list: source.playlistId };
    } else {
      // Com `playlist`, o YouTube começa pelo 1º item dela e ignora o `videoId`
      // — então a fila inteira vai ali, com o vídeo escolhido na frente.
      // (A URL do embed tem limite: corta em 150.)
      const ids = source.videoIds.slice(0, 150);
      videoVars = { videoId: ids[0] };
      if (ids.length > 1) playlistVars = { playlist: ids.join(',') };
    }
    try {
      const YT = await ensureApi();
      if (destroyed) return;

      // Retry: derruba o player anterior. O YT.Player substitui o nó alvo pelo
      // iframe — por isso monta num filho novo, e `target` continua no DOM.
      player?.destroy();
      player = null;
      target.innerHTML = '';
      const host = document.createElement('div');
      target.appendChild(host);

      await new Promise<void>((resolve, reject) => {
        const readyTimer = setTimeout(
          () => reject(new Error('O player do YouTube não iniciou.')),
          READY_TIMEOUT_MS,
        );
        player = new YT.Player(host, {
          ...videoVars,
          playerVars: {
            autoplay: 1,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            ...playlistVars,
            // Identifica o embed (WebView do APK) — sem origem o YouTube pode recusar.
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              clearTimeout(readyTimer);
              options.onReady?.();
              resolve();
            },
            onStateChange: (event: any) => {
              options.onStateChange?.(event.data as number);
              if (event.data === YT.PlayerState.ENDED) options.onEnded?.();
            },
            onError: (event: any) => options.onError?.(event.data as number),
          },
        });
      });
    } catch (err) {
      player?.destroy();
      player = null;
      if (!destroyed) {
        options.onApiError?.(err as Error);
      }
      throw err;
    }
  }

  function load(videoId: string): void {
    player?.loadVideoById(videoId);
  }

  function pause(): void {
    player?.pauseVideo();
  }

  function play(): void {
    player?.playVideo();
  }

  function next(): void {
    player?.nextVideo?.();
  }

  function previous(): void {
    player?.previousVideo?.();
  }

  function playAt(index: number): void {
    player?.playVideoAt?.(index);
  }

  function currentTitle(): string {
    const data = player?.getVideoData?.();
    return typeof data?.title === 'string' ? data.title : '';
  }

  function playlistPosition(): { index: number; total: number } {
    const list = player?.getPlaylist?.();
    const index = player?.getPlaylistIndex?.();
    return {
      index: typeof index === 'number' && index >= 0 ? index : 0,
      total: Array.isArray(list) ? list.length : 0,
    };
  }

  function destroy(): void {
    destroyed = true;
    player?.destroy();
    player = null;
  }

  function isApiReady(): boolean {
    return apiLoadError === null && (window as any).YT?.Player != null;
  }

  return {
    mount,
    load,
    pause,
    play,
    next,
    previous,
    playAt,
    currentTitle,
    playlistPosition,
    destroy,
    isApiReady,
  };
}
