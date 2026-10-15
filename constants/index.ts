import type { MediaSort, MediaType } from '~/types';

export const API_PREFIX = '/api/v1';

/** Seções de primeira camada da home — cada uma filtra o catálogo por `type`. */
export interface SectionDef {
  label: string;
  type: MediaType;
  description: string;
  icon: string;
  image: string;
}

export const SECTIONS = {
  filmes: {
    label: 'Filmes',
    type: 'vod',
    description: 'Lançamentos, clássicos e muito mais.',
    icon: 'material-symbols:movie-outline-rounded',
    image: '/img/cards/filmes.svg',
  },
  series: {
    label: 'Séries',
    type: 'series',
    description: 'Suas séries favoritas, sempre disponíveis.',
    icon: 'material-symbols:tv-gen-outline-rounded',
    image: '/img/cards/series.svg',
  },
  tv: {
    label: 'TV ao Vivo',
    type: 'live',
    description: 'Canais ao vivo, 24 horas por dia.',
    icon: 'material-symbols:live-tv',
    image: '/img/cards/canais.svg',
  },
} as const satisfies Record<string, SectionDef>;

export type SectionKey = keyof typeof SECTIONS;

export function isSectionKey(value: string): value is SectionKey {
  return Object.prototype.hasOwnProperty.call(SECTIONS, value);
}

/** Fonte única dos caminhos. Nunca escrever paths à mão nos services. */
export const ENDPOINTS = {
  login: `${API_PREFIX}/auth/login`,
  refresh: `${API_PREFIX}/auth/refresh`,
  logout: `${API_PREFIX}/auth/logout`,
  me: `${API_PREFIX}/auth/me`,
  categories: `${API_PREFIX}/categories`,
  media: `${API_PREFIX}/media`,
  mediaById: (id: string) => `${API_PREFIX}/media/${encodeURIComponent(id)}`,
  playback: (id: string) => `${API_PREFIX}/media/${encodeURIComponent(id)}/playback`,
  search: `${API_PREFIX}/search`,
  suggest: `${API_PREFIX}/search/suggest`,
  heartbeat: `${API_PREFIX}/playback/heartbeat`,
} as const;

/** Paginação — servidor nunca devolve o catálogo inteiro. */
export const DEFAULT_PAGE_SIZE = 48;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_SORT: MediaSort = '-added';

/** Busca. */
export const DEBOUNCE_MS = 300;
export const MIN_SEARCH_CHARS = 2;
export const MAX_QUERY_LENGTH = 100;
export const SUGGEST_LIMIT = 8;
export const MAX_SUGGEST_LIMIT = 20;

/** Playback. */
export const HEARTBEAT_INTERVAL_MS = 30_000;
export const SKIP_SECONDS = 10;
/** HUD do player some depois de tanto tempo parado durante a reprodução. */
export const PLAYER_HUD_HIDE_MS = 3_500;
/** Posição salva abaixo disso não conta como "continuar assistindo". */
export const RESUME_MIN_SECONDS = 30;
/** Passou de X% do total, o título é dado como concluído (volta do início). */
export const RESUME_MAX_RATIO = 0.95;
/** Intervalo mínimo entre gravações de posição no localStorage. */
export const RESUME_SAVE_INTERVAL_MS = 10_000;
/** Limite de séries com "último assistido" guardado (LRU por updatedAt). */
export const SERIES_PROGRESS_MAX = 100;

/** HTTP. */
export const HTTP_TIMEOUT_MS = 15_000;
export const MAX_RETRIES = 2;

export const AUTH_COOKIE = 'iptv_session';

/** Chaves de persistência local (preferências, nunca credenciais). */
export const STORAGE_KEYS = {
  recentSearches: 'iptv.recentSearches',
  favorites: 'iptv.favorites',
  footballTeam: 'iptv.footballTeam',
  footballFixture: 'iptv.footballFixture',
  background: 'iptv.background',
  /** Posições de reprodução por mediaId — "continuar assistindo" local. */
  watchProgress: 'iptv.watchProgress',
  /** Último episódio assistido por seriesId — marcador nas listagens. */
  seriesProgress: 'iptv.seriesProgress',
} as const;

export const MAX_RECENT_SEARCHES = 10;

/** Futebol — endpoints do proxy Nitro (a chave da API nunca chega ao browser). */
export const FOOTBALL_ENDPOINTS = {
  teams: '/api/football/teams',
  next: '/api/football/next',
} as const;

/** Live/EPG — endpoints do proxy Nitro. */
export const LIVE_ENDPOINTS = {
  nowNext: (id: string) => `/api/v1/media/${encodeURIComponent(id)}/now-next`,
} as const;

export const FOOTBALL_MIN_SEARCH_CHARS = 3;
export const FOOTBALL_SEARCH_DEBOUNCE_MS = 400;
export const FOOTBALL_RESULT_LIMIT = 12;
