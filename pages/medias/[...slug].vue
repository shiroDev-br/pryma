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
import { loadWatchPosition } from '~/utils/watchProgress';

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

/* ---------- Motor de stream (HLS / MPEG-TS / arquivo direto) ---------- */

const { attachStream, destroyStreams, hasHls } = useStreamEngine();

/* ---------- HUD: some durante a reprodução, volta com interação ---------- */

const { hudVisible, pokeHud } = useAutoHideHud(() => isPlaying.value);

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

/* ---------- Sessão de playback (retry do overlay de erro) ---------- */

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

/* ---------- Sessão + attach do stream ---------- */

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

    if (!element.src && !hasHls() && playbackSession.value) {
      void attachStream(element, playbackSession.value.url, playbackSession.value.protocol);
    }
  },
  { flush: 'post' },
);

/* ---------- Progresso local ---------- */

useProgressPersistence({
  mediaId,
  media: () => media.value,
  videoEl,
  currentTime: () => currentTime.value,
  isPlaying: () => isPlaying.value,
});

/* ---------- Velocidade ---------- */

const speed = ref(1);

function setSpeed(rate: number): void {
  speed.value = rate;
  controls.setSpeed(rate);
}

/* ---------- Tela cheia no container inteiro (HUD junto do vídeo) ---------- */

const { isFullscreen, exitFullscreen, toggleFullscreen } = useFullscreen(rootEl);

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

const { nextEpisode, openNext } = useNextEpisode(() => media.value);

/* ---------- Variantes de qualidade (canais live: FHD/HD/SD…) ---------- */

const { qualityOptions, openQualityVariant } = useLiveQualityVariants(() => media.value);

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
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
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
