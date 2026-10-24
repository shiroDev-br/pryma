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

export interface YoutubePlayerHandle {
  /** Monta o player dentro do elemento alvo (client-only, uma vez). */
  mount(target: HTMLElement, videoId: string): Promise<void>;
  /** Troca o vídeo atual (autoplay). */
  load(videoId: string): void;
  pause(): void;
  play(): void;
  /** Destrói o player e limpa o script da API. */
  destroy(): void;
  /** Indica se a API do YouTube carregou com sucesso. */
  isApiReady: () => boolean;
}

let apiPromise: Promise<any> | null = null;
let apiLoadError: Error | null = null;

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
        if (typeof previous === 'function') previous();
        resolve(w.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        apiPromise = null;
        apiLoadError = new Error('Falha ao carregar a IFrame API do YouTube.');
        reject(apiLoadError);
      };
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

  async function mount(target: HTMLElement, videoId: string): Promise<void> {
    try {
      const YT = await ensureApi();
      if (destroyed) return;

      await new Promise<void>((resolve, reject) => {
        player = new YT.Player(target, {
          videoId,
          playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
          events: {
            onReady: () => {
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

  function destroy(): void {
    destroyed = true;
    player?.destroy();
    player = null;
  }

  function isApiReady(): boolean {
    return apiLoadError === null && (window as any).YT?.Player != null;
  }

  return { mount, load, pause, play, destroy, isApiReady };
}
