import { onBeforeUnmount, onMounted, ref } from 'vue';

interface WebkitDoc {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}
interface WebkitEl {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

/**
 * Tela cheia no container inteiro (HUD junto do vídeo) — prefixos WebKit
 * cobrem Safari/iOS antigos. Registra e limpa os listeners sozinho.
 */
export function useFullscreen(target: Ref<HTMLElement | null>) {
  const isFullscreen = ref(false);

  function onFullscreenChange(): void {
    const doc = document as Document & WebkitDoc;
    isFullscreen.value = !!(document.fullscreenElement ?? doc.webkitFullscreenElement);
  }

  function enterFullscreen(): void {
    const element = target.value as (HTMLElement & WebkitEl) | null;
    if (!element || isFullscreen.value) return;

    try {
      if (element.requestFullscreen) {
        element.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined);
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      }
    } catch {
      /* navegador sem suporte — botão fica inerte */
    }
  }

  function exitFullscreen(): void {
    const doc = document as Document & WebkitDoc;
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => undefined);
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    } catch {
      /* ignore */
    }
  }

  function toggleFullscreen(): void {
    if (isFullscreen.value) exitFullscreen();
    else enterFullscreen();
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
  });

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen };
}
