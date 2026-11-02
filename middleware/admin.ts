import { useAuthStore } from '~/stores/auth';
import { getAccessToken } from '~/utils/tokenStorage';
import { ADMIN_LOGIN_PATH, isAdmin, isStaff } from '~/utils/staff';

/**
 * Guarda do painel (/admin): só admin e revendedor entram.
 *
 * É só UX — a autorização real é da API (todas as rotas do painel exigem o
 * papel no servidor). Páginas só de admin declaram `meta.adminOnly`.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const store = useAuthStore();
  if (!store.hydrated && getAccessToken()) await store.hydrate();

  if (!isStaff(store.user)) {
    return navigateTo({ path: ADMIN_LOGIN_PATH, query: to.fullPath !== '/admin' ? { next: to.fullPath } : {} });
  }
  if (to.meta.adminOnly && !isAdmin(store.user)) return navigateTo('/admin');
});
