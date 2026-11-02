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
    // `server: false`: exige login, e o token só existe no cliente (no servidor: 401).
    { transform: (result) => result.items, server: false },
  );

  const playlists = computed(() => data.value ?? []);
  // `idle` = ainda no servidor/hidratação: o pedido sai logo depois de montar.
  const isLoading = computed(() => status.value === 'pending' || status.value === 'idle');

  return { playlists, isLoading, error, refresh };
}
