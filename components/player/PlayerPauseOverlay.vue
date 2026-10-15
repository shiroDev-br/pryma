<template>
  <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-between gap-6 px-5 sm:px-8">
    <!-- Card da mídia -->
    <section
      class="pointer-events-auto flex max-w-2xl gap-5 rounded-2xl border border-white/12 bg-[#06142d]/80 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl overlay-rise"
      aria-label="Informações da mídia"
    >
      <div class="relative hidden w-40 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:block">
        <img
          v-if="media.thumbnailUrl"
          :src="media.thumbnailUrl"
          :alt="media.title"
          class="aspect-[2/3] w-full object-cover object-[center_30%]"
        />
        <div v-else class="grid aspect-[2/3] w-full place-items-center bg-[#0a2246]">
          <svg class="h-10 w-10 text-blue/70" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
          </svg>
        </div>
        <span
          v-if="media.quality"
          class="absolute left-2 top-2 rounded-md border border-white/25 bg-black/70 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white"
        >
          {{ media.quality }}
        </span>
      </div>

      <div class="min-w-0 space-y-4">
        <div class="space-y-2">
          <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">{{ media.title }}</h1>

          <div class="flex flex-wrap items-center gap-2 text-sm text-white/75">
            <span
              v-if="media.quality"
              class="rounded-md border border-blue/50 bg-blue/15 px-2 py-0.5 text-xs font-bold text-blue"
            >
              {{ media.quality }}
            </span>
            <span v-if="metaLine" class="tabular-nums">{{ metaLine }}</span>
          </div>

          <p v-if="media.description" class="line-clamp-4 text-sm leading-relaxed text-white/70">
            {{ media.description }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2.5 rounded-full bg-blue px-6 py-3 text-sm font-semibold text-[#04101f] shadow-[0_0_22px_rgba(22,136,255,0.5)] transition hover:bg-blue-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            @click="$emit('play')"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
            </svg>
            {{ primaryLabel }}
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-sm font-medium text-white/90 transition hover:border-white/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            :aria-pressed="isFavorite"
            @click="$emit('toggle-list')"
          >
            <svg v-if="!isFavorite" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 4h12a1 1 0 0 1 1 1v16l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
            </svg>
            <svg v-else class="h-4 w-4 text-blue" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 3h12a2 2 0 0 1 2 2v17.2a1 1 0 0 1-1.45.9L12 18.1l-6.55 3A1 1 0 0 1 4 20.2V5a2 2 0 0 1 2-2Z" />
            </svg>
            {{ isFavorite ? 'Na sua lista' : 'Minha lista' }}
          </button>
        </div>
      </div>
    </section>

    <!-- Card do próximo episódio (séries) -->
    <section
      v-if="nextEpisode"
      class="pointer-events-auto hidden w-80 shrink-0 rounded-2xl border border-white/12 bg-[#06142d]/80 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl overlay-rise lg:block"
      aria-label="Próximo episódio"
    >
      <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-white/60">Próximo episódio</p>

      <button
        type="button"
        class="group flex w-full items-center gap-3 rounded-xl p-1 text-left transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        @click="$emit('open-next')"
      >
        <div class="relative w-36 shrink-0 overflow-hidden rounded-lg border border-white/10">
          <img
            v-if="nextEpisode.thumbnailUrl"
            :src="nextEpisode.thumbnailUrl"
            :alt="nextEpisode.title"
            class="aspect-video w-full object-cover"
          />
          <div v-else class="grid aspect-video w-full place-items-center bg-[#0a2246]">
            <svg class="h-6 w-6 text-blue/70" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
            </svg>
          </div>
        </div>

        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-white">{{ nextEpisode.title }}</p>
          <p class="mt-1 truncate text-xs tabular-nums text-white/60">{{ nextEpisodeMeta }}</p>
        </div>

        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/25 text-white/90 transition group-hover:border-blue group-hover:bg-blue group-hover:text-[#04101f]">
          <svg class="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
          </svg>
        </span>
      </button>

      <div class="mt-2 flex justify-end gap-1 text-white/50">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
        <svg class="-ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { formatRuntime } from '~/utils/format';
import type { MediaDetail, MediaSummary } from '~/types/media';

const props = defineProps<{
  media: MediaDetail;
  primaryLabel: string;
  isFavorite: boolean;
  nextEpisode: MediaSummary | null;
}>();

defineEmits<{
  play: [];
  'toggle-list': [];
  'open-next': [];
}>();

const metaLine = computed(() => {
  const parts: string[] = [];

  if (props.media.genres.length) parts.push(props.media.genres.join(' • '));
  if (props.media.year) parts.push(String(props.media.year));

  const runtime = formatRuntime(props.media.durationSec);
  if (runtime) parts.push(runtime);

  return parts.join(' • ');
});

/** "T1 E2 · ano · runtime" — usa os campos estruturados; regex do título só como fallback. */
const nextEpisodeMeta = computed(() => {
  const parts: string[] = [];
  const next = props.nextEpisode;

  if (next?.season != null) {
    parts.push(next.episode != null ? `T${next.season} E${next.episode}` : `T${next.season}`);
  } else {
    const match = next?.title.match(/\bS(\d{1,2})\s*E(\d{1,2})\b/i);
    if (match) parts.push(`T${Number(match[1])} E${Number(match[2])}`);
  }

  if (next?.year) parts.push(String(next.year));

  const runtime = formatRuntime(next?.durationSec ?? null);
  if (runtime) parts.push(runtime);

  return parts.join(' • ');
});
</script>

<style scoped>
.overlay-rise {
  animation: overlay-rise 0.35s ease-out both;
}

@keyframes overlay-rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .overlay-rise {
    animation: none;
  }
}
</style>
