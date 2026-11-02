<template>
  <div
    class="absolute inset-0 overflow-hidden bg-black"
    @pointermove.passive="pokeHud"
    @pointerdown.passive="onPointerDown"
  >
    <BrandLoading v-if="isLoading && !media" class="h-full" />

    <div v-else-if="error && !notFound && !media" class="grid h-full place-items-center p-6">
      <ErrorState title="Não foi possível carregar a mídia" :message="error.message" :on-retry="refresh" />
    </div>

    <div v-else-if="!media" class="grid h-full place-items-center p-6">
      <EmptyState title="Mídia não encontrada" description="O item solicitado não existe ou foi removido." />
    </div>

    <template v-else>
      <div class="stage absolute inset-0 bg-black" :class="{ 'stage--fill': fillScreen }">
        <!-- Sem crossorigin: o CDN do stream não envia CORS e bloquearia o vídeo. -->
        <video
          ref="videoEl"
          :poster="BLANK_POSTER"
          playsinline
          class="h-full w-full"
          @click="onVideoClick"
          @loadedmetadata="onLoadedMetadata"
          @loadeddata="markContentReady"
          @playing="markContentReady"
        />
      </div>

      <!-- Abrindo o conteúdo (sessão + primeiro quadro): tela da marca por cima de
           tudo, inclusive do card de pausa. Travadas depois disso usam o spinner. -->
      <Transition name="fade">
        <BrandLoading
          v-if="openingContent"
          class="pointer-events-none absolute inset-0 z-40"
        />
      </Transition>

      <div
        v-if="playbackError || streamError || liveFailover.exhausted.value"
        class="absolute inset-0 z-30 grid place-items-center bg-black/75 p-6"
      >
        <ErrorState
          :title="liveFailover.exhausted.value ? 'Canal fora do ar' : 'Não foi possível iniciar a reprodução'"
          :message="
            playbackError?.message ??
            streamError ??
            'Nenhuma fonte deste canal respondeu. Tente de novo em instantes.'
          "
          :on-retry="reloadPlayback"
        />
      </div>

      <div
        v-if="playerStore.isBuffering && !openingContent && !liveFailover.exhausted.value"
        class="pointer-events-none absolute inset-0 z-20 grid place-items-center"
      >
        <span class="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-blue" />
      </div>

      <!-- Failover ao vivo: reconectando / trocando de fonte / conectado. -->
      <Transition name="fade">
        <div
          v-if="liveFailover.notice.value"
          class="pointer-events-none absolute left-1/2 top-20 z-30 -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <div class="flex items-center gap-2.5 rounded-full border border-white/20 bg-black/80 px-5 py-2.5 text-sm font-semibold text-white shadow-card">
            <span
              v-if="liveFailover.notice.value !== 'Conectado'"
              class="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-blue"
              aria-hidden="true"
            />
            <span v-else class="h-2 w-2 rounded-full bg-[#3ddc84]" aria-hidden="true" />
            {{ liveFailover.notice.value }}
          </div>
        </div>
      </Transition>

      <!-- Salto acumulado (±10s seguidos somam): lado do sentido, como nos apps de streaming. -->
      <Transition name="fade">
        <div
          v-if="skip.badgeVisible.value"
          class="pointer-events-none absolute top-1/2 z-30 -translate-y-1/2"
          :class="skip.total.value < 0 ? 'left-[18%]' : 'right-[18%]'"
          role="status"
        >
          <div class="flex items-center gap-2.5 rounded-full border border-white/20 bg-black/75 px-5 py-3 text-white shadow-card">
            <HudIcon v-if="skip.total.value < 0" name="rewindBurst" class="h-7 w-7" />
            <span class="text-2xl font-bold tabular-nums">{{ skip.label.value }}</span>
            <HudIcon v-if="skip.total.value >= 0" name="forwardBurst" class="h-7 w-7" />
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <PlayerPauseOverlay
          v-if="showInfo && !isLive"
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
          :current-time="skip.displayTime.value"
          :duration="duration"
          :buffered-ratio="bufferedRatio"
          :volume="playerStore.volume"
          :muted="playerStore.isMuted"
          :is-fullscreen="fillScreen"
          :speed="speed"
          :has-captions="hasCaptions"
          :captions-on="captionsOn"
          :quality="media.quality"
          :quality-options="qualityOptions"
          :live="isLive"
          :title="media.title"
          :subtitle="episodeLabel"
          @back="goBack"
          @toggle-play="controls.toggle()"
          @skip="skipBy($event)"
          @seek-ratio="controls.seekToRatio($event)"
          @set-volume="controls.setVolume($event)"
          @toggle-mute="controls.toggleMute()"
          @set-speed="setSpeed($event)"
          @toggle-captions="toggleCaptions"
          @toggle-fullscreen="toggleFill"
          @select-quality="openQualityVariant"
        />
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { loadWatchPosition } from '~/utils/watchProgress';
import { BLANK_POSTER, SKIP_SECONDS } from '~/constants';
import { directionOf, isEditableTarget, isOkKey, mediaKeyOf } from '~/utils/remoteKeys';
import { releaseVideo } from '~/utils/video';

const route = useRoute();
const router = useRouter();

const slugParam = Array.isArray(route.params.slug) ? route.params.slug.join('/') : String(route.params.slug ?? '');
// Slug do catálogo é `${titulo-slug}-${id}` — o id é o trecho após o último hífen.
const lastSegment = slugParam.split('/').filter(Boolean).at(-1) ?? '';
const mediaId = lastSegment.split('-').at(-1) ?? '';

if (!/^m[0-9a-z]+$/.test(mediaId)) {
  throw createError({ statusCode: 404, message: 'Mídia não encontrada' });
}

// Pre-fetch playback URL imediatamente (paralelo com media detail)
const playback = usePlayback();
playback.prefetch(mediaId);

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

useHead({ title: computed(() => (media.value ? `Pryma — ${media.value.title}` : 'Pryma — Player')) });

const { playback: playbackSession, status: playbackStatus, error: playbackError } = playback;

const videoEl = ref<HTMLVideoElement | null>(null);
const controls = usePlayer(videoEl, { mediaId: () => mediaId });
const { isPlaying, currentTime, duration } = controls;

const playerStore = usePlayerStore();
const preferences = usePreferencesStore();

/* ---------- Motor de stream (HLS / MPEG-TS / arquivo direto) ---------- */

/** O motor desistiu do stream depois da sessão ter vindo ok (codec, rede caída). */
const streamError = ref<string | null>(null);

const { attachStream: engineAttach, destroyStreams, isAttached } = useStreamEngine({
  onFatal: (message) => {
    // Ao vivo: o motor desistir é só mais um travamento — o failover troca de fonte.
    if (isLive.value) liveFailover.fail();
    else streamError.value = message;
  },
});

function attachStream(video: HTMLVideoElement, url: string, protocol: string): Promise<void> {
  streamError.value = null;
  return engineAttach(video, url, protocol);
}

/* ---------- HUD: some durante a reprodução, volta com interação ---------- */

const { hudVisible, pokeHud } = useAutoHideHud(() => isPlaying.value);

/** Transmissão ao vivo: sem pausa/avançar/voltar/progresso nem card de "continuar". */
const isLive = computed(() => media.value?.type === 'live' || media.value?.isLive === true);

/* ---------- Ao vivo: versões do canal + failover de fonte ---------- */

const {
  qualityOptions: variantOptions,
  groupItems,
  openQualityVariant,
} = useLiveQualityVariants(() => media.value);

const liveFailover = useLiveFailover({
  videoEl,
  media: () => (isLive.value ? media.value : null),
  alternatives: groupItems,
  attach: (source) => (videoEl.value ? attachStream(videoEl.value, source.url, source.protocol) : undefined),
  detach: destroyStreams,
  // Qualidade escolhida no botão (?pick=1) vale mais que a fonte lembrada.
  useRemembered: () => route.query.pick !== '1',
});

/** HUD marca a versão que está tocando de fato (o failover pode ter trocado). */
const qualityOptions = computed(() => {
  const activeId = liveFailover.current.value?.mediaId;
  const activeSlug = groupItems.value.find((item) => item.id === activeId)?.slug;
  if (!activeSlug) return variantOptions.value;
  return variantOptions.value.map((option) => ({ ...option, current: option.slug === activeSlug }));
});

/** Cards de info só aparecem pausado (estilo reference). */
const showInfo = computed(
  () => !isPlaying.value && !playbackError.value && playbackStatus.value !== 'pending',
);

/** O <video> já tem imagem (ou já pode tocar — autoplay bloqueado mostra o card de pausa). */
const contentReady = ref(false);

function markContentReady(): void {
  contentReady.value = true;
}

const openingContent = computed(
  () =>
    !contentReady.value &&
    !playbackError.value &&
    !streamError.value &&
    !liveFailover.exhausted.value,
);

/** "Temporada 1 · Episódio 3" no topo do HUD — só episódio de série. */
const episodeLabel = computed(() => {
  const value = media.value;
  if (!value || value.season == null || value.episode == null) return null;
  return `Temporada ${value.season} · Episódio ${value.episode}`;
});

/** Toca uma vez nesta sessão → pausa vira "continuar", não "assistir agora". */
const hasStarted = ref(false);

watch(isPlaying, (playing) => {
  if (playing) hasStarted.value = true;
});

const primaryLabel = computed(() =>
  hasStarted.value || currentTime.value > 0 ? 'Continuar assistindo' : 'Assistir agora',
);

/* ---------- ±10s acumulado ---------- */

const skip = useSkipBurst({ currentTime, duration, seek: controls.seek });

function skipBy(delta: number): void {
  if (!isLive.value) skip.skipBy(delta);
}

/* ---------- Buffering ---------- */

const bufferedRatio = ref(0);
watch(currentTime, () => {
  bufferedRatio.value = controls.getBufferedRatio();
});

/* ---------- Sessão de playback (retry do overlay de erro) ---------- */

async function reloadPlayback(): Promise<void> {
  const current = media.value;
  if (!current) return;
  if (isLive.value) {
    liveFailover.retry();
    return;
  }
  // Sessão nova: a guardada pode ser a própria que falhou (URL vencida).
  const session = await playback.load(current.id, { fresh: true });
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

// Pelo id, não pelo objeto: o detalhe chega duas vezes (payload + refetch) e cada
// disparo pedia outra sessão de playback e religava o stream (2 conexões no provedor).
watch(
  () => media.value?.id,
  async (id) => {
    const value = media.value;
    if (!id || !value) return;

    contentReady.value = false;
    resumeTarget.value = value.isLive ? null : loadWatchPosition(value.id, value.durationSec);
    resumeApplied = false;
    hasCaptions.value = false;
    captionsOn.value = false;

    const session = await playback.load(value.id);
    if (!session) return;

    await nextTick();
    if (!videoEl.value) return;
    if (isLive.value) await liveFailover.start(session);
    else await attachStream(videoEl.value, session.url, session.protocol);
  },
  { immediate: true },
);

// O <video> só existe depois que a mídia carrega — completa o src se faltar.
watch(
  videoEl,
  (element) => {
    if (!element) return;
    if (!element.src && !isAttached() && playbackSession.value) {
      if (isLive.value) {
        if (!liveFailover.current.value) void liveFailover.start(playbackSession.value);
      } else {
        void attachStream(element, playbackSession.value.url, playbackSession.value.protocol);
      }
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

/* ---------- Preencher a tela ---------- */

const { fillScreen, toggleFill } = usePlayerFill();

/* ---------- Navegação ---------- */

function goBack(): void {
  // Canal live → sempre volta pro TV ao vivo. Veio de lá: desempilha (o
  // `returning` da lista restaura grupo/foco); senão troca no lugar — push
  // deixava o player no histórico e o Voltar seguinte reabria a transmissão.
  if (isLive.value) {
    const back = window.history.state?.back;
    if (typeof back === 'string' && back.startsWith('/browse/tv')) router.back();
    else navigateTo('/browse/tv', { replace: true });
    return;
  }
  if (window.history.state?.back) router.back();
  else navigateTo('/');
}

function toggleList(): void {
  preferences.toggleFavorite(mediaId, media.value ?? undefined);
}

const isFavorite = computed(() => preferences.isFavorite(mediaId));

/* ---------- Próximo episódio (séries) ---------- */

const { nextEpisode, openNext } = useNextEpisode(() => media.value);

/* ---------- Teclado global ---------- */

/** Foco "solto" (nenhum controle do HUD/overlay): o vídeo é o alvo das teclas. */
function focusOnVideo(): boolean {
  const active = document.activeElement;
  return !active || active === document.body || active.tagName === 'VIDEO';
}

/**
 * Controle remoto no player:
 *  - foco solto (HUD escondido ou recém-aberto): ←/→ voltam/avançam 10s e
 *    OK pausa/retoma — ↑/↓ seguem pro motor espacial e entram no HUD;
 *  - foco num botão do HUD: as setas só navegam entre os botões.
 * Registrado no `document` (antes do motor espacial, que escuta no `window`):
 * o preventDefault impede o foco de pular pro HUD junto com o avanço.
 */
function onKeydown(event: KeyboardEvent): void {
  pokeHud();
  if (isEditableTarget(event.target)) return;

  if (event.key === 'f' || event.key === 'F') {
    toggleFill();
    return;
  }

  // Teclas de mídia do controle valem com qualquer foco.
  const mediaKey = mediaKeyOf(event);
  if (mediaKey === 'playPause') {
    event.preventDefault();
    resumeOrToggle();
    return;
  }
  if (mediaKey && !isLive.value) {
    event.preventDefault();
    skipBy(mediaKey === 'fastForward' ? SKIP_SECONDS : -SKIP_SECONDS);
    return;
  }

  if (!focusOnVideo()) return;

  const direction = directionOf(event);
  if (direction === 'left' || direction === 'right') {
    event.preventDefault();
    skipBy(direction === 'right' ? SKIP_SECONDS : -SKIP_SECONDS);
    return;
  }

  if (isOkKey(event)) {
    event.preventDefault();
    resumeOrToggle();
  }
}

/** Ao vivo não pausa — só retoma uma transmissão parada. */
function resumeOrToggle(): void {
  if (!isLive.value || !isPlaying.value) controls.toggle();
}

let lastPointerType = '';

function onPointerDown(event: PointerEvent): void {
  lastPointerType = event.pointerType;
  pokeHud();
}

/** Mouse: clique no vídeo pausa/retoma. Toque: só traz o HUD de volta (no pointerdown). */
function onVideoClick(): void {
  if (lastPointerType !== 'touch') resumeOrToggle();
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  destroyStreams();
  // Solta o decoder antes da tela seguinte pintar: em TV box fraca o decoder
  // preso ao <video> recém-desmontado deixava a home sem memória de vídeo
  // (fundo/cards sem desenhar) até o GC passar.
  releaseVideo(videoEl.value);
});
</script>

<style scoped>
.stage video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.stage--fill video {
  object-fit: fill;
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
