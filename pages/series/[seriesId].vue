<template>
  <div class="tv-safe pb-28 pt-24">
    <header class="mb-8 space-y-6">
      <NuxtLink
        to="/browse/series"
        class="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors duration-fast hover:text-ink"
      >
        <Icon name="material-symbols:arrow-back-rounded" class="h-4 w-4" aria-hidden="true" />
        Séries
      </NuxtLink>

      <div v-if="seriesTitle" class="flex gap-5">
        <div class="hidden w-40 shrink-0 overflow-hidden rounded-md border border-line/70 bg-elevated sm:block">
          <img
            v-if="posterUrl"
            :src="posterUrl"
            :alt="seriesTitle"
            class="aspect-[2/3] w-full object-cover object-[center_30%]"
          />
          <div v-else class="grid aspect-[2/3] w-full place-items-center text-blue-dark" aria-hidden="true">
            <Icon name="material-symbols:tv-gen-outline-rounded" class="h-10 w-10" />
          </div>
        </div>

        <div class="min-w-0 space-y-4">
          <div class="space-y-1.5">
            <p class="kicker">Série</p>
            <h1 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ seriesTitle }}</h1>
            <p class="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
              <template v-if="seasonCount > 0">
                <span>{{ seasonLabel(seasonCount) }}</span>
                <span aria-hidden="true">·</span>
              </template>
              <span class="tabular-nums">{{ resultLabel }}</span>
              <template v-if="firstYear">
                <span aria-hidden="true">·</span>
                <span>{{ firstYear }}</span>
              </template>
            </p>
          </div>

          <button
            v-if="continueTarget"
            type="button"
            class="inline-flex items-center gap-2.5 rounded-full bg-blue px-6 py-3 text-sm font-semibold text-[#04101f] shadow-[0_0_22px_rgba(22,136,255,0.5)] transition hover:bg-blue-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            @click="watch(continueTarget)"
          >
            <Icon name="material-symbols:play-arrow-rounded" class="h-5 w-5" aria-hidden="true" />
            {{ continueLabel }}
          </button>
        </div>
      </div>
    </header>

    <LoadingState v-if="episodes.isPending.value" message="Carregando episódios…" />

    <ErrorState
      v-else-if="notFound"
      title="Série não encontrada"
      description="Ela pode ter sido removida do catálogo."
    />

    <ErrorState
      v-else-if="episodes.error.value"
      title="Não foi possível carregar os episódios"
      :message="episodes.error.value.message"
      :on-retry="episodes.refresh"
    />

    <EmptyState
      v-else-if="episodes.items.value.length === 0"
      title="Nenhum episódio"
      description="Esta série ainda não tem episódios disponíveis."
    />

    <template v-else>
      <section
        v-for="[season, list] in seasons"
        :key="season"
        class="mb-10 space-y-3"
        :aria-label="seasonLabel(season)"
      >
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="text-lg font-bold tracking-tight text-ink">
            {{ season === 0 ? 'Especiais' : `T${season}` }}
            <span v-if="season !== 0" class="ml-1.5 text-sm font-normal text-ink-muted">
              Temporada {{ season }}
            </span>
          </h2>
          <p class="text-sm tabular-nums text-ink-muted">
            {{ list.length }} {{ list.length === 1 ? 'episódio' : 'episódios' }}
          </p>
        </div>

        <div class="space-y-2.5">
          <EpisodeRow
            v-for="episode in list"
            :key="episode.id"
            :episode="episode"
            :last-watched="episode.id === lastWatchedId"
            :watch-position="positions[episode.id] ?? null"
          />
        </div>
      </section>

      <div ref="sentinel" class="h-px" aria-hidden="true" />

      <div class="flex justify-center">
        <button
          v-if="episodes.hasNext.value"
          type="button"
          class="rounded-sm border border-line bg-surface px-6 py-2.5 text-sm text-ink transition-colors duration-fast hover:border-blue-dark hover:text-blue-light disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="episodes.isLoading.value"
          @click="episodes.loadMore()"
        >
          {{ episodes.isLoading.value ? 'Carregando…' : 'Carregar mais' }}
        </button>
      </div>
    </template>

    <BottomInfoBar
      :title="seriesTitle ?? 'Série'"
      :subtitle="resultLabel"
      icon="material-symbols:tv-gen-outline-rounded"
    />
  </div>
</template>

<script setup lang="ts">
import { RESUME_MAX_RATIO, RESUME_MIN_SECONDS } from '~/constants';
import { stripEpisodeToken } from '~/utils/format';
import { loadWatchPositions } from '~/utils/watchProgress';
import { loadSeriesProgress } from '~/utils/seriesProgress';
import type { SeriesProgressEntry } from '~/utils/seriesProgress';
import type { MediaSummary } from '~/types';

const route = useRoute();

const seriesId = String(route.params.seriesId ?? '').trim();
if (!seriesId) {
  throw createError({ statusCode: 404, message: 'Série não encontrada' });
}

/** Episódios da coletânea — ordenados por temporada/episódio (SPEC §6.7). */
const episodes = useMediaList(computed(() => ({ series: seriesId, sort: 'episode', limit: 100 })));

// SSR: hidrata com dados/404 reais em vez de "Carregando episódios…".
await episodes.ready;

const notFound = computed(() => episodes.error.value?.status === 404);

const seriesTitle = computed(() => {
  const first = episodes.items.value[0];
  return first ? stripEpisodeToken(first.title) : null;
});

const posterUrl = computed(() => {
  const first = episodes.items.value[0];
  return first?.thumbnailUrl ?? first?.logoUrl ?? null;
});

const firstYear = computed(() => episodes.items.value[0]?.year ?? null);

const seasonCount = computed(
  () => new Set(episodes.items.value.map((episode) => episode.season).filter((s) => s != null)).size,
);

const resultLabel = computed(() => {
  const total = episodes.total.value || episodes.items.value.length;
  return `${total} ${total === 1 ? 'episódio' : 'episódios'}`;
});

/** Agrupa por temporada preservando a ordem do servidor. */
const seasons = computed<[number, MediaSummary[]][]>(() => {
  const map = new Map<number, MediaSummary[]>();

  for (const episode of episodes.items.value) {
    const key = episode.season ?? 0;
    const list = map.get(key);
    if (list) list.push(episode);
    else map.set(key, [episode]);
  }

  return [...map.entries()].sort(([a], [b]) => a - b);
});

function seasonLabel(count: number): string {
  return count === 1 ? '1 temporada' : `${count} temporadas`;
}

/* ---------- Progresso local (uma leitura de storage) ---------- */

const positions = ref<Record<string, { positionSec: number; durationSec: number }>>({});
const seriesProgress = ref<SeriesProgressEntry | null>(null);

onMounted(() => {
  positions.value = loadWatchPositions();
  seriesProgress.value = loadSeriesProgress(seriesId);
});

const lastWatchedId = computed(() => seriesProgress.value?.mediaId ?? null);

/** Episódio do botão principal: último assistido (ou o seguinte, se já terminou). */
const continueTarget = computed<MediaSummary | null>(() => {
  const list = episodes.items.value;
  if (list.length === 0) return null;

  const progress = seriesProgress.value;
  if (!progress) return list[0];

  const index = list.findIndex((episode) => episode.id === progress.mediaId);
  const completed =
    progress.durationSec > 0 && progress.positionSec >= progress.durationSec * RESUME_MAX_RATIO;

  if (index >= 0) {
    if (completed && index + 1 < list.length) return list[index + 1];
    return list[index];
  }

  return list[0];
});

const continueLabel = computed(() => {
  const target = continueTarget.value;
  if (!target) return 'Assistir';

  const progress = seriesProgress.value;
  const resuming =
    progress != null &&
    progress.mediaId === target.id &&
    progress.positionSec >= RESUME_MIN_SECONDS &&
    progress.durationSec > 0 &&
    progress.positionSec < progress.durationSec * RESUME_MAX_RATIO;

  const season = target.season;
  const code =
    season != null ? (target.episode != null ? `T${season} E${target.episode}` : `T${season}`) : null;

  if (resuming && code) return `Continuar ${code}`;
  return code ? `Assistir ${code}` : `Assistir ${target.title}`;
});

function watch(episode: MediaSummary): void {
  navigateTo(`/medias/${episode.slug}`);
}

/* ---------- Infinite scroll ---------- */

const sentinel = ref<HTMLElement | null>(null);
useIntersectionObserver(sentinel, (isIntersecting) => {
  if (isIntersecting) episodes.loadMore();
});

useHead({ title: computed(() => (seriesTitle.value ? `Pryma — ${seriesTitle.value}` : 'Pryma — Série')) });
</script>
