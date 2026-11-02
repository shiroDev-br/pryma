import { useRuntimeConfig } from '#imports';
import { createHttpClient } from '~/services/http';
import { mockMediaRepository } from '~/mocks/media.mock';
import { mockAuthRepository } from '~/mocks/auth.mock';
import { mockMtvRepository } from '~/mocks/mtv.mock';
import { mockYoutubeRepository } from '~/mocks/youtube.mock';
import { clearTokens } from '~/utils/tokenStorage';
import { createHttpMediaRepository } from './media.repository';
import { createHttpAuthRepository } from './auth.repository';
import { createHttpMtvRepository } from './mtv.repository';
import { createHttpYoutubeRepository } from './youtube.repository';
import { createHttpAdminRepository } from './admin.repository';
import { createHttpWallpaperRepository, emptyWallpaperRepository } from './wallpaper.repository';
import type {
  AdminRepository,
  AuthRepository,
  MediaRepository,
  MtvRepository,
  WallpaperRepository,
  YoutubeRepository,
} from './contracts';

export type {
  AdminRepository,
  AuthRepository,
  MediaRepository,
  MtvRepository,
  WallpaperRepository,
  YoutubeRepository,
} from './contracts';

interface RepositoryBundle {
  media: MediaRepository;
  auth: AuthRepository;
  mtv: MtvRepository;
  youtube: YoutubeRepository;
  /** Fundos animados — no mock a lista vem vazia (só os fundos locais). */
  wallpapers: WallpaperRepository;
  /** Painel de staff — sempre HTTP (o mock não tem revendedores/listas). */
  admin: AdminRepository;
}

let bundle: RepositoryBundle | null = null;
let refreshInFlight: Promise<boolean> | null = null;

function isMockMode(): boolean {
  return useRuntimeConfig().public.dataMode !== 'live';
}

function createBundle(): RepositoryBundle {
  let authRepository: AuthRepository;

  const client = createHttpClient({
    onSessionExpired: () => {
      if (!refreshInFlight) {
        refreshInFlight = authRepository
          .refresh()
          .then(() => true)
          .catch(() => {
            // Refresh recusado — a sessão local está morta.
            clearTokens();
            return false;
          })
          .finally(() => {
            refreshInFlight = null;
          });
      }
      return refreshInFlight;
    },
  });

  authRepository = isMockMode() ? mockAuthRepository : createHttpAuthRepository(client);

  return {
    auth: authRepository,
    media: isMockMode() ? mockMediaRepository : createHttpMediaRepository(client),
    mtv: isMockMode() ? mockMtvRepository : createHttpMtvRepository(client),
    youtube: isMockMode() ? mockYoutubeRepository : createHttpYoutubeRepository(client),
    wallpapers: isMockMode() ? emptyWallpaperRepository : createHttpWallpaperRepository(client),
    admin: createHttpAdminRepository(client),
  };
}

/**
 * Ponto único de acesso à camada de dados.
 * Composables chamam `getRepositories().media` — nunca mock, nunca fetch direto.
 */
export function getRepositories(): RepositoryBundle {
  if (!bundle) bundle = createBundle();
  return bundle;
}
