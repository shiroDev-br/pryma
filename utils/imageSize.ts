/**
 * Tamanho das artes do TMDB.
 *
 * O provedor manda pôster em w1280 (e às vezes `original`). Decodificado, cada
 * um ocupa ~10 MB de memória; uma grade de 48 cards passava de 400 MB e o Fire
 * Stick (1 GB) ficava sem memória: imagens deixavam de carregar e o player
 * engasgava. O TMDB serve qualquer tamanho trocando o trecho `/t/p/<tamanho>/`.
 */
export type TmdbSize = 'w185' | 'w342' | 'w500' | 'w780' | 'w1280';

const TMDB = /^(https?:\/\/image\.tmdb\.org\/t\/p\/)([^/]+)(\/.+)$/;

/** Reduz a arte do TMDB para `size` (só reduz — nunca pede maior que a original). */
export function tmdbSized<T extends string | null | undefined>(url: T, size: TmdbSize): T {
  if (!url) return url;
  const match = TMDB.exec(url);
  if (!match) return url;
  const current = /^w(\d+)$/.exec(match[2]);
  const wanted = Number(size.slice(1));
  if (current && Number(current[1]) <= wanted) return url;
  return `${match[1]}${size}${match[3]}` as T;
}

/** Item de lista (card/linha): pôster pequeno. */
export function withListArt<T extends { thumbnailUrl: string | null; logoUrl: string | null }>(item: T): T {
  return {
    ...item,
    thumbnailUrl: tmdbSized(item.thumbnailUrl, 'w342'),
    logoUrl: tmdbSized(item.logoUrl, 'w342'),
  };
}

const YT_THUMB = /^(https?:\/\/i\d?\.ytimg\.com\/vi(?:_webp)?\/[^/]+\/)(?:maxresdefault|sddefault)(\.\w+)$/;

/** Miniatura do YouTube em tamanho de card: a API devolve a `maxres`
 *  (1280×720, ~3,7 MB decodificada) — `hqdefault` (480×360) basta. */
export function youtubeCardThumb(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(YT_THUMB, '$1hqdefault$2');
}
