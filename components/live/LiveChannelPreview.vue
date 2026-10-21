<template>
  <aside class="pv min-h-0 flex-col gap-4" aria-label="Canal selecionado">
    <template v-if="media">
      <!-- Prévia: arte do canal com selos AO VIVO / qualidade -->
      <NuxtLink
        :to="mediaHref(media)"
        class="pv-card pv-thumb group relative block aspect-video w-full shrink-0 overflow-hidden focus:outline-none focus-visible:shadow-focus"
        :aria-label="`Assistir ${media.title}`"
        data-nav="preview"
      >
        <img
          v-if="media.thumbnailUrl && !thumbFailed"
          :key="media.id"
          :src="media.thumbnailUrl"
          :alt="media.title"
          decoding="async"
          class="absolute inset-0 h-full w-full object-cover object-[center_30%] transition-transform duration-slow ease-stage group-hover:scale-[1.03]"
          @error="thumbFailed = true"
        />
        <div v-else class="absolute inset-0" :style="{ background: gradient }" aria-hidden="true" />

        <div
          class="absolute inset-0 bg-gradient-to-t from-[#020817]/70 via-transparent to-[#020817]/25"
          aria-hidden="true"
        />

        <!-- Sem arte própria, o logo ocupa o centro da prévia. -->
        <span
          v-if="!hasArt"
          class="absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <img
            v-if="media.logoUrl && !logoFailed"
            :src="media.logoUrl"
            alt=""
            class="h-1/2 max-w-[55%] object-contain drop-shadow-[0_6px_20px_rgba(0,0,0,0.5)]"
            @error="logoFailed = true"
          />
          <span v-else class="text-5xl font-bold tracking-wide text-ink/90">{{ initials }}</span>
        </span>

        <!-- Com arte, o logo vira marca d'água no canto. -->
        <img
          v-else-if="media.logoUrl && !logoFailed"
          :src="media.logoUrl"
          alt=""
          aria-hidden="true"
          class="absolute right-4 top-4 h-9 max-w-[28%] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          @error="logoFailed = true"
        />

        <span
          v-if="media.isLive"
          class="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/85 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-wide text-ink"
        >
          <span class="live-dot h-2 w-2 rounded-full bg-[#ff4d4d]" aria-hidden="true" />
          Ao vivo
        </span>
        <span
          v-if="badge"
          class="absolute bottom-3 right-3 rounded-md border border-white/15 bg-black/85 px-2.5 py-1 text-[0.72rem] font-semibold tracking-wide text-ink"
        >
          {{ badge }}
        </span>
      </NuxtLink>

      <!-- Canal + programa atual -->
      <section class="pv-card shrink-0 p-4 sm:p-5">
        <div class="flex items-center gap-4">
          <span class="flex h-12 w-[4.5rem] shrink-0 items-center justify-center" aria-hidden="true">
            <img
              v-if="media.logoUrl && !logoFailed"
              :src="media.logoUrl"
              alt=""
              class="max-h-full max-w-full object-contain"
              @error="logoFailed = true"
            />
            <span v-else class="text-xl font-bold text-ink">{{ initials }}</span>
          </span>
          <span class="h-9 w-px shrink-0 bg-white/12" aria-hidden="true" />
          <div class="min-w-0">
            <p class="truncate text-[1.15rem] font-semibold uppercase leading-tight text-ink">
              {{ media.title }}
            </p>
            <p class="mt-0.5 truncate text-[0.9rem] text-ink-muted">
              {{ media.categoryName ?? 'Ao vivo' }}
            </p>
          </div>
        </div>

        <template v-if="guide.current.value">
          <div class="mt-4 flex items-center gap-4">
            <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <div
                class="h-full rounded-full bg-gradient-to-r from-[#4d6bff] to-[#7c5cff]"
                :style="{ width: `${Math.round(guide.progress.value * 100)}%` }"
              />
            </div>
            <div class="shrink-0 text-right leading-tight">
              <p class="text-[0.82rem] tabular-nums text-ink">
                {{ formatHourMinute(guide.current.value.start) }} —
                {{ formatHourMinute(guide.current.value.end) }}
              </p>
              <p class="text-[0.72rem] text-ink-muted">{{ guide.remainingMinutes.value }} min restantes</p>
            </div>
          </div>
          <p class="mt-3 text-[1.05rem] font-semibold text-ink">{{ guide.current.value.title }}</p>
          <p
            v-if="guide.current.value.description"
            class="mt-1 line-clamp-3 text-[0.9rem] leading-relaxed text-ink-muted"
          >
            {{ guide.current.value.description }}
          </p>
        </template>

        <div class="mt-4 flex flex-wrap gap-3">
          <NuxtLink
            :to="mediaHref(media)"
            class="inline-flex h-11 items-center gap-2 rounded-full bg-blue-dark px-6 text-sm font-semibold text-ink shadow-[0_0_18px_rgba(22,136,255,0.45)] transition-colors duration-fast hover:bg-blue focus:outline-none focus-visible:shadow-focus"
            data-nav="preview"
          >
            <Icon name="material-symbols:play-arrow-rounded" class="h-5 w-5" aria-hidden="true" />
            Assistir agora
          </NuxtLink>

          <button
            type="button"
            class="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-elevated/70 px-5 text-sm font-medium text-ink transition-colors duration-fast hover:border-blue/50 hover:text-blue-light focus:outline-none focus-visible:shadow-focus"
            :aria-pressed="favorite"
            data-nav="preview"
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
      </section>

      <!-- Programação -->
      <section class="pv-card flex min-h-0 flex-1 flex-col p-4 sm:p-5" aria-labelledby="live-guide-heading">
        <div class="flex shrink-0 items-center gap-3">
          <Icon name="material-symbols:calendar-month-outline-rounded" class="h-6 w-6 text-ink-muted" aria-hidden="true" />
          <h2 id="live-guide-heading" class="flex-1 text-[1.05rem] font-medium text-ink">Programação</h2>
          <Icon name="material-symbols:chevron-right-rounded" class="h-6 w-6 text-ink-muted" aria-hidden="true" />
        </div>

        <ul v-if="guide.schedule.value.length" class="rail-scroll mt-3 min-h-0 flex-1 overflow-y-auto">
          <li
            v-for="(program, position) in guide.schedule.value"
            :key="`${program.start}-${program.title}`"
            class="flex items-center gap-4 rounded-lg px-3 py-3 text-[0.95rem]"
            :class="
              position === 0 && guide.current.value
                ? 'bg-gradient-to-r from-[#1c3fb8]/70 to-[#2b3fd0]/55 text-ink'
                : 'border-t border-white/8 text-ink first:border-t-0'
            "
          >
            <span class="w-12 shrink-0 tabular-nums" :class="position === 0 && guide.current.value ? 'text-ink' : 'text-ink-muted'">
              {{ formatHourMinute(program.start) }}
            </span>
            <span class="min-w-0 flex-1 truncate font-medium">{{ program.title }}</span>
            <span
              v-if="position === 0 && guide.current.value"
              class="inline-flex shrink-0 items-center gap-1.5 text-[0.72rem] font-medium uppercase tracking-wide"
            >
              <span class="live-dot h-1.5 w-1.5 rounded-full bg-[#ff4d4d]" aria-hidden="true" />
              Ao vivo
            </span>
          </li>
        </ul>
        <p v-else class="mt-4 text-[0.9rem] leading-relaxed text-ink-muted">
          A programação deste canal ainda não está disponível.
        </p>
      </section>
    </template>

    <div v-else class="pv-card grid flex-1 place-items-center p-6 text-sm text-ink-muted">
      Selecione um canal para ver os detalhes.
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useChannelGuide } from '~/composables/useChannelGuide';
import { usePreferencesStore } from '~/stores/preferences';
import { getCategoryVisual, gradientForHue } from '~/utils/categoryVisuals';
import { channelInitials, formatHourMinute, qualityBadge } from '~/utils/live';
import { mediaHref } from '~/utils/media';
import type { MediaSummary } from '~/types';

const props = defineProps<{
  media: MediaSummary | null;
  /** Slug da categoria do canal — define o degradê quando não há arte. */
  categorySlug?: string | null;
}>();

const preferences = usePreferencesStore();
const guide = useChannelGuide(() => props.media?.id ?? null);

const thumbFailed = ref(false);
const logoFailed = ref(false);
watch(
  () => props.media?.id,
  () => {
    thumbFailed.value = false;
    logoFailed.value = false;
  },
);

const hasArt = computed(() => !!props.media?.thumbnailUrl && !thumbFailed.value);
const initials = computed(() => channelInitials(props.media?.title ?? ''));
const badge = computed(() => qualityBadge(props.media?.quality));
const gradient = computed(() => gradientForHue(getCategoryVisual(props.categorySlug ?? '').hue));

const favorite = computed(() => (props.media ? preferences.isFavorite(props.media.id) : false));

function toggleFavorite(): void {
  if (props.media) preferences.toggleFavorite(props.media.id);
}
</script>

<style scoped>
.pv-card {
  border: 1px solid rgba(124, 154, 255, 0.14);
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, rgba(8, 22, 52, 0.96), rgba(4, 12, 32, 0.98));
}

.pv-thumb {
  background: #050b1c;
}

.pv-thumb:focus-visible {
  border-radius: var(--radius-lg);
}
</style>
