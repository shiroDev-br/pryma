import { createKeyRepeatGate } from '~/utils/keyRepeatGate';
import { directionOf } from '~/utils/remoteKeys';
import { pickSpatialBest } from '~/utils/spatial';
import type { SpatialDirection } from '~/utils/spatial';

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
/** Seta segurada: um passo por quadro, sem fila (ver utils/keyRepeatGate). */
const repeatGate = createKeyRepeatGate();

export default defineNuxtPlugin(() => {
  window.addEventListener('keydown', onKeydown);

  // Modo D-pad: primeira seta/Enter liga `body.dpad-mode` (anel de foco em
  // WebViews sem :focus-visible); mouse/toque desliga (anel some no clique).
  window.addEventListener('pointerdown', leaveDpadMode);
  window.addEventListener('touchstart', leaveDpadMode, { passive: true });
  window.addEventListener('mousemove', leaveDpadMode, { passive: true });

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

function leaveDpadMode(): void {
  document.body.classList.remove('dpad-mode');
}

function enterDpadMode(): void {
  if (!document.body.classList.contains('dpad-mode')) {
    document.body.classList.add('dpad-mode');
  }
}

const FOCUSABLE_SELECTOR = 'a[href], button, input, select, textarea, [tabindex]';

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

/**
 * Mutations em rajada (Vue re-render, hover, relógio, listas) — coalesce
 * num refetch só. Sem isso, cada tecla refazia querySelectorAll no documento
 * inteiro e a navegação ficava lenta em chip fraco.
 */
let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

function invalidateCandidates(): void {
  if (invalidateTimer !== null) return;
  invalidateTimer = setTimeout(() => {
    invalidateTimer = null;
    cachedElements = null;
  }, 150);
}

/** Modal que estava aberto quando o cache foi montado. */
let cachedModal: HTMLElement | null = null;

function collectElements(): HTMLElement[] {
  // Se houver modal dialog aberto, limita candidatos a ele. Conferido a cada
  // tecla: o cache só invalida 150ms após a mutação, e uma seta logo depois de
  // abrir o modal ainda navegaria pela página de fundo.
  const modal = document.querySelector<HTMLElement>(
    '[role="dialog"][aria-modal="true"]:not([hidden]):not([inert])',
  );
  if (cachedElements && modal === cachedModal) return cachedElements;
  cachedModal = modal;
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

/** Barra fixa (header do PRYMA): fica na tela enquanto o conteúdo rola por baixo. */
const CHROME_SELECTOR = '[data-spatial-chrome]';

/**
 * Header fixo × conteúdo rolado: com a lista rolada, os cards de cima ficam
 * fora da tela — mais longe que o header. Sem esta regra, ↑ na 1ª fileira
 * visível pulava pro header, e ↑ no header "voltava" pros cards fora da tela.
 *  - no conteúdo: ↑ sobe pro header só quando não há mais conteúdo acima;
 *  - no header: ←/→/↑ ficam no header; só ↓ desce pro conteúdo.
 */
function pickInDirection(
  current: HTMLElement,
  currentRect: DOMRect,
  candidates: { element: HTMLElement; rect: DOMRect }[],
  direction: SpatialDirection,
): HTMLElement | null {
  const inChrome = (element: HTMLElement) => element.closest(CHROME_SELECTOR) !== null;
  const chrome = candidates.filter((candidate) => inChrome(candidate.element));
  if (chrome.length === 0) return pickSpatialBest(currentRect, candidates, direction);

  if (inChrome(current)) {
    if (direction !== 'down') return pickSpatialBest(currentRect, chrome, direction);
    return pickSpatialBest(currentRect, candidates, direction);
  }

  // O header fica no topo: só ↑ sobe pra ele. ←/→ na ponta do conteúdo
  // (ex.: "Favoritar" no detalhe) pulavam pro sino/menu do canto da tela.
  const content = candidates.filter((candidate) => !inChrome(candidate.element));
  const inContent = pickSpatialBest(currentRect, content, direction);
  if (inContent || direction !== 'up') return inContent;
  return pickSpatialBest(currentRect, chrome, direction);
}

/** Foca o próximo candidato na direção. Rolagem sempre instantânea: em chip
 *  fraco a rolagem suave disputa repaint com o foco e parece "travada". */
function focusNext(current: HTMLElement | null, direction: SpatialDirection): boolean {
  const candidates = measure(collectElements());
  if (candidates.length === 0) return false;

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
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    return true;
  }

  const currentRect = current.getBoundingClientRect();
  const best = pickInDirection(current, currentRect, candidates, direction);
  if (!best) return false;

  best.focus({ preventScroll: true });
  best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  return true;
}

function onKeydown(event: KeyboardEvent): void {
  const direction = directionOf(event);

  // Seta ou OK/Enter = remoto em uso → anel de foco ativo (dpad-mode).
  if (direction || event.key === 'Enter') enterDpadMode();
  if (!direction) return;

  if (event.defaultPrevented) return;

  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  // Digitando ou dentro de controles que usam setas nativas.
  if (isEditable(active) || active?.closest('[data-no-spatial]')) {
    // Exceção: ↑/↓ em campo de linha única não tem função nativa — permite
    // que o D-pad saia do input (login/search na TV, sem teclado físico).
    if (!(direction === 'up' || direction === 'down') || !isSingleLineInput(active)) return;
  }

  if (repeatGate.shouldDrop(event)) {
    event.preventDefault();
    return;
  }

  if (focusNext(active, direction)) {
    event.preventDefault();
    repeatGate.mark();
  }
}
