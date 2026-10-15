import { watch, toValue, computed } from 'vue';
import { getRepositories } from '~/repositories';
import { usePaginatedQuery } from './usePaginatedQuery';
import { useSanitizedSearch } from './useSanitizedSearch';
import type { UseSanitizedSearchOptions, SanitizedSearch } from './useSanitizedSearch';
import type { PaginatedQuery } from './usePaginatedQuery';
import type { MediaSummary, MediaType } from '~/types';
import type { MaybeRefOrGetter } from 'vue';

export interface SearchResults extends PaginatedQuery<MediaSummary> {
  search: SanitizedSearch;
}

export interface UseSearchResultsOptions extends UseSanitizedSearchOptions {
  /** Filtra por tipo (vod/series/live) — ex.: busca "só séries" vinda da categoria. */
  type?: MaybeRefOrGetter<MediaType | null | undefined>;
}

/**
 * Busca paginada com debounce e normalização.
 * Só consulta quando a query está `isReady`; limpa os resultados quando o usuário apaga.
 */
export function useSearchResults(options: UseSearchResultsOptions = {}): SearchResults {
  const search = useSanitizedSearch(options);
  const repository = getRepositories().media;
  const type = computed(() => toValue(options.type) ?? null);

  const fetchPage = (cursor: string | null, signal: AbortSignal) =>
    repository.search({ q: search.normalizedQuery.value, cursor, type: type.value ?? undefined }, { signal });

  const query = usePaginatedQuery<MediaSummary>(fetchPage, { immediate: false });

  watch(
    [search.normalizedQuery, type],
    () => {
      if (search.isReady.value) query.refresh();
      else query.reset();
    },
    { immediate: true },
  );

  return { ...query, search };
}
