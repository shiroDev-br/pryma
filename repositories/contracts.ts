import type {
  ApiRequestOptions,
  AuthResponse,
  Category,
  LoginPayload,
  MediaDetail,
  MediaQuery,
  MediaSummary,
  MtvClip,
  MtvPlaylist,
  NowNext,
  Paginated,
  PlaybackSession,
  SearchParams,
  Suggestion,
  UpdateProfilePayload,
  User,
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

/** Contrato da sessão/conta. Em produção o cookie httpOnly é gerido pelo proxy Nitro. */
export interface AuthRepository {
  login(payload: LoginPayload, options?: ApiRequestOptions): Promise<AuthResponse>;
  logout(options?: ApiRequestOptions): Promise<void>;
  refresh(options?: ApiRequestOptions): Promise<AuthResponse>;
  me(options?: ApiRequestOptions): Promise<User>;
  updateProfile(payload: UpdateProfilePayload, options?: ApiRequestOptions): Promise<User>;
}
