<template>
  <NuxtLink
    :to="mediaHref(media)"
    class="group relative block w-full overflow-hidden rounded-md border border-line/70 bg-surface transition-all duration-normal hover:-translate-y-1 hover:border-blue-dark/70 hover:shadow-card focus-visible:shadow-focus"
    :aria-label="media.title"
  >
    <div class="relative aspect-[2/3] w-full overflow-hidden bg-elevated">
      <img
        v-if="!imageFailed && media.thumbnailUrl"
        :src="media.thumbnailUrl"
        :alt="media.title"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover transition-transform duration-normal group-hover:scale-[1.04]"
        @error="imageFailed = true"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center text-blue-dark"
        aria-hidden="true"
      >
        <Icon name="material-symbols:theaters" class="h-10 w-10" />
      </div>

      <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

      <span
        v-if="media.isLive"
        class="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-sm bg-black/70 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-danger backdrop-blur-sm"
      >
        <span class="live-dot h-1.5 w-1.5 rounded-full bg-danger" aria-hidden="true" />
        Ao vivo
      </span>

      <span
        v-if="media.quality"
        class="absolute right-2 top-2 rounded-sm bg-black/70 px-2 py-1 text-[0.65rem] font-semibold tracking-wide text-blue backdrop-blur-sm"
      >
        {{ media.quality }}
      </span>

      <div class="absolute inset-x-0 bottom-0 p-3">
        <p
          class="truncate text-sm font-semibold text-ink drop-shadow-sm transition-colors duration-fast group-hover:text-blue-light"
        >
          {{ media.title }}
        </p>
        <p class="mt-0.5 flex items-center gap-1.5 truncate text-[0.7rem] text-ink-muted">
          <template v-if="media.categoryName">{{ media.categoryName }}</template>
          <template v-if="media.year">
            <span aria-hidden="true">·</span>
            {{ media.year }}
          </template>
          <template v-if="durationLabel">
            <span aria-hidden="true">·</span>
            <span class="tabular-nums">{{ durationLabel }}</span>
          </template>
        </p>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { formatDuration } from '~/utils/format';
import { mediaHref } from '~/utils/media';
import type { MediaSummary } from '~/types';

const props = defineProps<{
  media: MediaSummary;
}>();

const imageFailed = ref(false);

const durationLabel = computed(() =>
  props.media.isLive ? null : formatDuration(props.media.durationSec),
);
</script>
