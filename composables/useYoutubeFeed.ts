import { getRepositories } from '~/repositories';
import { usePaginatedQuery, type PaginatedQuery } from './usePaginatedQuery';
import type { YoutubeVideo } from '~/types';

/**
 * Feed da aba YouTube/Música: busca (quando há texto) ou "em alta" por categoria.
 * A categoria também filtra a busca (Música busca só na categoria 10).
 * Reinicia sozinho quando a busca ou a categoria mudam.
 */
export function useYoutubeFeed(
  query: () => string,
  category: () => string | null,
): PaginatedQuery<YoutubeVideo> {
  const repository = getRepositories().youtube;

  return usePaginatedQuery<YoutubeVideo>(
    (cursor, signal) => {
      const q = query().trim();
      return q
        ? repository.search({ q, category: category(), cursor }, { signal })
        : repository.trending({ category: category(), cursor }, { signal });
    },
    { immediate: true, resetOn: [query, category] },
  );
}
