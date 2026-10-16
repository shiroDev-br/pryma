import { useAuthStore } from '~/stores/auth';
import { getAccessToken } from '~/utils/tokenStorage';

/**
 * Guarda global de sessão: sem login válido você só acessa `/login`.
 *
 * - No servidor não existe `localStorage`, então o check real roda só no cliente
 *   (`import.meta.server` retorna cedo — o shell da rota protegida é renderizado
 *   e o cliente corrige na hidratação, sem bounce de `/login` pra usuário logado).
 * - Sem token local (modo live) → nem chama a API, vai direto pro login.
 * - Com token → valida/renova via `/auth/me` uma vez (hydrate) antes de liberar.
 * - Em modo mock a sessão vive em `sessionStorage` (sem token) — hydrate roda sempre.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const store = useAuthStore();
  const isPublic = to.path === '/login';

  const hasToken = !!getAccessToken();
  const isMock = useRuntimeConfig().public.dataMode !== 'live';

  // Só hidrata se faz sentido: token presente (live) ou modo mock (sessionStorage).
  if (!store.hydrated && (hasToken || isMock)) {
    await store.hydrate();
  }

  if (isPublic) {
    // Logado não volta pra tela de login.
    if (store.isAuthenticated) return navigateTo('/');
    return;
  }

  if (!store.isAuthenticated) return navigateTo('/login');
});
