export type MediaType = 'live' | 'vod' | 'series';

export type MediaQuality = '4K' | '1080p' | '720p' | '480p';

export type MediaSort =
  | 'title'
  | '-title'
  | 'added'
  | '-added'
  | 'year'
  | '-year'
  | 'episode'
  | '-episode';

/** Item leve de listagem — nunca inclui descrição, atores ou gêneros. */
export interface MediaSummary {
  id: string;
  title: string;
  slug: string;
  type: MediaType;
  categoryId: string | null;
  categoryName: string | null;
  logoUrl: string | null;
  thumbnailUrl: string | null;
  year: number | null;
  quality: MediaQuality | null;
  durationSec: number | null;
  isLive: boolean;
  /** Slug do grupo da série (título sem SxxEyy) — null em live/vod. */
  seriesId: string | null;
  /** Temporada (apenas episódios). */
  season: number | null;
  /** Episódio (apenas episódios; null em "S01" sem E). */
  episode: number | null;
}

export interface MediaDetail extends MediaSummary {
  description: string | null;
  genres: string[];
  actors: string[];
  addedAt: string;
  streamCount: number;
  /** Programação do canal (EPG) — datas em ISO 8601. */
  guide: GuideProgram[] | null;
  /** Id do trailer no YouTube (filmes/séries do provedor) — ausente quando não há. */
  trailerId?: string | null;
  /** Arte larga de fundo (backdrop) — a tela de detalhes cai no pôster sem ela. */
  backdropUrl?: string | null;
  /** Nota do provedor (0–10). */
  rating?: number | null;
  director?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  itemCount: number;
  /** Seção da categoria quando o catálogo vem do servidor Xtream; ausente na lista legada. */
  type?: MediaType | null;
}

export type PlaybackProtocol = 'hls' | 'dash' | 'file';

export interface PlaybackSource {
  url: string;
  protocol: PlaybackProtocol;
}

export interface PlaybackSession {
  mediaId: string;
  url: string;
  protocol: PlaybackProtocol;
  headers: Record<string, string> | null;
  expiresAt: string;
  /** Mesmo canal em outro formato (ao vivo Xtream: .ts ↔ .m3u8) — fallback quando trava. */
  alternates?: PlaybackSource[];
}

export interface Suggestion {
  value: string;
  type: 'title' | 'category' | 'genre' | 'actor';
  count: number;
}

export interface HeartbeatPayload {
  mediaId: string;
  sessionId: string;
  positionSec: number;
}

export interface MediaQuery {
  limit?: number;
  cursor?: string | null;
  category?: string;
  type?: MediaType;
  sort?: MediaSort;
  /** seriesId — lista os episódios da série ordenados por temporada/episódio. */
  series?: string;
  /** Filtra temporada — exige `series`. */
  season?: number;
}

export interface SearchParams {
  q: string;
  limit?: number;
  cursor?: string | null;
  type?: MediaType;
}

/** Agora/a seguir de um canal live — nulls quando não há EPG. */
export interface NowNext {
  now: GuideProgram | null;
  next: GuideProgram | null;
}

/** Programa da grade (EPG) de um canal ao vivo. Datas em ISO 8601. */
/** Jogo enviado à API para achar os canais que o transmitem (EPG). */
export interface FixtureQuery {
  id: number;
  home: string;
  away: string;
  /** Início do jogo em ISO (UTC). */
  kickoff: string;
}

/** Canais do usuário que transmitem um jogo ao vivo, melhor primeiro. */
export interface FixtureChannels {
  fixtureId: number;
  program: GuideProgram;
  channels: MediaSummary[];
}

export interface GuideProgram {
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  /** Marcador interno: true = está no ar agora */
  isNow?: boolean;
}

/* ── YouTube (feed da aba YouTube) ────────────────────────────────────── */

/** Vídeo do feed — só os que tocam no player embutido (sem Shorts/ao vivo). */
export interface YoutubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSec: number | null;
  viewCount: number | null;
  publishedAt: string | null;
}

/* ── MTV (§6.14/6.15) ─────────────────────────────────────────────────── */

/** Playlist de clipes MTV — id opaco (ex.: PL_80S). */
export interface MtvPlaylist {
  id: string;
  name: string;
  description: string;
  clipCount: number;
}

/** Clip dentro de uma playlist — videoId é o ID oficial do YouTube. */
export interface MtvClip {
  id: string;
  title: string;
  artist: string;
  playlistId: string;
  durationSec: number;
  thumbnailUrl: string;
}
