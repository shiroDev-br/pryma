<template>
  <div class="detail-page tv-safe pb-10 pt-24">
    <!-- Fundo: arte larga (ou o pôster) com degradê pro texto ficar legível. Sem blur: chip fraco. -->
    <div class="fixed inset-0 -z-[5] bg-bg" aria-hidden="true">
      <img
        v-if="backdrop && !backdropFailed"
        :src="backdrop"
        alt=""
        decoding="async"
        class="absolute inset-0 h-full w-full object-cover object-[center_25%] opacity-45"
        @error="backdropFailed = true"
      />
      <div class="detail-scrim absolute inset-0" />
    </div>

    <LoadingState v-if="isLoading && !media" message="Carregando detalhes…" class="py-24" />

    <ErrorState
      v-else-if="!media"
      title="Não foi possível carregar este título"
      :message="error?.message ?? ''"
      :on-retry="refresh"
    />

    <article v-else class="flex gap-10" :aria-label="displayTitle">
      <!-- Pôster -->
      <div class="poster hidden shrink-0 overflow-hidden rounded-lg border border-line/70 bg-elevated sm:block">
        <img
          v-if="media.thumbnailUrl && !posterFailed"
          :src="media.thumbnailUrl"
          :alt="displayTitle"
          decoding="async"
          class="h-full w-full object-cover"
          @error="posterFailed = true"
        />
        <div v-else class="grid h-full w-full place-items-center text-blue-dark" aria-hidden="true">
          <Icon :name="isSeries ? 'material-symbols:tv-gen-outline-rounded' : 'material-symbols:theaters'" class="h-14 w-14" />
        </div>
      </div>

      <div class="min-w-0 flex-1 space-y-5">
        <div class="space-y-2">
          <p class="kicker">{{ isSeries ? 'Série' : 'Filme' }}</p>
          <h1 class="text-[2.2rem] font-bold leading-tight tracking-tight text-ink">{{ displayTitle }}</h1>

          <p class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.95rem] text-ink-muted">
            <span v-if="media.rating" class="inline-flex items-center gap-1 font-semibold text-[#ffc94d]">
              <Icon name="material-symbols:star-rounded" class="h-4 w-4" aria-hidden="true" />
              {{ media.rating.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }}
            </span>
            <template v-for="(part, index) in metaParts" :key="part">
              <span v-if="index > 0 || media.rating" aria-hidden="true">·</span>
              <span class="tabular-nums">{{ part }}</span>
            </template>
            <span
              v-if="media.quality"
              class="rounded-sm border border-white/15 bg-black/60 px-1.5 py-0.5 text-[0.7rem] font-semibold tracking-wide text-blue"
            >
              {{ media.quality }}
            </span>
          </p>
        </div>

        <ul v-if="media.genres.length" class="flex flex-wrap gap-2" aria-label="Gêneros">
          <li
            v-for="genre in media.genres"
            :key="genre"
            class="rounded-full border border-line bg-surface/70 px-3 py-1 text-[0.8rem] text-ink"
          >
            {{ genre }}
          </li>
        </ul>

        <p v-if="media.description" class="synopsis max-w-[60ch] text-[1rem] leading-relaxed text-ink/90">
          {{ media.description }}
        </p>
        <p v-else class="text-[0.95rem] text-ink-muted">Sinopse não disponível.</p>

        <!-- Ações -->
        <div class="flex flex-wrap gap-3 pt-1">
          <button
            ref="primaryEl"
            type="button"
            class="inline-flex h-12 items-center gap-2 rounded-full bg-blue-dark px-7 text-[0.95rem] font-semibold text-ink shadow-[0_0_18px_rgba(22,136,255,0.45)] transition-colors duration-fast hover:bg-blue focus:outline-none focus-visible:shadow-focus"
            @click="watchNow"
          >
            <Icon
              :name="isSeries ? 'material-symbols:playlist-play-rounded' : 'material-symbols:play-arrow-rounded'"
              class="h-6 w-6"
              aria-hidden="true"
            />
            {{ isSeries ? 'Ver episódios' : 'Assistir' }}
          </button>

          <button
            v-if="media.trailerId"
            type="button"
            class="action-btn inline-flex h-12 text-ink items-center gap-2 rounded-full border px-6 text-[0.95rem] font-medium transition-colors duration-fast focus:outline-none focus-visible:shadow-focus"
            @click="openTrailer"
          >
            <Icon name="material-symbols:movie-outline-rounded" class="h-5 w-5" aria-hidden="true" />
            Trailer
          </button>

          <button
            type="button"
            class="action-btn inline-flex h-12 text-ink items-center gap-2 rounded-full border px-6 text-[0.95rem] font-medium transition-colors duration-fast focus:outline-none focus-visible:shadow-focus"
            :aria-pressed="favorite"
            @click="toggleFavorite"
          >
            <Icon
              :name="favorite ? 'material-symbols:star-rounded' : 'material-symbols:star-outline-rounded'"
              class="h-5 w-5"
              :class="favorite ? 'text-[#ffc94d]' : ''"
              aria-hidden="true"
            />
            {{ favorite ? 'Nos favoritos' : 'Favoritar' }}
          </button>
        </div>

        <!-- Ficha -->
        <dl v-if="media.director || cast.length" class="grid max-w-[60ch] grid-cols-[auto_1fr] gap-x-5 gap-y-2 pt-2 text-[0.9rem]">
          <template v-if="media.director">
            <dt class="text-ink-muted">Direção</dt>
            <dd class="text-ink">{{ media.director }}</dd>
          </template>
          <template v-if="cast.length">
            <dt class="text-ink-muted">Elenco</dt>
            <dd class="text-ink">{{ cast.join(', ') }}</dd>
          </template>
        </dl>
      </div>
    </article>

    <!-- Trailer em tela cheia — vive em `?trailer=1`: o Voltar do controle fecha. -->
    <div
      v-if="trailerOpen && media?.trailerId"
      class="fixed inset-0 z-[80] bg-black"
      role="dialog"
      aria-label="Trailer"
      @keydown.esc="closeTrailer"
    >
      <!-- Mesmo player da MTV (IFrame API com origin) — iframe solto falha na WebView do APK. -->
      <div ref="trailerHost" class="trailer-host h-full w-full" />
      <p
        v-if="trailerError"
        class="absolute inset-0 grid place-items-center px-6 text-center text-[1rem] text-ink-muted"
        role="alert"
      >
        {{ trailerError }}
      </p>
      <button
        ref="closeTrailerEl"
        type="button"
        class="absolute right-6 top-6 inline-flex h-11 items-center gap-2 rounded-full border border-white/25 bg-black/70 px-5 text-sm font-medium text-ink focus:outline-none focus-visible:shadow-focus"
        @click="closeTrailer"
      >
        <Icon name="material-symbols:close-rounded" class="h-5 w-5" aria-hidden="true" />
        Fechar trailer
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatRuntime, stripEpisodeToken } from '~/utils/format';
import { mediaHref } from '~/utils/media';
import { usePreferencesStore } from '~/stores/preferences';
import type { YoutubePlayerHandle } from '~/composables/useYoutubePlayer';

const route = useRoute();
const router = useRouter();

// Mesmo formato de slug do player: `${titulo-slug}-${id}` — o id é o trecho após o último hífen.
const slugParam = Array.isArray(route.params.slug) ? route.params.slug.join('/') : String(route.params.slug ?? '');
const lastSegment = slugParam.split('/').filter(Boolean).at(-1) ?? '';
const mediaId = lastSegment.split('-').at(-1) ?? '';

if (!/^m[0-9a-z]+$/.test(mediaId)) {
  throw createError({ statusCode: 404, message: 'Título não encontrado' });
}

// Trocar de título (ex.: favoritos → outro) remonta a tela.
definePageMeta({ key: (route) => route.path });

const { media, isLoading, notFound, error, refresh } = useMediaDetail(() => mediaId);

watch(
  notFound,
  (value) => {
    if (value) throw createError({ statusCode: 404, message: 'Título não encontrado', fatal: true });
  },
  { immediate: true },
);

const isSeries = computed(() => media.value?.type === 'series');

/** Série no catálogo é a coletânea — título sem o token de episódio (SxxEyy). */
const displayTitle = computed(() => {
  const value = media.value;
  if (!value) return '';
  return value.type === 'series' ? stripEpisodeToken(value.title) : value.title;
});

useHead({ title: computed(() => (displayTitle.value ? `Pryma — ${displayTitle.value}` : 'Pryma')) });

const metaParts = computed(() => {
  const value = media.value;
  if (!value) return [];
  const parts: string[] = [];
  if (value.year) parts.push(String(value.year));
  const runtime = formatRuntime(value.durationSec);
  if (runtime) parts.push(runtime);
  if (value.categoryName) parts.push(value.categoryName);
  return parts;
});

const cast = computed(() => (media.value?.actors ?? []).slice(0, 8));

const backdropFailed = ref(false);
const posterFailed = ref(false);
const backdrop = computed(() => media.value?.backdropUrl || media.value?.thumbnailUrl || null);

/* ── Ações ─────────────────────────────────────────────────────────────── */

function watchNow(): void {
  const value = media.value;
  if (value) void navigateTo(mediaHref(value));
}

const preferences = usePreferencesStore();
const favorite = computed(() => (media.value ? preferences.isFavorite(media.value.id) : false));

function toggleFavorite(): void {
  if (media.value) preferences.toggleFavorite(media.value.id, media.value);
}

/* ── Trailer ───────────────────────────────────────────────────────────── */

const trailerOpen = computed(() => route.query.trailer === '1');
// Fundo animado parado durante o trailer (mesmo decodificador de vídeo).
useSuspendBackgroundMotion(() => trailerOpen.value);
const closeTrailerEl = ref<HTMLElement | null>(null);
const primaryEl = ref<HTMLElement | null>(null);

const trailerHost = ref<HTMLElement | null>(null);
const trailerError = ref('');
/** Um player por abertura — `destroy()` do handle é definitivo. */
let trailerPlayer: YoutubePlayerHandle | null = null;

function stopTrailer(): void {
  trailerPlayer?.destroy();
  trailerPlayer = null;
  trailerError.value = '';
}

async function startTrailer(): Promise<void> {
  const id = media.value?.trailerId;
  await nextTick();
  const host = trailerHost.value;
  if (!id || !host) return;
  const player = useYoutubePlayer({
    onEnded: closeTrailer,
    onError: () => {
      trailerError.value = 'Este trailer não pode ser reproduzido aqui.';
    },
  });
  trailerPlayer = player;
  try {
    await player.mount(host, id);
  } catch {
    if (trailerPlayer === player) trailerError.value = 'Não foi possível carregar o trailer.';
  }
}

/** Entra no histórico: o Voltar do controle (history.back) fecha o trailer, não a tela. */
function openTrailer(): void {
  void router.push({ query: { ...route.query, trailer: '1' } });
}

function closeTrailer(): void {
  if (trailerOpen.value) router.back();
}

watch(trailerOpen, async (open) => {
  if (!open) {
    stopTrailer();
    await nextTick();
    focusPrimary();
    return;
  }
  void startTrailer();
  await nextTick();
  closeTrailerEl.value?.focus({ preventScroll: true });
});

onMounted(() => {
  // Recarregou com `?trailer=1`: abre a tela normal (o trailer só abre por ação).
  if (trailerOpen.value) void router.replace({ query: { ...route.query, trailer: undefined } });
});

onBeforeUnmount(stopTrailer);

// Foco inicial no Assistir — OK já abre o título. Vale tanto pro detalhe que
// já veio no HTML (montagem) quanto pro que chega depois (watch).
function focusPrimary(): void {
  if (!trailerOpen.value) primaryEl.value?.focus({ preventScroll: true });
}
onMounted(focusPrimary);
watch(primaryEl, (element) => {
  if (element) void nextTick(focusPrimary);
});
</script>

<style scoped>
.poster {
  width: 16rem;
  height: 24rem;
}

.detail-scrim {
  background:
    linear-gradient(90deg, rgba(2, 8, 23, 0.97) 0%, rgba(2, 8, 23, 0.85) 45%, rgba(2, 8, 23, 0.45) 100%),
    linear-gradient(0deg, rgba(2, 8, 23, 0.95) 0%, transparent 45%);
}

.synopsis {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
  overflow: hidden;
}

.action-btn {
  border-color: rgba(124, 154, 255, 0.3);
  background: rgba(8, 22, 52, 0.75);
}

.action-btn:hover {
  border-color: rgba(77, 157, 255, 0.6);
}

/* O YT.Player troca o nó por um iframe — ele precisa ocupar a tela toda. */
.trailer-host :deep(iframe) {
  width: 100%;
  height: 100%;
  border: 0;
}
</style>
