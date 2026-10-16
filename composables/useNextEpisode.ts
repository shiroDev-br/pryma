import { ref, watch } from 'vue';
import { getRepositories } from '~/repositories';
import type { MediaDetail, MediaSummary } from '~/types';

/**
 * Próximo episódio da coletânea — card no overlay pausado.
 *
 * `media` é a mídia atual; o watcher zera o card a cada troca e só preenche se
 * a página ainda estiver na mesma mídia (guarda contra corrida de requests).
 */
export function useNextEpisode(media: () => MediaDetail | null) {
  const nextEpisode = ref<MediaSummary | null>(null);

  /**
   * Episódio seguinte da coletânea (`?series=` ordenado por temporada/episódio).
   * Segue o cursor quando a série tem mais que uma página de episódios.
   */
  async function findNextEpisode(seriesId: string, currentId: string): Promise<MediaSummary | null> {
    const repository = getRepositories().media;
    let cursor: string | null = null;

    for (let page = 0; page < 5; page += 1) {
      const result = await repository.listMedia({ series: seriesId, sort: 'episode', limit: 100, cursor });
      const index = result.items.findIndex((item) => item.id === currentId);

      if (index >= 0) {
        if (index + 1 < result.items.length) return result.items[index + 1];
        if (!result.nextCursor) return null;
        const next = await repository.listMedia({ series: seriesId, sort: 'episode', limit: 100, cursor: result.nextCursor });
        return next.items[0] ?? null;
      }

      if (!result.nextCursor) return null;
      cursor = result.nextCursor;
    }

    return null;
  }

  watch(media, async (value) => {
    nextEpisode.value = null;
    if (!value?.seriesId) return;

    const requestedId = value.id;

    try {
      const next = await findNextEpisode(value.seriesId, requestedId);
      if (media()?.id === requestedId) nextEpisode.value = next;
    } catch {
      /* série inexistente/erro — sem card de próximo episódio */
    }
  });

  function openNext(): void {
    if (!nextEpisode.value) return;
    navigateTo(`/medias/${nextEpisode.value.slug}`);
  }

  return { nextEpisode, openNext };
}
