<template>
  <div
    ref="rootEl"
    class="absolute inset-0 overflow-hidden bg-black"
    @pointermove.passive="pokeHud"
  >
    <div v-if="isLoading && !media" class="grid h-full place-items-center">
      <LoadingState message="Carregando mídia…" />
    </div>

    <div v-else-if="error && !notFound && !media" class="grid h-full place-items-center p-6">
      <ErrorState title="Não foi possível carregar a mídia" :message="error.message" :on-retry="refresh" />
    </div>

    <div v-else-if="!media" class="grid h-full place-items-center p-6">
      <EmptyState title="Mídia não encontrada" description="O item solicitado não existe ou foi removido." />
    </div>

    <template v-else>
      <div class="stage absolute inset-0 bg-black">
        <!-- Sem crossorigin: o CDN do stream não envia CORS e bloquearia o vídeo. -->
        <video ref="videoEl" playsinline class="h-full w-full" />
      </div>

      <div
        v-if="playbackStatus === 'pending'"
        class="absolute inset-0 z-30 grid place-items-center bg-black/50"
        role="status"
      >
        <div class="flex flex-col items-center gap-3 text-sm text-white/80">
          <span class="h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-blue" />
          Preparando stream…
        </div>
      </div>

      <div v-else-if="playbackError" class="absolute inset-0 z-30 grid place-items-center bg-black/75 p-6">
        <ErrorState
          title="Não foi possível iniciar a reprodução"
          :message="playbackError.message"
          :on-retry="reloadPlayback"
        />
      </div>

      <div v-if="playerStore.isBuffering" class="pointer-events-none absolute inset-0 z-20 grid place-items-center">
        <span class="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-blue" />
      </div>

      <Transition name="fade">
        <PlayerPauseOverlay
          v-if="showInfo"
          :media="media"
          :primary-label="primaryLabel"
          :is-favorite="isFavorite"
          :next-episode="nextEpisode"
          @play="controls.play()"
          @toggle-list="toggleList"
          @open-next="openNext"
        />
      </Transition>

      <Transition name="fade">
        <PlayerHud
          v-if="hudVisible"
          :playing="isPlaying"
          :current-time="currentTime"
          :duration="duration"
          :buffered-ratio="bufferedRatio"
          :volume="playerStore.volume"
          :muted="playerStore.isMuted"
          :is-fullscreen="isFullscreen"
          :speed="speed"
          :has-captions="hasCaptions"
          :captions-on="captionsOn"
          :quality="media.quality"
          :quality-options="qualityOptions"
          @back="goBack"
          @exit-fullscreen="exitFullscreen"
          @toggle-play="controls.toggle()"
          @skip="controls.skip($event)"
          @seek-ratio="controls.seekToRatio($event)"
          @set-volume="controls.setVolume($event)"
          @toggle-mute="controls.toggleMute()"
          @set-speed="setSpeed($event)"
          @toggle-captions="toggleCaptions"
          @toggle-fullscreen="toggleFullscreen"
          @select-quality="openQualityVariant"
        />
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import 'plyr/dist/plyr.css';
import Hls from 'hls.js';
// mpegts.js toca `self` no escopo do módulo — quebra SSR. Import dinâmico só no cliente.
import type mpegts from 'mpegts.js';
import {
  PLAYER_HUD_HIDE_MS,
  RESUME_SAVE_INTERVAL_MS,
} from '~/constants';
import { getRepositories } from '~/repositories';
import { usePreferencesStore } from '~/stores/preferences';
import { usePlayerStore } from '~/stores/player';
import { loadWatchPosition, saveWatchPosition } from '~/utils/watchProgress';
import { saveSeriesProgress } from '~/utils/seriesProgress';
import { splitQualitySuffix, variantLabel, qualityLabelRank } from '~/utils/live';
import type { QualityOption } from '~/components/player/PlayerHud.vue';
import type { MediaSummary } from '~/types/media';

const route = useRoute();
const router = useRouter();

const slugParam = Array.isArray(route.params.slug) ? route.params.slug.join('/') : String(route.params.slug ?? '');
// Slug do catálogo é `${titulo-slug}-${id}` — o id é o trecho após o último hífen.
const lastSegment = slugParam.split('/').filter(Boolean).at(-1) ?? '';
const mediaId = lastSegment.split('-').at(-1) ?? '';

if (!/^m[0-9a-z]+$/.test(mediaId)) {
  throw createError({ statusCode: 404, message: 'Mídia não encontrada' });
}

// Remonta a tela ao trocar de mídia (próximo episódio, card, etc).
definePageMeta({ layout: 'player', key: (route) => route.fullPath });

const { media, isLoading, notFound, error, refresh } = useMediaDetail(() => mediaId);

watch(
  notFound,
  (value) => {
    if (value) {
      throw createError({ statusCode: 404, message: 'Mídia não encontrada', fatal: true });
    }
  },
  { immediate: true },
);

useHead({ title: computed(() => (media.value ? `Prysma — ${media.value.title}` : 'Prysma — Player')) });

const playback = usePlayback();
const { playback: playbackSession, status: playbackStatus, error: playbackError } = playback;

const videoEl = ref<HTMLVideoElement | null>(null);
const rootEl = ref<HTMLElement | null>(null);
const controls = usePlayer(videoEl, { mediaId: () => mediaId });
const { isPlaying, currentTime, duration } = controls;

const playerStore = usePlayerStore();
const preferences = usePreferencesStore();

/* ---------- HLS / MPEG-TS (streams ao vivo) ---------- */

let hlsInstance: Hls | null = null;
let mpegtsInstance: mpegts.Player | null = null;

/** Geração do stream — muda durante `await import()` pra abortar attach obsoleto. */
let streamGeneration = 0;

function destroyStreams(): void {
  streamGeneration += 1;
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  if (mpegtsInstance) {
    mpegtsInstance.destroy();
    mpegtsInstance = null;
  }
}

/** Anexa stream ao <video> — detecta HLS, MPEG-TS ou arquivo direto. */
async function attachStream(video: HTMLVideoElement, url: string, protocol: string): Promise<void> {
  destroyStreams();

  const hasM3u8 = url.includes('.m3u8') || url.includes('m3u8');
  const hasVideoExt = /\.(mp4|webm|mkv|ogv)(\?|#|$)/i.test(url);

  console.log('[Player] attachStream:', { url, protocol, hasM3u8, hasVideoExt, hlsSupported: Hls.isSupported() });

  // Arquivo direto (mp4, webm) → src direto
  if (hasVideoExt || protocol === 'file') {
    console.log('[Player] Using direct file src');
    video.src = url;
    video.play().catch((e: Error) => console.warn('[Player] play() blocked:', e));
    return;
  }

  // URL com .m3u8 → HLS
  if (hasM3u8) {
    if (Hls.isSupported()) {
      console.log('[Player] Using hls.js');
      attachHls(video, url);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('[Player] Using native HLS (Safari)');
      video.src = url;
      video.play().catch((e: Error) => console.warn('[Player] play() blocked:', e));
    } else {
      console.log('[Player] Using mpegts.js (no HLS support)');
      await attachMpegTs(video, url);
    }
    return;
  }

  // Live stream sem extensão (.ts implícito) → MPEG-TS
  console.log('[Player] Live stream, using mpegts.js');
  await attachMpegTs(video, url);
}

function attachHls(video: HTMLVideoElement, url: string): void {
  hlsInstance = new Hls({
    enableWorker: true,
    lowLatencyMode: true,
  });
  hlsInstance.loadSource(url);
  hlsInstance.attachMedia(video);

  hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
    console.log('[HLS] Manifest parsed, playing...');
    video.play().catch((e: Error) => console.warn('[HLS] play() blocked:', e));
  });

  hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
    console.error('[HLS] Error:', { type: data.type, details: data.details, fatal: data.fatal });

    if (data.details === 'manifestParsingError' || data.details === 'manifestLoadError') {
      console.log('[HLS] Not valid HLS, trying mpegts.js...');
      destroyStreams();
      void attachMpegTs(video, url);
      return;
    }

    if (data.fatal) {
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          hlsInstance?.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          hlsInstance?.recoverMediaError();
          break;
        default:
          destroyStreams();
          void attachMpegTs(video, url);
          break;
      }
    }
  });

  // Timeout: se não carregar em 5s, fallback pra mpegts
  const timeout = setTimeout(() => {
    if (hlsInstance && !video.duration) {
      console.log('[HLS] Timeout (5s), trying mpegts.js...');
      destroyStreams();
      void attachMpegTs(video, url);
    }
  }, 5000);

  hlsInstance.on(Hls.Events.DESTROYING, () => clearTimeout(timeout));
}

async function attachMpegTs(video: HTMLVideoElement, url: string): Promise<void> {
  console.log('[Player] Using mpegts.js for:', url);

  const generation = streamGeneration;
  const mpegts = (await import('mpegts.js')).default;
  if (generation !== streamGeneration) return; // tela trocou durante o import

  mpegtsInstance = mpegts.createPlayer(
    { type: 'mse', isLive: true, url },
    {
      enableWorker: true,
      // Buffer menor = carrega mais rápido
      liveBufferLatencyChasing: false,
      liveSyncTargetLatency: 1.5,
      liveSyncMaxLatency: 4,
      // Stash buffer menor pra início rápido
      stashInitialSize: 128,
      // Auto soberwrite buffer antigo
      autoCleanupSourceBuffer: true,
    },
  );

  mpegtsInstance.attachMediaElement(video);
  mpegtsInstance.load();

  // Tenta play imediatamente
  const playResult = mpegtsInstance.play();
  if (playResult instanceof Promise) {
    playResult.catch((e: Error) => console.warn('[mpegts] play() failed:', e));
  }

  mpegtsInstance.on(mpegts.Events.ERROR, (errorType, errorDetail, errorInfo) => {
    console.error('[mpegts] Error:', { errorType, errorDetail, errorInfo });
  });

  mpegtsInstance.on(mpegts.Events.MEDIA_INFO, (info) => {
    console.log('[mpegts] Media info:', { duration: info.duration, hasAudio: info.hasAudio, hasVideo: info.hasVideo });
  });

  mpegtsInstance.on(mpegts.Events.METADATA_ARRIVED, () => {
    console.log('[mpegts] Metadata arrived, playing...');
    video.play().catch((e: Error) => console.warn('[mpegts] play() blocked:', e));
  });
}

/* ---------- HUD: some durante a reprodução, volta com interação ---------- */

const hudVisible = ref(true);
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function pokeHud(): void {
  hudVisible.value = true;
  if (hideTimer) clearTimeout(hideTimer);

  if (isPlaying.value) {
    hideTimer = setTimeout(() => {
      hudVisible.value = false;
    }, PLAYER_HUD_HIDE_MS);
  }
}

watch(isPlaying, (playing) => {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (playing) pokeHud();
  else hudVisible.value = true;
});

/** Cards de info só aparecem pausado (estilo reference). */
const showInfo = computed(
  () => !isPlaying.value && !playbackError.value && playbackStatus.value !== 'pending',
);

/** Toca uma vez nesta sessão → pausa vira "continuar", não "assistir agora". */
const hasStarted = ref(false);

watch(isPlaying, (playing) => {
  if (playing) hasStarted.value = true;
});

const primaryLabel = computed(() =>
  hasStarted.value || currentTime.value > 0 ? 'Continuar assistindo' : 'Assistir agora',
);

/* ---------- Buffering ---------- */

const bufferedRatio = ref(0);
watch(currentTime, () => {
  bufferedRatio.value = controls.getBufferedRatio();
});

/* ---------- Sessão de playback + autoplay ---------- */

function attemptPlay(): void {
  videoEl.value?.play().catch(() => {
    // Autoplay bloqueado pelo navegador — o overlay pausado cobre o caso.
  });
}

async function reloadPlayback(): Promise<void> {
  const current = media.value;
  if (!current) return;
  const session = await playback.load(current.id);
  if (session && videoEl.value) {
    await attachStream(videoEl.value, session.url, session.protocol);
  }
}

/* ---------- Resume local (continuar assistindo) ---------- */

const resumeTarget = ref<number | null>(null);
let resumeApplied = false;

/* ---------- Legendas (só existem se o stream tiver tracks) ---------- */

const hasCaptions = ref(false);
const captionsOn = ref(false);

function checkCaptions(): void {
  const tracks = videoEl.value?.textTracks;
  hasCaptions.value = !!tracks && tracks.length > 0;
}

function toggleCaptions(): void {
  const tracks = videoEl.value?.textTracks;
  if (!tracks || tracks.length === 0) return;

  const enable = !captionsOn.value;
  for (let i = 0; i < tracks.length; i += 1) {
    tracks[i].mode = enable && i === 0 ? 'showing' : 'disabled';
  }
  captionsOn.value = enable;
}

function onLoadedMetadata(): void {
  const video = videoEl.value;
  checkCaptions();

  if (!video || resumeApplied || resumeTarget.value == null) return;
  if (!video.duration || video.currentTime >= 1) return;

  resumeApplied = true;
  video.currentTime = resumeTarget.value;
}

watch(
  media,
  async (value) => {
    if (!value) return;

    resumeTarget.value = value.isLive ? null : loadWatchPosition(value.id, value.durationSec);
    resumeApplied = false;
    hasCaptions.value = false;
    captionsOn.value = false;

    const session = await playback.load(value.id);
    if (!session) return;

    await nextTick();
    if (videoEl.value) {
      await attachStream(videoEl.value, session.url, session.protocol);
    }
  },
  { immediate: true },
);

// O <video> só existe depois que a mídia carrega — completa o src se faltar.
watch(
  videoEl,
  (element) => {
    if (!element) return;
    element.addEventListener('loadedmetadata', onLoadedMetadata);

    if (!element.src && !hlsInstance && playbackSession.value) {
      void attachStream(element, playbackSession.value.url, playbackSession.value.protocol);
    }
  },
  { flush: 'post' },
);

/* ---------- Progresso local ---------- */

let lastSavedAt = 0;

function persistProgress(): void {
  const video = videoEl.value;
  if (!video || !video.duration || media.value?.isLive) return;
  saveWatchPosition(mediaId, video.currentTime, video.duration);

  // Último episódio da série — marcador nas listagens e botão "continuar" da série.
  const current = media.value;
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

watch(currentTime, () => {
  const now = Date.now();
  if (now - lastSavedAt < RESUME_SAVE_INTERVAL_MS) return;
  lastSavedAt = now;
  persistProgress();
});

watch(isPlaying, (playing) => {
  if (!playing) persistProgress();
});

/* ---------- Velocidade ---------- */

const speed = ref(1);

function setSpeed(rate: number): void {
  speed.value = rate;
  controls.setSpeed(rate);
}

/* ---------- Tela cheia no container inteiro (HUD junto do vídeo) ---------- */

const isFullscreen = ref(false);

interface WebkitDoc {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}
interface WebkitEl {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

function onFullscreenChange(): void {
  const doc = document as Document & WebkitDoc;
  isFullscreen.value = !!(document.fullscreenElement ?? doc.webkitFullscreenElement);
}

function enterFullscreen(): void {
  const element = rootEl.value as (HTMLElement & WebkitEl) | null;
  if (!element || isFullscreen.value) return;

  try {
    if (element.requestFullscreen) {
      element.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined);
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    }
  } catch {
    /* navegador sem suporte — botão fica inerte */
  }
}

function exitFullscreen(): void {
  const doc = document as Document & WebkitDoc;
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => undefined);
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    }
  } catch {
    /* ignore */
  }
}

function toggleFullscreen(): void {
  if (isFullscreen.value) exitFullscreen();
  else enterFullscreen();
}

/* ---------- Navegação ---------- */

function goBack(): void {
  // Canal live → sempre volta pro TV ao vivo
  if (media.value?.type === 'live') {
    navigateTo('/browse/tv');
    return;
  }
  if (window.history.state?.back) router.back();
  else navigateTo('/');
}

function toggleList(): void {
  preferences.toggleFavorite(mediaId);
}

const isFavorite = computed(() => preferences.isFavorite(mediaId));

/* ---------- Próximo episódio (séries) ---------- */

const nextEpisode = ref<MediaSummary | null>(null);

/**
 * Episódio seguinte da coletânea (`?series=` ordenado por temporada/episódio).
 * Segue o cursor quando a série tem mais que uma página de episódios.
 */
async function findNextEpisode(seriesId: string, currentId: string): Promise<MediaSummary | null> {
  const repository = getRepositories().media;
  let cursor: string | null = null;

  for (let page = 0; page < 5; page += 1) {
    const result = await repository.listMedia({ series: seriesId, sort: 'episode', limit: 100, cursor });
    const index = result.items.findIndex((item) => item.id === currentId);

    if (index >= 0) {
      if (index + 1 < result.items.length) return result.items[index + 1];
      if (!result.nextCursor) return null;
      const next = await repository.listMedia({ series: seriesId, sort: 'episode', limit: 100, cursor: result.nextCursor });
      return next.items[0] ?? null;
    }

    if (!result.nextCursor) return null;
    cursor = result.nextCursor;
  }

  return null;
}

watch(media, async (value) => {
  nextEpisode.value = null;
  if (!value?.seriesId) return;

  const requestedId = value.id;

  try {
    const next = await findNextEpisode(value.seriesId, requestedId);
    if (media.value?.id === requestedId) nextEpisode.value = next;
  } catch {
    /* série inexistente/erro — sem card de próximo episódio */
  }
});

function openNext(): void {
  if (!nextEpisode.value) return;
  navigateTo(`/medias/${nextEpisode.value.slug}`);
}

/* ---------- Variantes de qualidade (canais live: FHD/HD/SD…) ---------- */

const qualityOptions = ref<QualityOption[]>([]);

/**
 * Acha as variantes do mesmo canal ("SPORTV 2" → FHD/HD/H265/SD).
 * Busca pela base do nome e mantém só títulos com a mesma base.
 */
watch(media, async (value) => {
  qualityOptions.value = [];
  if (!value || value.type !== 'live') return;

  const requestedId = value.id;
  const { base } = splitQualitySuffix(value.title);

  try {
    const repository = getRepositories().media;
    const result = await repository.search({ q: base, type: 'live', limit: 50 });
    if (media.value?.id !== requestedId) return;

    const variants = result.items.filter(
      (item) => splitQualitySuffix(item.title).base.toLowerCase() === base.toLowerCase(),
    );
    if (variants.length < 2) return;

    qualityOptions.value = variants
      .map((item) => ({
        label: variantLabel(item.title, item.quality),
        slug: item.slug,
        current: item.id === requestedId,
      }))
      .sort(
        (a, b) =>
          qualityLabelRank(a.label) - qualityLabelRank(b.label) ||
          a.label.localeCompare(b.label),
      );
  } catch {
    /* sem variantes — botão de qualidade não aparece */
  }
}, { immediate: true });

function openQualityVariant(slug: string): void {
  navigateTo(`/medias/${slug}`);
}

/* ---------- Teclado global ---------- */

function isEditable(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
}

function onKeydown(event: KeyboardEvent): void {
  pokeHud();
  if (isEditable(event.target)) return;

  if (event.key === 'f' || event.key === 'F') toggleFullscreen();
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('pagehide', persistProgress);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('pagehide', persistProgress);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
  if (hideTimer) clearTimeout(hideTimer);
  persistProgress();
  videoEl.value?.removeEventListener('loadedmetadata', onLoadedMetadata);
  destroyStreams();
});
</script>

<style scoped>
/* Vídeo sangra em tela cheia; wrappers do Plyr não devem impor aspect-ratio. */
.stage :deep(.plyr) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: #000;
}

.stage :deep(.plyr__video-wrapper) {
  height: 100%;
}

.stage :deep(video) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
