<template>
  <NuxtLink
    :to="`/medias/${episode.slug}`"
    class="group flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors duration-fast focus:outline-none focus-visible:shadow-focus sm:gap-4 sm:p-3.5"
    :class="
      lastWatched
        ? 'border-blue/60 bg-[#081a42]/85'
        : 'border-line/70 bg-surface/70 hover:border-blue-dark/60 hover:bg-surface'
    "
    :aria-label="ariaLabel"
  >
    <span
      class="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-elevated text-sm font-bold tabular-nums"
      :class="lastWatched ? 'text-blue' : 'text-ink-muted'"
      aria-hidden="true"
    >
      {{ episodeNumber }}
    </span>

    <div class="min-w-0 flex-1">
      <p class="truncate text-[0.98rem] font-semibold leading-snug text-ink">{{ displayTitle }}</p>
      <p
        class="mt-0.5 flex items-center gap-1.5 truncate text-[0.78rem] transition-colors duration-fast"
        :class="lastWatched ? 'text-blue' : 'text-ink-muted'"
      >
        <span v-if="durationLabel" class="tabular-nums">{{ durationLabel }}</span>
        <template v-if="lastWatched">
          <span aria-hidden="true">·</span>
          <span class="font-semibold">Último assistido</span>
        </template>
        <template v-else-if="isWatched">
          <span aria-hidden="true">·</span>
          <span class="inline-flex items-center gap-1">
            <Icon name="material-symbols:check-rounded" class="h-3.5 w-3.5" aria-hidden="true" />
            Assistido
          </span>
        </template>
        <template v-else-if="resumeLabel">
          <span aria-hidden="true">·</span>
          <span>Continuar de {{ resumeLabel }}</span>
        </template>
      </p>
    </div>

    <span
      class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted transition-colors duration-fast"
      :class="lastWatched ? 'border border-[#4d9dff]/70 bg-[#0b3a9c]/60 text-ink' : 'group-hover:text-blue-light'"
      aria-hidden="true"
    >
      <Icon name="material-symbols:play-arrow-rounded" class="h-5 w-5" />
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { RESUME_MAX_RATIO, RESUME_MIN_SECONDS } from '~/constants';
import { formatDuration, stripEpisodeToken } from '~/utils/format';
import type { MediaSummary } from '~/types';

const props = defineProps<{
  episode: MediaSummary;
  lastWatched: boolean;
  watchPosition: { positionSec: number; durationSec: number } | null;
}>();

const episodeNumber = computed(() => {
  if (props.episode.episode != null) return String(props.episode.episode).padStart(2, '0');
  if (props.episode.season != null) return `T${props.episode.season}`;
  return '—';
});

const displayTitle = computed(() => {
  const stripped = stripEpisodeToken(props.episode.title);
  return stripped === props.episode.title ? props.episode.title : stripped || props.episode.title;
});

const durationLabel = computed(() => formatDuration(props.episode.durationSec));

const isWatched = computed(() => {
  const position = props.watchPosition;
  if (!position?.durationSec) return false;
  return position.positionSec >= position.durationSec * RESUME_MAX_RATIO;
});

const resumeLabel = computed(() => {
  const position = props.watchPosition;
  if (!position || isWatched.value) return null;
  if (position.positionSec < RESUME_MIN_SECONDS) return null;
  return formatDuration(position.positionSec);
});

const episodeCode = computed(() => {
  const { season, episode } = props.episode;
  if (season == null) return null;
  return episode != null ? `T${season} E${episode}` : `T${season}`;
});

const ariaLabel = computed(() => {
  const code = episodeCode.value;
  return code ? `${code} — ${props.episode.title}` : props.episode.title;
});
</script>
