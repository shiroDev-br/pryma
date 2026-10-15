import { ref, watch, toValue, onScopeDispose } from 'vue';
import { getRepositories } from '~/repositories';
import { sanitizeQuery } from '~/utils/sanitize';
import { isAdultText } from '~/utils/adult';
import { DEBOUNCE_MS, MIN_SEARCH_CHARS, SUGGEST_LIMIT } from '~/constants';
import type { MaybeRefOrGetter } from 'vue';
import type { Suggestion } from '~/types';

/**
 * Autocomplete do campo de busca — debounce próprio e cancelamento de
 * request obsoleta. Mostra só quando a query atinge o mínimo de caracteres;
 * apagar o campo limpa as sugestões na hora.
 */
export function useSearchSuggestions(query: MaybeRefOrGetter<string>) {
  const repository = getRepositories().media;
  const adultUnlocked = useState<boolean>('adult.unlocked', () => false);

  const suggestions = ref<Suggestion[]>([]);
  const isPending = ref(false);

  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | null = null;

  async function fetchSuggestions(normalized: string): Promise<void> {
    controller?.abort();

    if (normalized.length < MIN_SEARCH_CHARS) {
      suggestions.value = [];
      isPending.value = false;
      return;
    }

    const local = new AbortController();
    controller = local;
    isPending.value = true;

    try {
      const items = await repository.suggest(normalized, { signal: local.signal });
      if (local.signal.aborted) return;
      suggestions.value = items
        .filter((item) => adultUnlocked.value || !isAdultText(item.value))
        .slice(0, SUGGEST_LIMIT);
    } catch {
      if (!local.signal.aborted) suggestions.value = [];
    } finally {
      if (!local.signal.aborted) isPending.value = false;
    }
  }

  watch(
    () => sanitizeQuery(toValue(query)),
    (value) => {
      clearTimeout(timer);
      timer = setTimeout(() => void fetchSuggestions(value), DEBOUNCE_MS);
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    clearTimeout(timer);
    controller?.abort();
  });

  function reset(): void {
    controller?.abort();
    suggestions.value = [];
    isPending.value = false;
  }

  return { suggestions, isPending, reset };
}
