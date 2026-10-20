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
 * Primeira seta: entra na direção pressionada (centro da tela como origem).
 *
 * Desempenho (TV/WebView fraco): a *lista* de candidatos é cacheada e só é
 * refeita quando o DOM muda (MutationObserver) ou a janela redimensiona —
 * nunca a cada tecla. Os retângulos são relidos por tecla num único passe
 * (um único cálculo de layout, o resto é aritmética). Autorepeat do remote
 * e pressões rápidas usam rolagem instantânea ('auto'): rolagem suave
 * empilhada é o que deixa a passagem de foco "travada".
 */
export default defineNuxtPlugin(() => {
  window.addEventListener('keydown', onKeydown);

  // O DOM muda (listas virtuais, v-show, modais): marca candidatos para refez.
  const observer = new MutationObserver(invalidateCandidates);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'inert', 'disabled', 'tabindex', 'style', 'class'],
  });

  // CSS responsivo pode esconder/mostrar regiões inteiras sem mutação de DOM.
  window.addEventListener('resize', invalidateCandidates);
});

import { pickSpatialBest } from '~/utils/spatial';

type Direction = 'up' | 'down' | 'left' | 'right';

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

const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Janela mínima entre duas setas para considerar "pressão rápida" (sem suavidade). */
const RAPID_PRESS_MS = 160;

let lastMoveAt = 0;

function isEditable(element: Element | null): boolean {
  if (!element) return false;
  if (element.closest('[contenteditable="true"]')) return true;
  const tag = element.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true;
  return false;
}

/** Campos de linha única (usuário/senha/busca) não usam ↑/↓ — no remote da TV
 *  essas setas servem pra sair do campo (não existe teclado físico). */
function isSingleLineInput(element: Element | null): boolean {
  if (!element || element.tagName !== 'INPUT') return false;
  const type = (element as HTMLInputElement).type;
  return type === 'text' || type === 'password' || type === 'search' || type === 'email' || type === 'url' || type === 'tel';
}

function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if (element.hasAttribute('disabled')) return false;
  if (element.closest('[data-no-spatial], [hidden], [inert]')) return false;
  // `checkVisibility` (Chrome 105+) responde visibility/display sem estilo
  // computado caro; WebViews de TV antigas caem no getClientRects.
  const check = (
    element as HTMLElement & { checkVisibility?: (options?: Record<string, boolean>) => boolean }
  ).checkVisibility;
  if (typeof check === 'function') {
    if (!check.call(element, { checkOpacity: false, checkVisibilityCSS: true })) return false;
  } else if (element.getClientRects().length === 0) {
    return false;
  }
  return true;
}

/* ── Cache de candidatos ───────────────────────────────────────────────── */

/** Lista de elementos focáveis — não a geometria (que muda a cada rolagem). */
let cachedElements: HTMLElement[] | null = null;

function invalidateCandidates(): void {
  cachedElements = null;
}

function collectElements(): HTMLElement[] {
  if (cachedElements) return cachedElements;

  // Se houver modal dialog aberto, limita candidatos a ele.
  const modal = document.querySelector<HTMLElement>(
    '[role="dialog"][aria-modal="true"]:not([hidden]):not([inert])',
  );
  const nodes: NodeListOf<HTMLElement> = modal
    ? modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    : document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);

  const result: HTMLElement[] = [];
  for (const element of nodes) {
    if (isFocusable(element)) result.push(element);
  }
  cachedElements = result;
  return result;
}

function measure(elements: HTMLElement[]): { element: HTMLElement; rect: DOMRect }[] {
  const result: { element: HTMLElement; rect: DOMRect }[] = [];
  for (const element of elements) {
    // display:none devolve retângulo zero — sai da rodada.
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    result.push({ element, rect });
  }
  return result;
}

/* ── Movimento ─────────────────────────────────────────────────────────── */

/** Suavidade só na primeira seta pausada — repeat/pressão rápida é 'auto'. */
function scrollBehavior(repeat: boolean): ScrollBehavior {
  if (repeat || REDUCED_MOTION) return 'auto';
  const now = performance.now();
  if (now - lastMoveAt < RAPID_PRESS_MS) return 'auto';
  return 'smooth';
}

/** Foca o próximo candidato na direção. */
function focusNext(current: HTMLElement | null, direction: Direction, repeat = false): boolean {
  const candidates = measure(collectElements());
  if (candidates.length === 0) return false;

  const behavior = scrollBehavior(repeat);

  // Sem foco ainda: entra na direção pressionada (centro da tela como origem).
  if (!current || current === document.body) {
    const virtual = {
      left: window.innerWidth / 2,
      top: window.innerHeight / 2,
      right: window.innerWidth / 2,
      bottom: window.innerHeight / 2,
      width: 0,
      height: 0,
    } as DOMRect;
    const best = pickSpatialBest(virtual, candidates, direction);
    const target = best || candidates[0].element;
    lastMoveAt = performance.now();
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior });
    return true;
  }

  const currentRect = current.getBoundingClientRect();
  const best = pickSpatialBest(currentRect, candidates, direction);
  if (!best) return false;

  lastMoveAt = performance.now();
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
  if (isEditable(active) || active?.closest('[data-no-spatial]')) {
    // Exceção: ↑/↓ em campo de linha única não tem função nativa — permite
    // que o D-pad saia do input (login/search na TV, sem teclado físico).
    if (!(direction === 'up' || direction === 'down') || !isSingleLineInput(active)) return;
  }

  if (focusNext(active, direction, event.repeat)) event.preventDefault();
}
