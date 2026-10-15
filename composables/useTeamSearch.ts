import { computed, ref, watch } from 'vue';
import {
  FOOTBALL_ENDPOINTS,
  FOOTBALL_MIN_SEARCH_CHARS,
  FOOTBALL_SEARCH_DEBOUNCE_MS,
} from '~/constants';
import { readErrorMessage } from '~/utils/errors';
import { sanitizeQuery } from '~/utils/sanitize';
import { useDebouncedValue } from './useDebouncedValue';
import type { FavoriteTeam, TeamSearchResponse } from '~/types';

export interface TeamSearch {
  query: Ref<string>;
  results: Ref<FavoriteTeam[]>;
  isSearching: Ref<boolean>;
  error: Ref<string | null>;
  /** Query já digitada mas curta demais para virar request. */
  isTooShort: Ref<boolean>;
  /** Repete a última busca (retry após erro). */
  refresh: () => void;
  clear: () => void;
}

/**
 * Busca de times com debounce — no máximo 1 request por query normalizada,
 * e nenhum enquanto o usuário ainda está digitando (cota é 100/dia).
 */
export function useTeamSearch(): TeamSearch {
  const query = ref('');
  const debounced = useDebouncedValue(query, FOOTBALL_SEARCH_DEBOUNCE_MS);
  const results = ref<FavoriteTeam[]>([]);
  const isSearching = ref(false);
  const error = ref<string | null>(null);

  const isTooShort = computed(
    () => sanitizeQuery(debounced.value).length < FOOTBALL_MIN_SEARCH_CHARS,
  );

  let token = 0;

  async function run(raw: string): Promise<void> {
    const current = ++token;
    const search = sanitizeQuery(raw);

    if (search.length < FOOTBALL_MIN_SEARCH_CHARS) {
      results.value = [];
      error.value = null;
      isSearching.value = false;
      return;
    }

    isSearching.value = true;
    error.value = null;

    try {
      const payload = await $fetch<TeamSearchResponse>(FOOTBALL_ENDPOINTS.teams, {
        query: { search },
      });

      if (current !== token) return;
      results.value = payload.items;
    } catch (caught) {
      if (current !== token) return;
      results.value = [];
      error.value = readErrorMessage(caught, 'Não foi possível buscar times.');
    } finally {
      if (current === token) isSearching.value = false;
    }
  }

  watch(debounced, (value) => run(value), { immediate: true });

  /** Nova tentativa da última query digitada (usada pelo botão "Tentar novamente"). */
  function refresh(): void {
    void run(debounced.value);
  }

  function clear(): void {
    query.value = '';
    results.value = [];
    error.value = null;
  }

  return { query, results, isSearching, error, isTooShort, refresh, clear };
}
