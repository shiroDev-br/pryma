import type { MediaSummary } from '~/types';

/**
 * Destino de um item da listagem:
 * episódio de série vai pra página de escolha de episódio; o resto vai pro player.
 */
/**
 * Destino de um card de catálogo: filme e série abrem a tela de detalhes
 * (sinopse, trailer, Assistir/Favoritar); canal ao vivo vai direto pro player.
 */
export function detailHref(media: Pick<MediaSummary, 'slug' | 'type' | 'seriesId'>): string {
  if (media.type === 'vod' || media.type === 'series') return `/detalhes/${media.slug}`;
  return mediaHref(media);
}

export function mediaHref(media: Pick<MediaSummary, 'slug' | 'type' | 'seriesId'>): string {
  if (media.type === 'series' && media.seriesId) return `/series/${media.seriesId}`;
  return `/medias/${media.slug}`;
}
