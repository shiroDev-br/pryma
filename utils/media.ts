import type { MediaSummary } from '~/types';

/**
 * Destino de um item da listagem:
 * episódio de série vai pra página de escolha de episódio; o resto vai pro player.
 */
export function mediaHref(media: Pick<MediaSummary, 'slug' | 'type' | 'seriesId'>): string {
  if (media.type === 'series' && media.seriesId) return `/series/${media.seriesId}`;
  return `/medias/${media.slug}`;
}
