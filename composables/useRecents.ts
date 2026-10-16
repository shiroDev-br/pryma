import { onMounted, ref, shallowRef } from 'vue';
import { getRepositories } from '~/repositories';
import { getRecentMediaIds } from '~/utils/recentlyWatched';
import type { RecentsType } from '~/utils/recentlyWatched';
import type { MediaDetail, MediaSummary } from '~/types';

/**
 * "Continuar assistindo" — resolve os ids guardados no localStorage em cards
 * via API. Só roda no cliente: a montagem dispara a busca e a tela no servidor
 * sai vazia (a UI mostra o estado "nada assistido ainda" até o mount).
 */
export function useRecents(type: RecentsType) {
  const items = shallowRef<MediaSummary[]>([]);
  const isLoading = ref(false);

  onMounted(async () => {
    isLoading.value = true;
    try {
      const repository = getRepositories().media;
      const found = await Promise.all(
        getRecentMediaIds(type).map((id) => repository.getMedia(id).catch(() => null)),
      );
      items.value = found.filter((media): media is MediaDetail => media !== null);
    } finally {
      isLoading.value = false;
    }
  });

  return { items, isLoading };
}
