import { createApiError } from '~/utils/errors';
import { sanitizeEmail } from '~/utils/sanitize';
import { simulateLatency } from './latency';
import type { AuthRepository } from '~/repositories/contracts';
import type { User } from '~/types';

/** Credenciais do modo dev — usadas pela página /dev. */
export const MOCK_DEMO_CREDENTIALS = {
  email: 'demo@iptv.dev',
  password: 'password',
} as const;

const MOCK_SESSION_KEY = 'iptv.mock.session';

/** Só persiste onde existe sessionStorage (browser); SSR/memory fica sem sessão. */
const canPersist = typeof sessionStorage !== 'undefined';

function buildUser(email: string): User {
  const displayName = email.split('@')[0] || 'Viewer';

  return {
    id: `user_${email}`,
    email,
    displayName: displayName.charAt(0).toUpperCase() + displayName.slice(1),
    role: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

/** Sessão persistida em sessionStorage para sobreviver a reload no dev (fallback em memória no SSR). */
let memorySession: User | null = null;

function readSession(): User | null {
  if (!canPersist) return memorySession;
  const raw = sessionStorage.getItem(MOCK_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    sessionStorage.removeItem(MOCK_SESSION_KEY);
    return null;
  }
}

function writeSession(user: User | null): void {
  memorySession = user;
  if (!canPersist) return;
  if (user) sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
  else sessionStorage.removeItem(MOCK_SESSION_KEY);
}

function requireSession(): User {
  const user = readSession();
  if (!user) {
    throw createApiError(401, 'session_expired', 'Sessão inválida ou expirada.');
  }
  return user;
}

export const mockAuthRepository: AuthRepository = {
  async login(payload) {
    await simulateLatency();

    const email = sanitizeEmail(payload.email);
    if (email !== MOCK_DEMO_CREDENTIALS.email || payload.password !== MOCK_DEMO_CREDENTIALS.password) {
      throw createApiError(401, 'invalid_credentials', 'E-mail ou senha inválidos.');
    }

    const user = buildUser(email);
    writeSession(user);
    return { user };
  },

  async logout() {
    await simulateLatency(40, 120);
    writeSession(null);
  },

  async refresh() {
    await simulateLatency(40, 120);
    return { user: requireSession() };
  },

  async me() {
    await simulateLatency(40, 120);
    return requireSession();
  },

  async updateProfile(payload) {
    await simulateLatency();

    const user = requireSession();

    if (payload.newPassword && payload.currentPassword !== MOCK_DEMO_CREDENTIALS.password) {
      throw createApiError(403, 'invalid_credentials', 'Senha atual incorreta.');
    }

    const updated: User = { ...user, displayName: payload.displayName ?? user.displayName };
    writeSession(updated);
    return updated;
  },
};
