import { ENDPOINTS } from '~/constants';
import type { HeartbeatPayload } from '~/types';

/**
 * Heartbeat de reprodução — fire-and-forget.
 * Usa sendBeacon para sobreviver a navegação/fechamento da aba; fallback fetch keepalive.
 * Erros são engolidos de propósito: nunca devem derrubar a reprodução.
 */
export function sendPlaybackHeartbeat(payload: HeartbeatPayload): void {
  if (typeof navigator === 'undefined') return;

  const body = JSON.stringify(payload);
  const blob = new Blob([body], { type: 'application/json' });
  const beaconSent = navigator.sendBeacon?.(ENDPOINTS.heartbeat, blob) ?? false;

  if (beaconSent) return;

  fetch(ENDPOINTS.heartbeat, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => undefined);
}
