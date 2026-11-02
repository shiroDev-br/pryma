/**
 * Solta o decodificador de um <video> AGORA.
 *
 * Tirar o elemento da tela (v-if/:key) não basta: no Android o decodificador
 * fica preso a ele até o GC passar. Fire Stick e TV box costumam ter um só —
 * o próximo vídeo (prévia ao vivo, fundo, player) nem abria. Pausar, tirar o
 * `src` e chamar `load()` destrói o player de mídia na hora.
 */
export function releaseVideo(video: HTMLVideoElement | null | undefined): void {
  if (!video) return;
  try {
    video.pause();
    video.removeAttribute('src');
    video.load();
  } catch {
    /* já desmontado */
  }
}
