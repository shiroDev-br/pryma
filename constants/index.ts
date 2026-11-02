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
    image: '/img/cards/filmes.webp',
  },
  series: {
    label: 'Séries',
    type: 'series',
    description: 'Suas séries favoritas, sempre disponíveis.',
    icon: 'material-symbols:tv-gen-outline-rounded',
    image: '/img/cards/series.webp',
  },
  tv: {
    label: 'TV ao Vivo',
    type: 'live',
    description: 'Canais ao vivo, 24 horas por dia.',
    icon: 'material-symbols:live-tv',
    image: '/img/cards/canais.webp',
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
  mtvPlaylists: `${API_PREFIX}/mtv/playlists`,
  mtvClips: `${API_PREFIX}/mtv/clips`,
  youtubeTrending: `${API_PREFIX}/youtube/trending`,
  youtubeSearch: `${API_PREFIX}/youtube/search`,
  // Painel (/admin) — staff only.
  users: `${API_PREFIX}/users`,
  userById: (id: string) => `${API_PREFIX}/users/${encodeURIComponent(id)}`,
  userPlaylistSync: (id: string) => `${API_PREFIX}/users/${encodeURIComponent(id)}/playlist/sync`,
  resellers: `${API_PREFIX}/resellers`,
  servers: `${API_PREFIX}/servers`,
  serverById: (id: string) => `${API_PREFIX}/servers/${encodeURIComponent(id)}`,
  // Fundos animados — app (logado) e painel (admin).
  wallpapers: `${API_PREFIX}/wallpapers`,
  wallpaperCategories: `${API_PREFIX}/wallpapers/categories`,
  adminWallpapers: `${API_PREFIX}/admin/wallpapers`,
  adminWallpaperSource: `${API_PREFIX}/admin/wallpapers/source`,
  adminWallpaperById: (id: string) => `${API_PREFIX}/admin/wallpapers/${encodeURIComponent(id)}`,
  adminWallpaperRetry: (id: string) => `${API_PREFIX}/admin/wallpapers/${encodeURIComponent(id)}/retry`,
} as const;

/** Painel — página da tabela de clientes e intervalo de atualização do status. */
export const ADMIN_PAGE_SIZE = 25;
export const ADMIN_POLL_MS = 5_000;

/** Fundos animados — página da grade de escolha. */
export const WALLPAPERS_PAGE_SIZE = 24;

/** MTV — tamanho de página de clipes. */
export const MTV_CLIPS_PAGE_SIZE = 50;

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

/** Chaves de persistência local (preferências, nunca credenciais). */
export const STORAGE_KEYS = {
  recentSearches: 'iptv.recentSearches',
  favorites: 'iptv.favorites',
  /** Dados dos favoritos (título, logo…) — a aba Favoritos da TV ao vivo lista sem ir à API. */
  favoriteItems: 'iptv.favoriteItems',
  footballTeam: 'iptv.footballTeam',
  footballFixture: 'iptv.footballFixture',
  background: 'iptv.background',
  /** Mídia do fundo animado escolhido — o app desenha o fundo sem ir à API. */
  backgroundMedia: 'iptv.backgroundMedia',
  /** Fundo animado ligado/desligado (desligado = só o pôster). */
  backgroundMotion: 'iptv.backgroundMotion',
  /** Posições de reprodução por mediaId — "continuar assistindo" local. */
  watchProgress: 'iptv.watchProgress',
  /** Último episódio assistido por seriesId — marcador nas listagens. */
  seriesProgress: 'iptv.seriesProgress',
  /** Volume e mudo do player (nome antigo mantido: a escolha salva continua valendo). */
  playerAudio: 'iptv-plyr',
  /** Player com a imagem esticada até preencher a tela. */
  playerFill: 'iptv.playerFill',
  /** Vinheta de abertura já tocou nesta abertura do app (sessionStorage). */
  introShown: 'iptv.introShown',
  /** Última fonte que funcionou por canal ao vivo (versão + formato). */
  liveGoodSources: 'iptv.liveGoodSources',
} as const;

export const MAX_RECENT_SEARCHES = 10;

/** Live/EPG — passa pela base da API (/api/v1). */
export const LIVE_ENDPOINTS = {
  nowNext: (id: string) => `/api/v1/media/${encodeURIComponent(id)}/now-next`,
  /** Jogos do dia × EPG → canais que transmitem cada jogo. */
  fixtureChannels: '/api/v1/live/fixture-channels',
} as const;

export const FOOTBALL_MIN_SEARCH_CHARS = 3;
export const FOOTBALL_SEARCH_DEBOUNCE_MS = 400;
export const FOOTBALL_RESULT_LIMIT = 12;

/**
 * Pôster vazio (GIF 1×1 transparente) para todo <video>. Sem ele o WebView do
 * Android desenha o pôster padrão — tela cinza com ícone de play — até o 1º quadro.
 */
export const BLANK_POSTER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
