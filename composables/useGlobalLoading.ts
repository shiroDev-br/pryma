import { ref, computed } from 'vue';

const isLoading = ref(false);
const loadingMessage = ref('Carregando…');
let loadingTimer: ReturnType<typeof setTimeout> | null = null;
const MIN_LOADING_TIME = 300; // ms — evita flash de loading em navegações rápidas

export function useGlobalLoading() {
  function start(message = 'Carregando…'): void {
    loadingMessage.value = message;
    if (loadingTimer) clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => {
      isLoading.value = true;
    }, 50); // pequeno delay para evitar flash
  }

  function finish(): void {
    if (loadingTimer) {
      clearTimeout(loadingTimer);
      loadingTimer = null;
    }
    // Garante tempo mínimo de exibição
    setTimeout(() => {
      isLoading.value = false;
    }, MIN_LOADING_TIME);
  }

  return {
    isLoading: computed(() => isLoading.value),
    loadingMessage: computed(() => loadingMessage.value),
    start,
    finish,
  };
}