import { ref, computed } from 'vue';

const isLoading = ref(false);
const loadingMessage = ref('Carregando…');
let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
/** Momento em que o overlay apareceu (0 = escondido). */
let shownAt = 0;

/** Navegação mais rápida que isso não mostra overlay (evita flash). */
const SHOW_DELAY = 100; // ms
/** Depois de aparecer, fica pelo menos isso — sem piscar. Conta a partir de
 *  quando apareceu, não de quando a página terminou: antes eram +300ms fixos
 *  em toda navegação, com a tela nova já pronta por baixo do overlay. */
const MIN_VISIBLE = 250; // ms

function clearTimers(): void {
  if (showTimer) clearTimeout(showTimer);
  if (hideTimer) clearTimeout(hideTimer);
  showTimer = null;
  hideTimer = null;
}

export function useGlobalLoading() {
  function start(message = 'Carregando…'): void {
    loadingMessage.value = message;
    clearTimers();
    if (isLoading.value) return;
    showTimer = setTimeout(() => {
      showTimer = null;
      isLoading.value = true;
      shownAt = Date.now();
    }, SHOW_DELAY);
  }

  function finish(): void {
    clearTimers();
    if (!isLoading.value) return;
    const remaining = MIN_VISIBLE - (Date.now() - shownAt);
    if (remaining <= 0) {
      isLoading.value = false;
      return;
    }
    hideTimer = setTimeout(() => {
      hideTimer = null;
      isLoading.value = false;
    }, remaining);
  }

  return {
    isLoading: computed(() => isLoading.value),
    loadingMessage: computed(() => loadingMessage.value),
    start,
    finish,
  };
}
