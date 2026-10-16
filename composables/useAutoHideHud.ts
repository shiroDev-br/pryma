import { onBeforeUnmount, ref, watch } from 'vue';
import { PLAYER_HUD_HIDE_MS } from '~/constants';

/**
 * HUD: some durante a reprodução, volta com qualquer interação (pointer/teclado).
 * `isPlaying` vem do player — pausado, o HUD fica sempre visível.
 */
export function useAutoHideHud(isPlaying: () => boolean) {
  const hudVisible = ref(true);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function pokeHud(): void {
    hudVisible.value = true;
    if (hideTimer) clearTimeout(hideTimer);

    if (isPlaying()) {
      hideTimer = setTimeout(() => {
        hudVisible.value = false;
      }, PLAYER_HUD_HIDE_MS);
    }
  }

  watch(isPlaying, (playing) => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (playing) pokeHud();
    else hudVisible.value = true;
  });

  onBeforeUnmount(() => {
    if (hideTimer) clearTimeout(hideTimer);
  });

  return { hudVisible, pokeHud };
}
