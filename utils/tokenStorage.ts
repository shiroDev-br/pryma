/**
 * Sessão em Bearer token (localStorage) — contrato com o backend (SPEC v1):
 * login/refresh devolvem `accessToken`/`refreshToken` no corpo e o client
 * envia `Authorization: Bearer <accessToken>` em toda request autenticada.
 * Nada disso é credencial de login: senha nunca toca o storage.
 */

const ACCESS_KEY = 'iptv.accessToken';
const REFRESH_KEY = 'iptv.refreshToken';

function read(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage indisponível/cheio — sessão fica só em memória.
  }
}

export function getAccessToken(): string | null {
  return read(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return read(REFRESH_KEY);
}

/** Grava os tokens devolvidos por login/refresh (refresh ausente mantém o atual). */
export function saveTokens(accessToken: string, refreshToken?: string): void {
  write(ACCESS_KEY, accessToken);
  if (refreshToken) write(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  write(ACCESS_KEY, null);
  write(REFRESH_KEY, null);
}
