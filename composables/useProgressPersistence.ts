import { onBeforeUnmount, onMounted, watch } from 'vue';
import { RESUME_SAVE_INTERVAL_MS } from '~/constants';
import { saveWatchPosition } from '~/utils/watchProgress';
import { saveSeriesProgress } from '~/utils/seriesProgress';
import type { MediaDetail } from '~/types';

interface UseProgressPersistenceOptions {
  mediaId: string;
  media: () => MediaDetail | null;
  videoEl: Ref<HTMLVideoElement | null>;
  currentTime: () => number;
  isPlaying: () => boolean;
}

/**
 * Grava o "continuar assistindo" local: throttle por tempo de reprodução,
 * flush ao pausar e ao sair da página (pagehide/desmontagem). Canais ao vivo
 * não têm resume — ficam de fora.
 */
export function useProgressPersistence(options: UseProgressPersistenceOptions): void {
  let lastSavedAt = 0;

  function persistProgress(): void {
    const video = options.videoEl.value;
    const current = options.media();
    if (!video || !video.duration || current?.isLive) return;

    saveWatchPosition(options.mediaId, video.currentTime, video.duration, current?.type);

    // Último episódio da série — marcador nas listagens e botão "continuar" da série.
    if (current?.seriesId) {
      saveSeriesProgress(current.seriesId, {
        mediaId: current.id,
        slug: current.slug,
        title: current.title,
        season: current.season,
        episode: current.episode,
        positionSec: video.currentTime,
        durationSec: video.duration,
      });
    }
  }

  watch(options.currentTime, () => {
    const now = Date.now();
    if (now - lastSavedAt < RESUME_SAVE_INTERVAL_MS) return;
    lastSavedAt = now;
    persistProgress();
  });

  watch(options.isPlaying, (playing) => {
    if (!playing) persistProgress();
  });

  onMounted(() => window.addEventListener('pagehide', persistProgress));

  onBeforeUnmount(() => {
    window.removeEventListener('pagehide', persistProgress);
    persistProgress();
  });
}
