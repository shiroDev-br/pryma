import { ref, computed } from 'vue';
import { getRepositories } from '~/repositories';
import { toApiError } from '~/utils/errors';
import type { ApiError, PlaybackSession, RequestStatus } from '~/types';

/** Sessão de playback de uma mídia (URL assinada + protocolo). */
export function usePlayback() {
  const repository = getRepositories().media;

  const playback = ref<PlaybackSession | null>(null);
  const status = ref<RequestStatus>('idle');
  const error = ref<ApiError | null>(null);

  let controller: AbortController | null = null;

  async function load(mediaId: string): Promise<PlaybackSession | null> {
    controller?.abort();
    controller = new AbortController();

    status.value = 'pending';
    error.value = null;

    try {
      const session = await repository.getPlayback(mediaId, { signal: controller.signal });
      playback.value = session;
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

  function reset(): void {
    controller?.abort();
    playback.value = null;
    status.value = 'idle';
    error.value = null;
  }

  return { playback, status, error, load, reset };
}
