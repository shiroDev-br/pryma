import type {
  AdminWallpaper,
  AdminWallpaperList,
  AdminWallpaperQuery,
  ApiRequestOptions,
  AuthResponse,
  Category,
  ClientAccount,
  ClientList,
  ClientQuery,
  CreatedReseller,
  CreateResellerPayload,
  FixtureChannels,
  FixtureQuery,
  LoginPayload,
  MediaDetail,
  MediaQuery,
  MediaSummary,
  MtvClip,
  YoutubeVideo,
  MtvPlaylist,
  NowNext,
  Paginated,
  PlaybackSession,
  Reseller,
  SearchParams,
  Server,
  ServerPayload,
  Suggestion,
  UpdateProfilePayload,
  User,
  SourceSort,
  SourceWallpaperPage,
  Wallpaper,
  WallpaperCategory,
  WallpaperImportItem,
  WallpaperImportResult,
} from '~/types';

/**
 * Contrato único da camada de dados de mídia.
 * Duas implementações: mock (dev) e http (produção) — services nunca sabem qual está em uso.
 */
export interface MediaRepository {
  listCategories(options?: ApiRequestOptions): Promise<{ items: Category[] }>;
  listMedia(query: MediaQuery, options?: ApiRequestOptions): Promise<Paginated<MediaSummary>>;
  getMedia(id: string, options?: ApiRequestOptions): Promise<MediaDetail>;
  getPlayback(id: string, options?: ApiRequestOptions): Promise<PlaybackSession>;
  getNowNext(id: string, options?: ApiRequestOptions): Promise<NowNext>;
  /** Canais do usuário que transmitem cada jogo ao vivo (cruzamento com o EPG na API). */
  fixtureChannels(fixtures: FixtureQuery[], options?: ApiRequestOptions): Promise<FixtureChannels[]>;
  search(params: SearchParams, options?: ApiRequestOptions): Promise<Paginated<MediaSummary>>;
  suggest(q: string, options?: ApiRequestOptions): Promise<Suggestion[]>;
}

/** Contrato MTV — playlists e clipes (§6.14/6.15). */
export interface MtvRepository {
  listPlaylists(options?: ApiRequestOptions): Promise<{ items: MtvPlaylist[] }>;
  listClips(
    params: { playlist: string; limit?: number; cursor?: string | null },
    options?: ApiRequestOptions,
  ): Promise<Paginated<MtvClip>>;
}

/** Feed do YouTube (proxy da API — a chave do Google fica no servidor). */
export interface YoutubeRepository {
  /** Em alta no Brasil; `category` = videoCategoryId do YouTube (null = geral). */
  trending(
    params: { category?: string | null; cursor?: string | null },
    options?: ApiRequestOptions,
  ): Promise<Paginated<YoutubeVideo>>;
  search(
    params: { q: string; category?: string | null; cursor?: string | null },
    options?: ApiRequestOptions,
  ): Promise<Paginated<YoutubeVideo>>;
}

/** Fundos animados prontos (app logado). */
export interface WallpaperRepository {
  list(
    params: { category?: string | null; limit?: number; cursor?: string | null },
    options?: ApiRequestOptions,
  ): Promise<Paginated<Wallpaper>>;
  listCategories(options?: ApiRequestOptions): Promise<{ items: WallpaperCategory[] }>;
}

/** Contrato da sessão/conta. Em produção o cookie httpOnly é gerido pelo proxy Nitro. */
export interface AuthRepository {
  login(payload: LoginPayload, options?: ApiRequestOptions): Promise<AuthResponse>;
  logout(options?: ApiRequestOptions): Promise<void>;
  refresh(options?: ApiRequestOptions): Promise<AuthResponse>;
  me(options?: ApiRequestOptions): Promise<User>;
  updateProfile(payload: UpdateProfilePayload, options?: ApiRequestOptions): Promise<User>;
}

/** Contrato do painel (/admin) — só existe em modo live (sem mock). */
export interface AdminRepository {
  listClients(query: ClientQuery, options?: ApiRequestOptions): Promise<ClientList>;
  syncClient(id: string, options?: ApiRequestOptions): Promise<ClientAccount>;
  deleteClient(id: string, options?: ApiRequestOptions): Promise<void>;
  listResellers(options?: ApiRequestOptions): Promise<{ items: Reseller[] }>;
  createReseller(payload: CreateResellerPayload, options?: ApiRequestOptions): Promise<CreatedReseller>;
  listServers(options?: ApiRequestOptions): Promise<{ items: Server[] }>;
  createServer(payload: ServerPayload, options?: ApiRequestOptions): Promise<Server>;
  updateServer(id: string, payload: Partial<ServerPayload>, options?: ApiRequestOptions): Promise<Server>;
  deleteServer(id: string, options?: ApiRequestOptions): Promise<void>;
  listWallpapers(query: AdminWallpaperQuery, options?: ApiRequestOptions): Promise<AdminWallpaperList>;
  browseWallpaperSource(
    params: { page: number; sort: SourceSort },
    options?: ApiRequestOptions,
  ): Promise<SourceWallpaperPage>;
  importWallpapers(items: WallpaperImportItem[], options?: ApiRequestOptions): Promise<WallpaperImportResult>;
  updateWallpaper(
    id: string,
    payload: { title?: string; hidden?: boolean },
    options?: ApiRequestOptions,
  ): Promise<AdminWallpaper>;
  retryWallpaper(id: string, options?: ApiRequestOptions): Promise<AdminWallpaper>;
  deleteWallpaper(id: string, options?: ApiRequestOptions): Promise<void>;
}
