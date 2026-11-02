import { onBeforeUnmount, onMounted, ref } from 'vue';

const QUERY = '(orientation: portrait) and (max-width: 640px)';

/**
 * Celular em pé — para quando a estrutura muda, não só o estilo (ex.: home em
 * grade em vez de carrossel). `false` no servidor e na hidratação; ajuste de
 * estilo é com as variantes do Tailwind, não com isto.
 */
export function usePortraitPhone() {
  const portraitPhone = ref(false);
  let query: MediaQueryList | null = null;

  const update = (): void => {
    portraitPhone.value = query?.matches ?? false;
  };

  onMounted(() => {
    query = window.matchMedia(QUERY);
    update();
    // `addListener`: WebView antiga não tem addEventListener em MediaQueryList.
    query.addListener(update);
  });

  onBeforeUnmount(() => query?.removeListener(update));

  return portraitPhone;
}
