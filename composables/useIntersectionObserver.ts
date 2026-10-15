import { watch } from 'vue';

export interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  /** Observar já no mount (útil p/ sentinel de infinite scroll). */
  immediate?: boolean;
}

/**
 * Observa interseção de um elemento alvo — base de infinite scroll e imagens lazy.
 * Desconecta automaticamente ao desmontar.
 */
export function useIntersectionObserver(
  target: MaybeRefOrGetter<Element | null>,
  callback: (isIntersecting: boolean, entry: IntersectionObserverEntry) => void,
  options: UseIntersectionObserverOptions = {},
): void {
  const { immediate = true, ...observerOptions } = options;
  let observer: IntersectionObserver | null = null;

  function cleanup(): void {
    observer?.disconnect();
    observer = null;
  }

  function setup(): void {
    cleanup();
    const element = toValue(target);
    if (!element || typeof IntersectionObserver === 'undefined') return;

    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        callback(entry.isIntersecting, entry);
      }
    }, observerOptions);

    observer.observe(element);
  }

  watch(() => toValue(target), setup, { immediate, flush: 'post' });
  onScopeDispose(cleanup);
}
