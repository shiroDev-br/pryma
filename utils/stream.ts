/**
 * Base dos dois motores de vídeo (player em `useStreamEngine`, prévia em
 * `useLivePreview`): como reconhecer o formato pela URL e como carregar as
 * bibliotecas. Cada motor define só os próprios buffers e a própria reação a erro.
 */
import type { PlaybackProtocol } from '~/types';

export type StreamKind = 'file' | 'hls' | 'mpegts';

/** Cada motor abre o que recebe de um jeito: arquivo no `src`, HLS no hls.js, resto no mpegts. */
export function streamKindOf(url: string, protocol: PlaybackProtocol | string): StreamKind {
  if (protocol === 'file' || /\.(mp4|webm|mkv|ogv)(\?|#|$)/i.test(url)) return 'file';
  return /m3u8/i.test(url) ? 'hls' : 'mpegts';
}

export type HlsCtor = typeof import('hls.js').default;

let hlsChunk: Promise<HlsCtor> | null = null;

/**
 * hls.js só entra quando há vídeo — import estático puxava ~600 KB pro entry e
 * travava o boot em chip fraco. Chunk baixado uma vez por sessão.
 */
export function loadHls(): Promise<HlsCtor> {
  if (!hlsChunk) hlsChunk = import('hls.js').then((module) => module.default);
  return hlsChunk;
}

/** mpegts.js toca `self` no escopo do módulo: import dinâmico também evita quebrar o SSR. */
export async function loadMpegts() {
  return (await import('mpegts.js')).default;
}

/** Variantes do Safari e o `canPlayType`: lá o HLS toca direto no `src` do <video>. */
export function canPlayNativeHls(video: HTMLVideoElement): boolean {
  return Boolean(video.canPlayType('application/vnd.apple.mpegurl'));
}
