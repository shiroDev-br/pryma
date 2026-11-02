<template>
  <div class="tv-safe pb-28 pt-24">
    <header class="mb-8 space-y-6">
      <NuxtLink
        ref="seriesLinkEl"
        to="/browse/series"
        class="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors duration-fast hover:text-ink"
        @keydown.down="onSeriesLinkDown"
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
            ref="continueEl"
            type="button"
            class="inline-flex items-center gap-2.5 rounded-full bg-blue px-6 py-3 text-sm font-semibold text-[#04101f] shadow-[0_0_22px_rgba(22,136,255,0.5)] transition hover:bg-blue-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            @click="playEpisode(continueTarget)"
            @keydown="onContinueKey"
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

    <!-- Episódio a episódio de uma temporada (`?season=N`) -->
    <template v-else-if="openSeason">
      <div class="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          ref="backToSeasonsEl"
          type="button"
          class="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface/70 px-4 text-sm font-medium text-ink transition-colors duration-fast hover:border-blue/50 hover:text-blue-light focus:outline-none focus-visible:shadow-focus"
          @click="closeSeason"
          @keydown.up="focusContinue($event)"
        >
          <Icon name="material-symbols:arrow-back-rounded" class="h-4 w-4" aria-hidden="true" />
          Temporadas
        </button>
        <h2 class="text-lg font-bold tracking-tight text-ink">
          {{ seasonTitle(openSeason[0]) }}
          <span class="ml-1.5 text-sm font-normal tabular-nums text-ink-muted">
            {{ episodeCount(openSeason[1].length) }}
          </span>
        </h2>
      </div>

      <div ref="episodesEl" class="space-y-2.5">
        <EpisodeRow
          v-for="episode in openSeason[1]"
          :key="episode.id"
          :episode="episode"
          :data-episode-id="episode.id"
          :last-watched="episode.id === lastWatchedId"
          :watch-position="positions[episode.id] ?? null"
        />
      </div>
    </template>

    <!-- Temporadas em cards — OK abre os episódios da temporada -->
    <template v-else>
      <div
        ref="seasonsEl"
        class="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6"
        data-media-grid
        @keydown="onSeasonsKeydown"
      >
        <NuxtLink
          v-for="[season, list] in seasons"
          :key="season"
          :to="{ query: { ...route.query, season: String(season) } }"
          class="season-card group relative block w-full overflow-hidden rounded-md border border-line/70 bg-surface transition-[transform,border-color] duration-normal hover:-translate-y-1 hover:border-blue-dark/70 hover:shadow-card focus-visible:shadow-focus"
          :class="{ 'border-blue/60': season === lastWatchedSeason }"
          :aria-label="`${seasonTitle(season)} — ${episodeCount(list.length)}`"
          :data-season="season"
          data-media-card
        >
          <div class="ratio-2x3 relative aspect-[2/3] w-full overflow-hidden bg-elevated">
            <img
              v-if="seasonArt(list)"
              :src="seasonArt(list)!"
              :alt="seasonTitle(season)"
              loading="lazy"
              decoding="async"
              class="absolute inset-0 h-full w-full object-cover transition-transform duration-normal group-hover:scale-[1.04]"
            />
            <div v-else class="absolute inset-0 flex items-center justify-center text-blue-dark" aria-hidden="true">
              <Icon name="material-symbols:tv-gen-outline-rounded" class="h-10 w-10" />
            </div>

            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" aria-hidden="true" />

            <span
              v-if="season === lastWatchedSeason"
              class="absolute left-2 top-2 rounded-sm bg-blue px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#04101f]"
            >
              Continuar
            </span>

            <div class="absolute inset-x-0 bottom-0 p-3">
              <p class="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-blue">
                {{ season === 0 ? 'Extras' : `T${season}` }}
              </p>
              <p class="mt-0.5 truncate text-base font-bold text-ink">{{ seasonTitle(season) }}</p>
              <p class="mt-0.5 text-[0.72rem] tabular-nums text-ink-muted">{{ episodeCount(list.length) }}</p>
            </div>
          </div>
        </NuxtLink>
      </div>

      <p v-if="episodes.hasNext.value" class="mt-6 text-center text-sm text-ink-muted">
        Carregando mais episódios…
      </p>
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

function playEpisode(episode: MediaSummary): void {
  navigateTo(`/medias/${episode.slug}`);
}

/* ---------- Temporadas em cards → episódios ---------- */

const router = useRouter();
const { onGridKeydown } = useGridNav();

/** Os cards precisam de TODAS as temporadas: carrega as páginas restantes
 *  (100 por página) em sequência, logo ao abrir a série. */
onMounted(async () => {
  await episodes.settled;
  let guard = 0;
  while (episodes.hasNext.value && guard++ < 50) {
    await episodes.loadMore();
  }
});

/** Temporada aberta vive na URL — o Voltar (controle/navegador) volta pros cards. */
const openSeasonNumber = computed(() => {
  const value = Number(route.query.season);
  return route.query.season != null && Number.isFinite(value) ? value : null;
});

const openSeason = computed<[number, MediaSummary[]] | null>(() => {
  const number = openSeasonNumber.value;
  if (number === null) return null;
  return seasons.value.find(([season]) => season === number) ?? null;
});

const lastWatchedSeason = computed(() => {
  const id = lastWatchedId.value;
  if (!id) return null;
  const episode = episodes.items.value.find((item) => item.id === id);
  return episode ? (episode.season ?? 0) : null;
});

function seasonTitle(season: number): string {
  return season === 0 ? 'Especiais' : `Temporada ${season}`;
}

function episodeCount(count: number): string {
  return `${count} ${count === 1 ? 'episódio' : 'episódios'}`;
}

/** Arte do card: a do 1º episódio da temporada, senão o pôster da série. */
function seasonArt(list: MediaSummary[]): string | null {
  return list[0]?.thumbnailUrl ?? posterUrl.value;
}

/** Botão "← Temporadas": desempilha se veio dos cards; senão troca a URL. */
function closeSeason(): void {
  if (window.history.state?.back) router.back();
  else void router.replace({ query: { ...route.query, season: undefined } });
}

const seasonsEl = ref<HTMLElement | null>(null);
const episodesEl = ref<HTMLElement | null>(null);
const backToSeasonsEl = ref<HTMLElement | null>(null);
const continueEl = ref<HTMLElement | null>(null);
const seriesLinkEl = ref<{ $el: HTMLElement } | null>(null);

/* ---------- D-pad: ordem vertical explícita ----------
 * Séries → Continuar/Assistir → temporadas (ou "← Temporadas" → episódios).
 * O botão fica à direita do pôster: pela geometria, o motor espacial descia
 * de "Séries" direto pros cards e, de um card mais à direita, subia pro
 * header — o botão principal ficava inalcançável. */

function focusEl(element: HTMLElement | null | undefined): boolean {
  if (!element) return false;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  return true;
}

function focusContinue(event?: KeyboardEvent): void {
  if (!continueEl.value) return;
  event?.preventDefault();
  focusEl(continueEl.value);
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function onSeriesLinkDown(event: KeyboardEvent): void {
  focusContinue(event);
}

/** Primeiro item abaixo do botão: "← Temporadas" (temporada aberta) ou o card da temporada em andamento. */
function belowContinue(): HTMLElement | null {
  if (openSeasonNumber.value !== null) return backToSeasonsEl.value;
  const grid = seasonsEl.value;
  const season = lastWatchedSeason.value;
  return (
    (season !== null ? grid?.querySelector<HTMLElement>(`[data-season="${season}"]`) : null) ??
    grid?.querySelector<HTMLElement>('[data-media-card]') ??
    null
  );
}

function onContinueKey(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    if (focusEl(belowContinue())) event.preventDefault();
  } else if (event.key === 'ArrowUp') {
    if (focusEl(seriesLinkEl.value?.$el)) event.preventDefault();
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    // Nada ao lado do botão: não deixa o motor espacial pular pro header.
    event.preventDefault();
  }
}

/** ↑ na 1ª fileira de temporadas vai pro botão principal; o resto é a grade. */
function onSeasonsKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowUp' && continueEl.value) {
    const card = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-media-card]');
    const first = seasonsEl.value?.querySelector<HTMLElement>('[data-media-card]');
    if (card && first && card.offsetTop === first.offsetTop) {
      focusContinue(event);
      return;
    }
  }
  onGridKeydown(event);
}

// Entrada (e volta do player): foco no botão principal — ou no episódio onde
// parou, se a temporada já estava aberta. Sem isso nada ficava focado e o 1º ↓
// passava por cima do botão.
onMounted(async () => {
  await episodes.settled;
  await nextTick();
  if (openSeasonNumber.value !== null) {
    const list = episodesEl.value;
    const target =
      (lastWatchedId.value && list?.querySelector<HTMLElement>(`[data-episode-id="${lastWatchedId.value}"]`)) ||
      list?.querySelector<HTMLElement>('a');
    if (focusEl(target)) return;
  }
  continueEl.value?.focus({ preventScroll: true });
});

/** Temporada de onde saiu — o card dela recebe o foco na volta. */
let leftSeason: number | null = null;

watch(openSeasonNumber, async (season, previous) => {
  await nextTick();
  if (season !== null) {
    // Abriu: foco no episódio onde parou (ou no primeiro).
    leftSeason = season;
    const list = episodesEl.value;
    const target =
      (lastWatchedId.value && list?.querySelector<HTMLElement>(`[data-episode-id="${lastWatchedId.value}"]`)) ||
      list?.querySelector<HTMLElement>('a');
    (target || backToSeasonsEl.value)?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    return;
  }
  // Voltou pros cards: foco no card da temporada que estava aberta.
  const back = previous ?? leftSeason;
  const card =
    (back !== null && seasonsEl.value?.querySelector<HTMLElement>(`[data-season="${back}"]`)) ||
    seasonsEl.value?.querySelector<HTMLElement>('[data-media-card]');
  card?.focus({ preventScroll: true });
  card?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
});

/** Esc no teclado: dentro da temporada, volta pros cards. */
function onEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || event.defaultPrevented || openSeasonNumber.value === null) return;
  event.preventDefault();
  closeSeason();
}

useBackLayer(() => openSeasonNumber.value !== null, closeSeason);

onMounted(() => window.addEventListener('keydown', onEscape));
onBeforeUnmount(() => window.removeEventListener('keydown', onEscape));

useHead({ title: computed(() => (seriesTitle.value ? `Pryma — ${seriesTitle.value}` : 'Pryma — Série')) });
</script>
