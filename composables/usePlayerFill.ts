import { onMounted, ref } from 'vue';
import { STORAGE_KEYS } from '~/constants';

/**
 * "Preencher a tela": estica a imagem até sumir as faixas pretas, mesmo
 * distorcendo. Não é o Fullscreen API (o player já ocupa a janela e no APK a
 * WebView não entra em tela cheia). A escolha fica salva no aparelho e vale para
 * o player e para a prévia expandida da TV ao vivo.
 */
export function usePlayerFill() {
  const fillScreen = ref(false);

  function toggleFill(): void {
    fillScreen.value = !fillScreen.value;
    try {
      localStorage.setItem(STORAGE_KEYS.playerFill, fillScreen.value ? '1' : '0');
    } catch {
      // Sem storage: vale só nesta sessão.
    }
  }

  onMounted(() => {
    try {
      fillScreen.value = localStorage.getItem(STORAGE_KEYS.playerFill) === '1';
    } catch {
      // Sem storage: começa ajustado.
    }
  });

  return { fillScreen, toggleFill };
}
