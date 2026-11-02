import { computed, toValue } from 'vue';
import { useAsyncData } from '#imports';
import { getRepositories } from '~/repositories';

/** Detalhe de um item — chaveada por id, com watch p/ troca de rota. */
export function useMediaDetail(id: MaybeRefOrGetter<string>) {
  const repository = getRepositories().media;
  const mediaId = computed(() => toValue(id));

  const { data, status, error, refresh } = useAsyncData(
    () => `media-${mediaId.value}`,
    () => repository.getMedia(mediaId.value),
    // `server: false`: exige login, e o token só existe no cliente (no servidor: 401).
    { watch: [mediaId], server: false },
  );

  const media = computed(() => data.value ?? null);
  // `idle` = ainda no servidor/hidratação: o pedido sai logo depois de montar.
  const isLoading = computed(() => status.value === 'pending' || status.value === 'idle');
  const notFound = computed(() => status.value === 'error' && (error.value as { status?: number })?.status === 404);

  return { media, isLoading, notFound, error, refresh };
}
