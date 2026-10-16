import { useRuntimeConfig } from '#imports';
import { createHttpClient } from '~/services/http';
import { mockMediaRepository } from '~/mocks/media.mock';
import { mockAuthRepository } from '~/mocks/auth.mock';
import { mockMtvRepository } from '~/mocks/mtv.mock';
import { clearTokens } from '~/utils/tokenStorage';
import { createHttpMediaRepository } from './media.repository';
import { createHttpAuthRepository } from './auth.repository';
import { createHttpMtvRepository } from './mtv.repository';
import type { AuthRepository, MediaRepository, MtvRepository } from './contracts';

export type { AuthRepository, MediaRepository, MtvRepository } from './contracts';

interface RepositoryBundle {
  media: MediaRepository;
  auth: AuthRepository;
  mtv: MtvRepository;
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
