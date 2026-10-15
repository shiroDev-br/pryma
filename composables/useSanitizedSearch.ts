import { computed, ref, watch, onScopeDispose } from 'vue';
import { DEBOUNCE_MS, MIN_SEARCH_CHARS } from '~/constants';
import { sanitizeQuery } from '~/utils/sanitize';

export interface UseSanitizedSearchOptions {
  initialQuery?: string;
  delay?: number;
  minChars?: number;
}

export interface SanitizedSearch {
  /** Texto bruto digitado pelo usuário (dois-way com o input). */
  query: Ref<string>;
  /** Texto normalizado e limitado — é o que vai ao servidor. */
  normalizedQuery: Ref<string>;
  isDebouncing: Ref<boolean>;
  /** Pronto para disparar request (atingiu o mínimo de caracteres). */
  isReady: ComputedRef<boolean>;
  setQuery(value: string): void;
  clear(): void;
}

/**
 * Estado de busca performático: normaliza o input (acentos/caixa/espaços),
 * faz debounce e só sinaliza `isReady` quando há caracteres suficientes.
 */
export function useSanitizedSearch(options: UseSanitizedSearchOptions = {}): SanitizedSearch {
  const minChars = options.minChars ?? MIN_SEARCH_CHARS;
  const query = ref(options.initialQuery ?? '');
  const normalizedQuery = ref(sanitizeQuery(query.value));
  const isDebouncing = ref(false);

  let timer: ReturnType<typeof setTimeout> | undefined;

  watch(query, (value) => {
    isDebouncing.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      normalizedQuery.value = sanitizeQuery(value);
      isDebouncing.value = false;
    }, options.delay ?? DEBOUNCE_MS);
  });

  onScopeDispose(() => clearTimeout(timer));

  const isReady = computed(() => normalizedQuery.value.length >= minChars);

  return {
    query,
    normalizedQuery,
    isDebouncing,
    isReady,
    setQuery: (value: string) => {
      query.value = value;
    },
    clear: () => {
      query.value = '';
    },
  };
}
