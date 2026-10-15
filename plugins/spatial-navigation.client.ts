/**
 * Navegação espacial por direcional (TV / remoto / teclado).
 *
 * Um único listener global move o foco em 2D pela geometria da tela:
 * as setas percorrem o elemento mais próximo na direção pressionada,
 * alinhado ao eixo cruzado (como o D-pad de TV). Componentes com lógica
 * própria (carrossel da home, trilho de categorias) continuam no comando —
 * se chamarem `preventDefault`, o motor espacial fica de fora.
 *
 * Opt-out: envolva a área em `[data-no-spatial]` (ex.: controles do player)
 * e as setas continuam nativas ali.
 *
 * Modal scoping: se um dialog `[role="dialog"][aria-modal="true"]` estiver
 * visível, o motor só considera candidatos dentro dele.
 *
 * Primeira seta: entra na direção pressada (centro da tela como origem).
 * Repeat (autorepeat do remote): rolagem suave desabilitada, usa 'auto'.
 */
export default defineNuxtPlugin(() => {
  window.addEventListener('keydown', onKeydown);
});

import { pickSpatialBest } from '~/utils/spatial';

type Direction = 'up' | 'down' | 'left' | 'right';

const VECTORS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
};

const KEYCODE_TO_DIRECTION: Record<number, Direction> = {
  19: 'up',
  20: 'down',
  21: 'left',
  22: 'right',
};

const FOCUSABLE_SELECTOR = 'a[href], button, input, select, textarea, [tabindex]';

function isEditable(element: Element | null): boolean {
  if (!element) return false;
  if (element.closest('[contenteditable="true"]')) return true;
  const tag = element.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true;
  return false;
}

function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if (element.hasAttribute('disabled')) return false;
  if (element.closest('[data-no-spatial], [hidden], [inert]')) return false;
  if (getComputedStyle(element).visibility === 'hidden') return false;
  // display:none (e itens fora de rails com content-visibility) não têm retângulo.
  if (element.getClientRects().length === 0) return false;
  return true;
}

interface Candidate {
  element: HTMLElement;
  rect: DOMRect;
}

function collectCandidates(): Candidate[] {
  // Se houver modal dialog aberto, limita candidatos a ele.
  const modal = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]:not([hidden]):not([inert])');
  const nodes: NodeListOf<HTMLElement> = modal
    ? modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    : document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  const result: Candidate[] = [];
  for (const element of nodes) {
    if (!isFocusable(element)) continue;
    result.push({ element, rect: element.getBoundingClientRect() });
  }
  return result;
}

/** Foca o próximo candidato na direção, respeitando `prefers-reduced-motion`
 * e `event.repeat` (evita scroll jank em autorepeat). */
function focusNext(current: HTMLElement | null, direction: Direction, repeat = false): boolean {
  const candidates = collectCandidates();
  if (candidates.length === 0) return false;

  // Sem foco ainda: entra na direção pressada (centro da tela como origem).
  if (!current || current === document.body) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = reducedMotion || repeat ? 'auto' : 'smooth';

    // Tenta primeiro na direção usando algoritmo espacial compartilhado.
    const virtual = { left: window.innerWidth / 2, top: window.innerHeight / 2, right: window.innerWidth / 2, bottom: window.innerHeight / 2, width: 0, height: 0 } as DOMRect;
    const best = pickSpatialBest(virtual, candidates, direction);
    const target = best || candidates[0].element;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior });
    return true;
  }

  const currentRect = current.getBoundingClientRect();
  const best = pickSpatialBest(currentRect, candidates, direction);
  if (!best) return false;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior: ScrollBehavior = reducedMotion || repeat ? 'auto' : 'smooth';

  best.focus({ preventScroll: true });
  best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior });
  return true;
}

function onKeydown(event: KeyboardEvent): void {
  const direction =
    KEY_TO_DIRECTION[event.key] ?? KEYCODE_TO_DIRECTION[event.keyCode ?? 0] ?? null;
  if (!direction) return;

  if (event.defaultPrevented) return;

  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  // Digitando ou dentro de controles que usam setas nativas.
  if (isEditable(active) || active?.closest('[data-no-spatial]')) return;

  const repeat = event.repeat;

  if (focusNext(active, direction, repeat)) event.preventDefault();
}