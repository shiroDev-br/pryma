import type { HttpClient } from '~/services/http';
import { ENDPOINTS } from '~/constants';
import type { AuthRepository } from '~/repositories/contracts';
import type { AuthResponse, LoginPayload, UpdateProfilePayload, User } from '~/types';

/** Implementação HTTP do contrato de sessão — o cookie httpOnly é gerido pelo proxy Nitro. */
export function createHttpAuthRepository(client: HttpClient): AuthRepository {
  return {
    login: (payload: LoginPayload, options) =>
      client.post<AuthResponse>(ENDPOINTS.login, payload, options),

    logout: (options) => client.post<void>(ENDPOINTS.logout, undefined, options),

    refresh: (options) => client.post<AuthResponse>(ENDPOINTS.refresh, undefined, options),

    me: (options) => client.get<User>(ENDPOINTS.me, undefined, options),

    updateProfile: (payload: UpdateProfilePayload, options) =>
      client.patch<User>(ENDPOINTS.me, payload, options),
  };
}
