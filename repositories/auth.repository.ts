import type { HttpClient } from '~/services/http';
import { ENDPOINTS } from '~/constants';
import { createApiError } from '~/utils/errors';
import { clearTokens, getRefreshToken, saveTokens } from '~/utils/tokenStorage';
import type { AuthRepository } from '~/repositories/contracts';
import type { AuthResponse, LoginPayload, UpdateProfilePayload, User } from '~/types';

/**
 * Sessão via Bearer token em localStorage — contrato do backend (SPEC v1):
 *
 * - POST /auth/login   `{ username, password }`   -> `200 { user, accessToken, refreshToken }`
 * - POST /auth/refresh `{ refreshToken }`          -> `200 { user, accessToken, refreshToken }`
 * - POST /auth/logout   (sem body, sem token)      -> `204` (idempotente; estado stateless)
 * - GET/PATCH /auth/me  header `Authorization: Bearer <accessToken>` -> `200 User`
 *
 * Register não é feito pelo app (conta criada via painel admin).
 * Erros: `401 { detail: { code: "session_expired" } }` dispara 1 refresh +
 * retry único (http client); login errado: `401 { code: "invalid_credentials" }`.
 */
export function createHttpAuthRepository(client: HttpClient): AuthRepository {
  /** Toda resposta de login/refresh com token grava a sessão nova. */
  function persistSession(response: AuthResponse): AuthResponse {
    if (response.accessToken) {
      saveTokens(response.accessToken, response.refreshToken);
    }
    return response;
  }

  return {
    login: async (payload: LoginPayload, options) =>
      persistSession(await client.post<AuthResponse>(ENDPOINTS.login, payload, options)),

    logout: async (options) => {
      try {
        // Stateless: sem body — o servidor não muda nada; o client só descarta os tokens.
        await client.post<void>(ENDPOINTS.logout, undefined, options);
      } finally {
        clearTokens();
      }
    },

    refresh: async (options) => {
      const refreshToken = getRefreshToken();
      // Sem refresh token não há o que renovar — não chama a API (evitaria um
      // 422 de validação com `{ refreshToken: null }` e um refresh morto).
      if (!refreshToken) {
        throw createApiError(401, 'session_expired', 'Sessão inválida ou expirada.');
      }

      return persistSession(
        await client.post<AuthResponse>(
          ENDPOINTS.refresh,
          { refreshToken },
          // allowRefresh:false — o refresh em si nunca deve tentar se renovar de novo
          // (evita deadlock quando o refresh token também está expirado).
          { ...options, allowRefresh: false },
        ),
      );
    },

    me: (options) => client.get<User>(ENDPOINTS.me, undefined, options),

    updateProfile: (payload: UpdateProfilePayload, options) =>
      client.patch<User>(ENDPOINTS.me, payload, options),
  };
}
