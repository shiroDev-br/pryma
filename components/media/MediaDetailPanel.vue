<template>
  <aside v-if="media" class="overflow-hidden rounded-lg border border-line/70 bg-surface/80 backdrop-blur-md" aria-label="Detalhe do título">
    <!-- Hero: arte do título com fade para a superfície do painel -->
    <div class="relative aspect-video w-full overflow-hidden bg-elevated">
      <img
        v-if="!heroFailed && media.thumbnailUrl"
        :key="media.id"
        :src="media.thumbnailUrl"
        :alt="media.title"
        decoding="async"
        class="h-full w-full object-cover object-[center_28%]"
        @error="heroFailed = true"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center text-blue-dark"
        aria-hidden="true"
      >
        <Icon name="material-symbols:theaters" class="h-12 w-12" />
      </div>

      <div class="absolute inset-0 bg-gradient-to-t from-surface via-surface/35 to-transparent" aria-hidden="true" />

      <span
        v-if="media.quality"
        class="absolute right-3 top-3 rounded-sm bg-black/70 px-2 py-1 text-[0.65rem] font-semibold tracking-wide text-blue backdrop-blur-sm"
      >
        {{ media.quality }}
      </span>
    </div>

    <div class="space-y-5 p-5 sm:p-6">
      <div class="space-y-2.5">
        <h2 class="text-[1.5rem] font-bold leading-tight tracking-tight text-ink">{{ displayTitle }}</h2>
        <p v-if="metaLabel" class="text-sm text-ink-muted">{{ metaLabel }}</p>
        <p v-if="synopsis" class="text-sm leading-relaxed text-ink-muted">{{ synopsis }}</p>
      </div>

      <div class="flex flex-wrap gap-3">
        <NuxtLink
          :to="mediaHref(media)"
          class="inline-flex h-11 items-center gap-2 rounded-full bg-blue-dark px-6 text-sm font-semibold text-ink shadow-[0_0_18px_rgba(22,136,255,0.45)] transition-colors duration-fast hover:bg-blue focus:outline-none focus-visible:shadow-focus"
        >
          <Icon :name="primaryIcon" class="h-5 w-5" aria-hidden="true" />
          {{ primaryLabel }}
        </NuxtLink>

        <button
          type="button"
          class="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-elevated/70 px-5 text-sm font-medium text-ink transition-colors duration-fast hover:border-blue/50 hover:text-blue-light focus:outline-none focus-visible:shadow-focus"
          :aria-pressed="favorite"
          @click="toggleFavorite"
        >
          <Icon
            :name="favorite ? 'material-symbols:bookmark' : 'material-symbols:bookmark-outline'"
            class="h-5 w-5"
            :class="favorite ? 'text-blue-light' : ''"
            aria-hidden="true"
          />
          {{ favorite ? 'Na sua lista' : 'Adicionar à lista' }}
        </button>
      </div>

      <div v-if="tiles.length" class="flex flex-wrap gap-x-6 gap-y-4 border-y border-line/70 py-4">
        <div v-for="tile in tiles" :key="tile.label" class="flex min-w-[8.5rem] flex-1 items-center gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-elevated text-blue"
            aria-hidden="true"
          >
            <Icon :name="tile.icon" class="h-5 w-5" />
          </span>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-ink">{{ tile.value }}</p>
            <p class="text-xs text-ink-muted">{{ tile.label }}</p>
          </div>
        </div>
      </div>

      <section v-if="cast.length" aria-labelledby="panel-cast-heading">
        <h3 id="panel-cast-heading" class="text-[0.95rem] font-semibold text-ink">
          Elenco principal
        </h3>
        <ul class="mt-3 grid grid-cols-3 gap-x-3 gap-y-4 xl:grid-cols-4">
          <li v-for="actor in cast" :key="actor" class="min-w-0 text-center">
            <span
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-line bg-elevated text-sm font-semibold text-blue-light"
              aria-hidden="true"
            >
              {{ initials(actor) }}
            </span>
            <p class="mt-2 truncate text-xs font-medium text-ink" :title="actor">{{ actor }}</p>
          </li>
        </ul>
      </section>

      <section v-if="similar.length" aria-labelledby="panel-similar-heading">
        <h3 id="panel-similar-heading" class="text-[0.95rem] font-semibold text-ink">
          Mais como este
        </h3>
        <ul class="rail-scroll mt-3 flex gap-3 overflow-x-auto pb-1">
          <li v-for="item in similar" :key="item.id" class="shrink-0">
            <NuxtLink
              :to="mediaHref(item)"
              class="group block w-[6.5rem] overflow-hidden rounded-md border border-line/70 bg-elevated transition-colors duration-fast hover:border-blue/50 focus:outline-none focus-visible:shadow-focus"
              :aria-label="item.title"
              @mouseenter="emit('preview', item)"
              @focus="emit('preview', item)"
            >
              <span class="relative block aspect-[2/3] w-full overflow-hidden">
                <img
                  v-if="!failedThumbs[item.id] && item.thumbnailUrl"
                  :src="item.thumbnailUrl"
                  :alt="item.title"
                  loading="lazy"
                  decoding="async"
                  class="h-full w-full object-cover transition-transform duration-normal group-hover:scale-105"
                  @error="failedThumbs[item.id] = true"
                />
                <span
                  v-else
                  class="absolute inset-0 flex items-center justify-center text-blue-dark"
                  aria-hidden="true"
                >
                  <Icon name="material-symbols:theaters" class="h-7 w-7" />
                </span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { formatRuntime, stripEpisodeToken } from '~/utils/format';
import { mediaHref } from '~/utils/media';
import { useMediaDetailsStore } from '~/stores/mediaDetails';
import { usePreferencesStore } from '~/stores/preferences';
import type { MediaDetail, MediaSummary } from '~/types';

const props = defineProps<{
  media: MediaSummary | null;
  similar: MediaSummary[];
}>();

const emit = defineEmits<{
  preview: [media: MediaSummary];
}>();

const detailsStore = useMediaDetailsStore();
const preferences = usePreferencesStore();

const detail = computed<MediaDetail | null>(() =>
  props.media ? detailsStore.find(props.media.id) : null,
);

/** Série não manda pro player — manda pra escolha de episódio. */
const isSeries = computed(() => props.media?.type === 'series' && !!props.media?.seriesId);
const primaryLabel = computed(() => (isSeries.value ? 'Escolher episódio' : 'Assistir agora'));
const primaryIcon = computed(() =>
  isSeries.value ? 'material-symbols:playlist-play-rounded' : 'material-symbols:play-arrow-rounded',
);

// Busca do detalhe só no cliente — o HTML SSR já sai com título/meta/CTA.
watch(
  () => props.media?.id,
  (id) => {
    if (id && import.meta.client) detailsStore.ensure(id);
  },
  { immediate: true },
);

const heroFailed = ref(false);
watch(
  () => props.media?.id,
  () => {
    heroFailed.value = false;
  },
);

const failedThumbs = ref<Record<string, boolean>>({});

const synopsis = computed(() => detail.value?.description ?? null);

/** Série na listagem é a coletânea — título limpo; o episódio aparece no meta. */
const displayTitle = computed(() => {
  const media = props.media;
  if (!media) return '';
  return media.type === 'series' ? stripEpisodeToken(media.title) : media.title;
});

const episodeCode = computed(() => {
  const media = props.media;
  if (!media || media.type !== 'series' || media.season == null) return null;
  return media.episode != null ? `T${media.season} E${media.episode}` : `T${media.season}`;
});

const metaLabel = computed(() => {
  const media = props.media;
  if (!media) return '';

  const parts: string[] = [];

  if (episodeCode.value) parts.push(episodeCode.value);

  const genres = detail.value?.genres ?? [];

  if (genres.length) parts.push(...genres.slice(0, 2));
  else if (media.categoryName) parts.push(media.categoryName);

  if (media.year) parts.push(String(media.year));

  const runtime = formatRuntime(media.durationSec);
  if (runtime) parts.push(runtime);

  return parts.join(' • ');
});

interface InfoTile {
  icon: string;
  value: string;
  label: string;
}

const tiles = computed<InfoTile[]>(() => {
  const media = props.media;
  if (!media) return [];

  const list: InfoTile[] = [];

  const runtime = formatRuntime(media.durationSec);
  if (runtime) {
    list.push({ icon: 'material-symbols:schedule-rounded', value: runtime, label: 'Duração' });
  }

  const genres = detail.value?.genres ?? [];
  const genreValue = genres.length ? genres.join(' / ') : media.categoryName;
  if (genreValue) {
    list.push({ icon: 'material-symbols:theaters-outline-rounded', value: genreValue, label: 'Gênero' });
  }

  if (media.year) {
    list.push({
      icon: 'material-symbols:calendar-month-outline-rounded',
      value: String(media.year),
      label: 'Ano',
    });
  }

  return list;
});

const cast = computed(() => (detail.value?.actors ?? []).slice(0, 8));

const favorite = computed(() => (props.media ? preferences.isFavorite(props.media.id) : false));

function toggleFavorite(): void {
  if (props.media) preferences.toggleFavorite(props.media.id);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}
</script>
