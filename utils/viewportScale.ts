/**
 * Escala de viewport compartilhada (plugin + carrossel da home).
 *
 * Canvas de referência 1440×810 (16:9) a 17px — o layout aprovado no
 * notebook. Em landscape, TODA tela (TV 1080p/720p/compat, notebook) é
 * esse mesmo canvas ampliado/reduzido por `scale`.
 */
export const BASE_W = 1440;
export const BASE_H = 810;
export const BASE_FONT = 17;

/** Retrato (celular/tablet em pé) não escala — volta ao layout phone. */
export function isLandscape(w: number, h: number): boolean {
  return w >= h;
}

export function getViewportScale(w: number, h: number): number {
  if (!isLandscape(w, h)) return 1;
  return Math.min(w / BASE_W, h / BASE_H);
}
