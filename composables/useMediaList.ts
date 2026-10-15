import { computed, toValue } from 'vue';
import { getRepositories } from '~/repositories';
import { usePaginatedQuery } from './usePaginatedQuery';
import type { PaginatedQuery } from './usePaginatedQuery';
import type { MediaQuery, MediaSummary } from '~/types';

/**
 * Listagem de mídia com paginação por cursor.
 * Reinicia automaticamente quando os params (categoria/tipo/sort) mudam.
 */
export function useMediaList(params: MaybeRefOrGetter<MediaQuery>): PaginatedQuery<MediaSummary> {
  const queryParams = computed(() => toValue(params));
  const repository = getRepositories().media;

  const fetchPage = (cursor: string | null, signal: AbortSignal) =>
    repository.listMedia({ ...queryParams.value, cursor }, { signal });

  // Serializa só os params de filtro (sem cursor) — identidade estável p/ reset.
  const resetKey = computed(() => JSON.stringify(queryParams.value));

  return usePaginatedQuery<MediaSummary>(fetchPage, { resetOn: [resetKey] });
}
