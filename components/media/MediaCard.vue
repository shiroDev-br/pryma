<template>
  <NuxtLink
    :to="detailHref(media)"
    class="media-card group relative block w-full overflow-hidden rounded-md border border-line/70 bg-surface transition-[transform,border-color] duration-normal focus-visible:shadow-focus"
    :aria-label="media.title"
    data-media-card
  >
    <div class="ratio-2x3 relative aspect-[2/3] w-full overflow-hidden bg-elevated">
      <img
        v-if="!imageFailed && media.thumbnailUrl"
        :src="tmdbSized(media.thumbnailUrl, 'w342')"
        :alt="media.title"
        loading="lazy"
        decoding="async"
        class="absolute inset-0 h-full w-full media-card__poster object-cover transition-transform duration-normal"
        @error="imageFailed = true"
      />
      <div
        v-else
        class="absolute inset-0 flex items-center justify-center text-blue-dark"
        aria-hidden="true"
      >
        <Icon name="material-symbols:theaters" class="h-10 w-10" />
      </div>

      <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

      <span
        v-if="media.isLive"
        class="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-sm bg-black/85 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-danger"
      >
        <span class="live-dot h-1.5 w-1.5 rounded-full bg-danger" aria-hidden="true" />
        Ao vivo
      </span>

      <span
        v-if="media.quality"
        class="absolute right-2 top-2 rounded-sm bg-black/85 px-2 py-1 text-[0.65rem] font-semibold tracking-wide text-blue"
      >
        {{ media.quality }}
      </span>

      <div class="absolute inset-x-0 bottom-0 p-3">
        <p
          class="truncate text-sm font-semibold text-ink media-card__title drop-shadow-sm transition-colors duration-fast"
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
import { tmdbSized } from '~/utils/imageSize';
import { formatDuration } from '~/utils/format';
import { detailHref } from '~/utils/media';
import type { MediaSummary } from '~/types';

const props = defineProps<{
  media: MediaSummary;
}>();

const imageFailed = ref(false);

const durationLabel = computed(() =>
  props.media.isLive ? null : formatDuration(props.media.durationSec),
);
</script>

<style scoped>
/* Hover só fora do modo D-pad: na TV o ponteiro fica parado sobre a grade e o
   card embaixo dele ficava "levantado" junto do card com o cursor 2D — dois
   títulos marcados. */
body:not(.dpad-mode) .media-card:hover {
  transform: translateY(-0.25rem);
  border-color: rgba(var(--color-blue-dark-rgb), 0.7);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}

body:not(.dpad-mode) .media-card:hover .media-card__poster {
  transform: scale(1.04);
}

body:not(.dpad-mode) .media-card:hover .media-card__title {
  color: var(--color-blue-light);
}
</style>
