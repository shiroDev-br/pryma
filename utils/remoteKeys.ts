/**
 * Leitura única das teclas do controle remoto / teclado.
 *
 * WebView antiga de TV nem sempre dá o nome da tecla: às vezes vem `Left` em vez
 * de `ArrowLeft`, às vezes só o código (D-pad do Android: 19–22, OK: 23). Toda
 * tela que trata tecla passa por aqui — assim nenhuma esquece um desses casos.
 */
import type { SpatialDirection } from '~/utils/spatial';

const DIRECTION_BY_KEY: Record<string, SpatialDirection> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
};

const DIRECTION_BY_CODE: Record<number, SpatialDirection> = {
  19: 'up',
  20: 'down',
  21: 'left',
  22: 'right',
};

/** Seta pressionada, ou null se a tecla não é direcional. */
export function directionOf(event: KeyboardEvent): SpatialDirection | null {
  return DIRECTION_BY_KEY[event.key] ?? DIRECTION_BY_CODE[event.keyCode] ?? null;
}

/** OK do controle / Enter / espaço. */
export function isOkKey(event: KeyboardEvent): boolean {
  const { key, keyCode } = event;
  return key === 'Enter' || key === ' ' || keyCode === 13 || keyCode === 23;
}

const BACK_KEYS = ['Escape', 'Backspace', 'GoBack', 'BrowserBack'];

/** Voltar: Esc, Backspace e o Voltar das TVs (10009 = Tizen). */
export function isBackKey(event: KeyboardEvent): boolean {
  return BACK_KEYS.includes(event.key) || event.keyCode === 10009;
}

/**
 * Teclas de mídia. Os códigos do Android (85 play/pause, 126 play, 127 pause,
 * 89 ⏪, 90 ⏩) só valem sem nome de tecla — no teclado do computador 85/89/90
 * são U/Y/Z.
 */
export type MediaKey = 'playPause' | 'fastForward' | 'rewind';

export function mediaKeyOf(event: KeyboardEvent): MediaKey | null {
  const { key, keyCode } = event;
  const unnamed = !key || key === 'Unidentified';

  if (key === 'MediaPlayPause' || key === 'MediaPlay' || key === 'MediaPause' || keyCode === 179) return 'playPause';
  if (unnamed && (keyCode === 85 || keyCode === 126 || keyCode === 127)) return 'playPause';
  if (key === 'MediaFastForward' || keyCode === 228 || (unnamed && keyCode === 90)) return 'fastForward';
  if (key === 'MediaRewind' || keyCode === 227 || (unnamed && keyCode === 89)) return 'rewind';
  return null;
}

/** Digitando num campo: as teclas são do campo, não da navegação. */
export function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element?.tagName) return false;
  return element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
}
