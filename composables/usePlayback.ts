import { ref, computed } from 'vue';
import { getRepositories } from '~/repositories';
import { toApiError } from '~/utils/errors';
import type { ApiError, PlaybackSession, RequestStatus } from '~/types';

/** Sessão vale no máximo isso em memória (e nunca além do `expiresAt` da URL assinada). */
const CACHE_TTL = 10 * 60 * 1000;
/** Margem para a URL não vencer logo depois de sair do cache. */
const EXPIRY_MARGIN_MS = 30_000;

const playbackCache = new Map<string, { session: PlaybackSession; expires: number }>();
/** Pedidos em voo: prefetch + load da mesma mídia viram um request só. */
const inFlight = new Map<string, Promise<PlaybackSession>>();

function getCachedSession(id: string): PlaybackSession | null {
  const entry = playbackCache.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    playbackCache.delete(id);
    return null;
  }
  return entry.session;
}

function setCachedSession(id: string, session: PlaybackSession): void {
  // Zapear passa por dezenas de canais: o que venceu sai a cada gravação.
  const now = Date.now();
  for (const [key, entry] of playbackCache) {
    if (now > entry.expires) playbackCache.delete(key);
  }
  const signedUntil = Date.parse(session.expiresAt) - EXPIRY_MARGIN_MS;
  const expires = Number.isFinite(signedUntil) ? Math.min(now + CACHE_TTL, signedUntil) : now + CACHE_TTL;
  playbackCache.set(id, { session, expires });
}

function fetchSession(id: string): Promise<PlaybackSession> {
  const running = inFlight.get(id);
  if (running) return running;
  const request = getRepositories()
    .media.getPlayback(id)
    .then((session) => {
      setCachedSession(id, session);
      return session;
    })
    .finally(() => inFlight.delete(id));
  inFlight.set(id, request);
  return request;
}

/** Sessão de playback de uma mídia (URL assinada + protocolo). */
export function usePlayback() {
  const playback = ref<PlaybackSession | null>(null);
  const status = ref<RequestStatus>('idle');
  const error = ref<ApiError | null>(null);

  /** Só a resposta do último `load` vale (trocar de canal descarta a anterior). */
  let latest = 0;

  async function load(mediaId: string, options: { fresh?: boolean } = {}): Promise<PlaybackSession | null> {
    const request = ++latest;

    // "Tentar de novo" pede sessão nova: a guardada pode ser justamente a que falhou.
    if (options.fresh) playbackCache.delete(mediaId);

    const cached = getCachedSession(mediaId);
    if (cached) {
      playback.value = cached;
      status.value = 'success';
      error.value = null;
      return cached;
    }

    status.value = 'pending';
    error.value = null;

    try {
      const session = await fetchSession(mediaId);
      if (request !== latest) return null;
      playback.value = session;
      status.value = 'success';
      return session;
    } catch (err) {
      if (request !== latest) return null;
      playback.value = null;
      error.value = toApiError(err);
      status.value = 'error';
      return null;
    }
  }

  /** Pre-fetch sem bloquear — chamado cedo; o `load` seguinte aproveita o mesmo request. */
  function prefetch(mediaId: string): void {
    if (getCachedSession(mediaId)) return;
    fetchSession(mediaId).catch(() => undefined); // o `load` real trata o erro
  }

  function reset(): void {
    latest += 1;
    playback.value = null;
    status.value = 'idle';
    error.value = null;
  }

  return { playback, status, error, load, prefetch, reset };
}
