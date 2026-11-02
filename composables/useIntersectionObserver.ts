import { watch } from 'vue';

export interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  /** Observar já no mount (útil p/ sentinel de infinite scroll). */
  immediate?: boolean;
}

type EntryCallback = (isIntersecting: boolean, entry: IntersectionObserverEntry) => void;

interface SharedObserver {
  observer: IntersectionObserver;
  callbacks: Map<Element, Set<EntryCallback>>;
}

/**
 * Um IntersectionObserver por configuração (rootMargin/threshold), dividido
 * entre todos os alvos — antes cada linha da listagem criava o seu (48+ por
 * página, mais a cada "carregar mais"), e a TV pagava isso a cada rolagem.
 * Observers com `root` próprio não entram no pool.
 */
const shared = new Map<string, SharedObserver>();

function sharedKey(options: IntersectionObserverInit): string | null {
  if (options.root) return null;
  return `${options.rootMargin ?? ''}|${String(options.threshold ?? '')}`;
}

function acquire(key: string, options: IntersectionObserverInit): SharedObserver {
  let entry = shared.get(key);
  if (!entry) {
    const callbacks = new Map<Element, Set<EntryCallback>>();
    const observer = new IntersectionObserver((entries) => {
      for (const item of entries) {
        const set = callbacks.get(item.target);
        if (!set) continue;
        for (const callback of set) callback(item.isIntersecting, item);
      }
    }, options);
    entry = { observer, callbacks };
    shared.set(key, entry);
  }
  return entry;
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
  let cleanup: () => void = () => {};

  function setup(): void {
    cleanup();
    cleanup = () => {};
    const element = toValue(target);
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const key = sharedKey(observerOptions);
    if (key === null) {
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) callback(entry.isIntersecting, entry);
      }, observerOptions);
      observer.observe(element);
      cleanup = () => observer.disconnect();
      return;
    }

    const { observer, callbacks } = acquire(key, observerOptions);
    let set = callbacks.get(element);
    if (!set) {
      set = new Set();
      callbacks.set(element, set);
    }
    set.add(callback);
    // Alvo novo no observer compartilhado também recebe a notificação inicial.
    observer.observe(element);

    cleanup = () => {
      const current = callbacks.get(element);
      if (!current) return;
      current.delete(callback);
      if (current.size === 0) {
        callbacks.delete(element);
        observer.unobserve(element);
      }
    };
  }

  watch(() => toValue(target), setup, { immediate, flush: 'post' });
  onScopeDispose(() => cleanup());
}
