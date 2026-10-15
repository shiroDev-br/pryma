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
    { watch: [mediaId] },
  );

  const media = computed(() => data.value ?? null);
  const isLoading = computed(() => status.value === 'pending');
  const notFound = computed(() => status.value === 'error' && (error.value as { status?: number })?.status === 404);

  return { media, isLoading, notFound, error, refresh };
}
