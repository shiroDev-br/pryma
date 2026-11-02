/**
 * Pausa do fundo animado enquanto outro vídeo toca na mesma tela.
 *
 * TVs costumam ter um único decodificador de vídeo por hardware: com o fundo
 * em loop atrás da prévia ao vivo (ou do trailer), o canal pode nem abrir.
 * Quem toca vídeo dentro do layout `default` declara isso aqui e o fundo fica
 * só no pôster até a pausa acabar. Contador — várias telas podem pedir juntas.
 */
const suspensions = ref(0);

/** `true` enquanto alguém pediu o fundo parado. Só muda no cliente. */
export function useBackgroundMotionSuspended(): ComputedRef<boolean> {
  return computed(() => suspensions.value > 0);
}

/** Mantém o fundo parado enquanto `active()` for verdadeiro (libera ao desmontar). */
export function useSuspendBackgroundMotion(active: () => boolean): void {
  if (import.meta.server) return;
  let held = false;

  function set(next: boolean): void {
    if (next === held) return;
    held = next;
    suspensions.value += next ? 1 : -1;
  }

  watch(active, set, { immediate: true });
  onScopeDispose(() => set(false));
}
