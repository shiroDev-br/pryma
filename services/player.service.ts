import { useRuntimeConfig } from '#imports';
import { ENDPOINTS } from '~/constants';
import { getAccessToken } from '~/utils/tokenStorage';
import type { HeartbeatPayload } from '~/types';

/**
 * Heartbeat de reprodução — fire-and-forget.
 * Usa fetch keepalive (não sendBeacon: beacon não leva header Authorization)
 * para sobreviver a navegação/fechamento da aba.
 * Erros são engolidos de propósito: nunca devem derrubar a reprodução.
 */
export function sendPlaybackHeartbeat(payload: HeartbeatPayload): void {
  if (typeof navigator === 'undefined') return;

  const base = String(useRuntimeConfig().public.apiBaseUrl || '').replace(/\/+$/, '');
  const url = base + ENDPOINTS.heartbeat;
  const token = getAccessToken();

  fetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    keepalive: true,
  }).catch(() => undefined);
}
