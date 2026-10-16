import { getRepositories } from '~/repositories';
import { usePaginatedQuery } from './usePaginatedQuery';
import { MTV_CLIPS_PAGE_SIZE } from '~/constants';
import type { PaginatedQuery } from './usePaginatedQuery';
import type { MtvClip } from '~/types';

/**
 * Clipes de uma playlist MTV — lista paginada por cursor.
 * A playlist é fixa por instância: o componente deve remountar (`:key`) ao trocar.
 */
export function useMtvClips(playlistId: string): PaginatedQuery<MtvClip> {
  const repository = getRepositories().mtv;

  return usePaginatedQuery<MtvClip>(
    (cursor, signal) =>
      repository.listClips(
        { playlist: playlistId, limit: MTV_CLIPS_PAGE_SIZE, cursor },
        { signal },
      ),
    { immediate: true },
  );
}
