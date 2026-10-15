import { defineStore } from 'pinia';
import { getRepositories } from '~/repositories';
import { toApiError } from '~/utils/errors';
import type { ApiError, RequestStatus, UpdateProfilePayload, User, LoginPayload } from '~/types';

interface AuthState {
  user: User | null;
  status: RequestStatus;
  error: ApiError | null;
  /** Evita re-hidratar a sessão repetidamente. */
  hydrated: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    status: 'idle',
    error: null,
    hydrated: false,
  }),

  getters: {
    isAuthenticated: (state): boolean => state.user !== null,
    displayName: (state): string => state.user?.displayName ?? '',
  },

  actions: {
    /** Busca a sessão atual (GET /auth/me). Idempotente e protegida contra re-hidratação. */
    async hydrate(force = false): Promise<void> {
      if (this.hydrated && !force) return;

      const repository = getRepositories().auth;
      this.status = 'pending';

      try {
        this.user = await repository.me();
        this.status = 'success';
        this.error = null;
        this.hydrated = true;
      } catch (error) {
        this.user = null;
        this.error = toApiError(error);
        this.status = 'error';
        this.hydrated = true;
      }
    },

    async login(payload: LoginPayload): Promise<boolean> {
      const repository = getRepositories().auth;
      this.status = 'pending';
      this.error = null;

      try {
        const { user } = await repository.login(payload);
        this.user = user;
        this.status = 'success';
        this.hydrated = true;
        return true;
      } catch (error) {
        this.error = toApiError(error);
        this.status = 'error';
        return false;
      }
    },

    async logout(): Promise<void> {
      const repository = getRepositories().auth;

      try {
        await repository.logout();
      } catch {
        // Logout é idempotente — limpa o estado local mesmo se a request falhar.
      } finally {
        this.user = null;
        this.status = 'idle';
        this.error = null;
        this.hydrated = true;
      }
    },

    async updateProfile(payload: UpdateProfilePayload): Promise<boolean> {
      const repository = getRepositories().auth;
      this.status = 'pending';
      this.error = null;

      try {
        this.user = await repository.updateProfile(payload);
        this.status = 'success';
        return true;
      } catch (error) {
        this.error = toApiError(error);
        this.status = 'error';
        return false;
      }
    },

    clearError(): void {
      this.error = null;
    },
  },
});
