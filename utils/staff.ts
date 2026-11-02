import type { StaffRole, User } from '~/types';

/** Rotas do painel de staff — fora do guard do app e fora do build do APK. */
export const ADMIN_BASE_PATH = '/admin';
export const ADMIN_LOGIN_PATH = '/admin/login';

export function isAdminPath(path: string): boolean {
  return path === ADMIN_BASE_PATH || path.startsWith(`${ADMIN_BASE_PATH}/`);
}

export function isStaff(user: User | null | undefined): user is User & { role: StaffRole } {
  return user?.role === 'admin' || user?.role === 'reseller';
}

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'admin';
}
