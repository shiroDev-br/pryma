import { computed } from 'vue';
import { useAsyncData } from '#imports';
import { getRepositories } from '~/repositories';
import type { MtvPlaylist } from '~/types';

export interface MtvPlaylistsResult {
  playlists: ComputedRef<MtvPlaylist[]>;
  isLoading: ComputedRef<boolean>;
  error: Ref<Error | null>;
  refresh: () => Promise<void>;
}

/** Playlists MTV são poucas e estáveis — cacheadas em sessão (payload/SSR + hidratação). */
export function useMtvPlaylists(): MtvPlaylistsResult {
  const repository = getRepositories().mtv;

  const { data, status, error, refresh } = useAsyncData(
    'mtv-playlists',
    () => repository.listPlaylists(),
    { transform: (result) => result.items },
  );

  const playlists = computed(() => data.value ?? []);
  const isLoading = computed(() => status.value === 'pending');

  return { playlists, isLoading, error, refresh };
}
