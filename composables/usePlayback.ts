import { ref, computed } from 'vue';
import { getRepositories } from '~/repositories';
import { toApiError } from '~/utils/errors';
import type { ApiError, PlaybackSession, RequestStatus } from '~/types';

/** Cache de sessões de playback em memória (TTL: 10 min). */
const playbackCache = new Map<string, { session: PlaybackSession; expires: number }>();
const CACHE_TTL = 10 * 60 * 1000;

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
  playbackCache.set(id, { session, expires: Date.now() + CACHE_TTL });
}

/** Sessão de playback de uma mídia (URL assinada + protocolo). */
export function usePlayback() {
  const repository = getRepositories().media;

  const playback = ref<PlaybackSession | null>(null);
  const status = ref<RequestStatus>('idle');
  const error = ref<ApiError | null>(null);

  let controller: AbortController | null = null;

  async function load(mediaId: string): Promise<PlaybackSession | null> {
    // 1. Tenta cache primeiro (instantâneo)
    const cached = getCachedSession(mediaId);
    if (cached) {
      playback.value = cached;
      status.value = 'success';
      return cached;
    }

    controller?.abort();
    controller = new AbortController();

    status.value = 'pending';
    error.value = null;

    try {
      const session = await repository.getPlayback(mediaId, { signal: controller.signal });
      playback.value = session;
      setCachedSession(mediaId, session);
      status.value = 'success';
      return session;
    } catch (err) {
      if (controller.signal.aborted) return null;
      playback.value = null;
      error.value = toApiError(err);
      status.value = 'error';
      return null;
    }
  }

  /** Pre-fetch sem bloquear — chamado cedo (ex.: no watch do mediaId). */
  async function prefetch(mediaId: string): Promise<void> {
    if (getCachedSession(mediaId)) return;
    try {
      const session = await repository.getPlayback(mediaId);
      setCachedSession(mediaId, session);
    } catch {
      // Silencioso: o load() real vai tratar o erro
    }
  }

  function reset(): void {
    controller?.abort();
    playback.value = null;
    status.value = 'idle';
    error.value = null;
  }

  return { playback, status, error, load, prefetch, reset };
}
