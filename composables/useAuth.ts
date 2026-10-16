import { useAuthStore } from '~/stores/auth';
import type { LoginPayload, UpdateProfilePayload, User } from '~/types';
import type { ApiError, RequestStatus } from '~/types';

export interface AuthComposable {
  user: ComputedRef<User | null>;
  isAuthenticated: ComputedRef<boolean>;
  status: ComputedRef<RequestStatus>;
  error: ComputedRef<ApiError | null>;
  login(payload: LoginPayload): Promise<boolean>;
  logout(): Promise<void>;
  updateProfile(payload: UpdateProfilePayload): Promise<boolean>;
  hydrate(force?: boolean): Promise<void>;
  clearError(): void;
}

/** Acesso ergonômico à sessão — toda a lógica vive no auth store. */
export function useAuth(): AuthComposable {
  const store = useAuthStore();

  return {
    user: computed(() => store.user),
    isAuthenticated: computed(() => store.isAuthenticated),
    status: computed(() => store.status),
    error: computed(() => store.error),
    login: (payload) => store.login(payload),
    logout: () => store.logout(),
    updateProfile: (payload) => store.updateProfile(payload),
    hydrate: (force) => store.hydrate(force),
    clearError: () => store.clearError(),
  };
}
