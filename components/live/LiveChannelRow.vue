<template>
  <NuxtLink
    :to="mediaHref(media)"
    class="live-row group relative flex w-full items-center gap-4 border p-3 text-left transition-colors duration-fast focus:outline-none focus-visible:shadow-focus sm:gap-5 sm:px-4"
    :class="
      selected
        ? 'border-transparent bg-[#081a42]/85'
        : 'border-line/70 bg-[#061534]/70 hover:border-blue-dark/60 hover:bg-[#08193d]'
    "
    :aria-label="`${number} ${media.title}`"
    :aria-current="selected ? 'true' : undefined"
    data-nav="row"
    :data-channel-id="media.id"
    @mouseenter="emit('preview', media)"
    @focus="emit('preview', media)"
  >
    <!-- Borda em gradiente (azul → violeta) + halo, igual ao item ativo das outras listagens. -->
    <span v-if="selected" class="row-ring pointer-events-none absolute" aria-hidden="true" />
    <span v-if="selected" class="row-glow pointer-events-none absolute" aria-hidden="true" />

    <span class="w-9 shrink-0 text-[0.95rem] tabular-nums text-ink-muted sm:w-10" aria-hidden="true">
      {{ number }}
    </span>

    <span
      class="logo-tile relative flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0a1736] sm:h-[3.75rem] sm:w-28"
      aria-hidden="true"
    >
      <img
        v-if="media.logoUrl && !logoFailed"
        :src="media.logoUrl"
        :alt="media.title"
        loading="lazy"
        decoding="async"
        class="h-[78%] w-[78%] object-contain"
        @error="logoFailed = true"
      />
      <span v-else class="text-lg font-bold tracking-wide text-ink">{{ initials }}</span>
    </span>

    <span class="min-w-0 flex-1">
      <span class="block truncate text-[1.02rem] font-semibold uppercase leading-snug text-ink">
        {{ media.title }}
      </span>
      <span
        class="mt-0.5 block truncate text-[0.86rem] transition-colors duration-fast"
        :class="selected ? 'text-blue-light' : 'text-ink-muted'"
      >
        {{ media.categoryName ?? 'Ao vivo' }}
      </span>
    </span>

    <span class="flex shrink-0 items-center gap-3 pr-0.5">
      <span
        v-if="media.isLive"
        class="hidden items-center gap-1.5 text-[0.78rem] font-medium uppercase tracking-wide text-ink sm:inline-flex"
      >
        <span class="live-dot h-2 w-2 rounded-full bg-[#ff4d4d]" aria-hidden="true" />
        Ao vivo
      </span>
      <Icon
        name="material-symbols:chevron-right-rounded"
        class="h-6 w-6 transition-colors duration-fast"
        :class="selected ? 'text-ink' : 'text-ink-muted group-hover:text-blue-light'"
        aria-hidden="true"
      />
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { channelInitials } from '~/utils/live';
import { mediaHref } from '~/utils/media';
import type { MediaSummary } from '~/types';

const props = defineProps<{
  media: MediaSummary;
  /** Posição na lista, já formatada ("001"). */
  number: string;
  selected: boolean;
}>();

const emit = defineEmits<{
  preview: [media: MediaSummary];
}>();

const logoFailed = ref(false);
const initials = computed(() => channelInitials(props.media.title));
</script>

<style scoped>
.live-row {
  border-radius: var(--radius-md);
  /* Linhas fora da viewport não são pintadas (Chrome 85+; WebViews antigas
     ignoram). Lista longa de canais rola muito mais leve. */
  content-visibility: auto;
  contain-intrinsic-size: auto 5rem;
}

.live-row:focus-visible {
  border-radius: var(--radius-md);
}

/* Borda em gradiente — a máscara recorta só o contorno. */
.row-ring {
  inset: -2px;
  padding: 2.5px;
  border-radius: calc(var(--radius-md) + 2px);
  background: linear-gradient(135deg, #4aa3ff 0%, #1b5cff 52%, #b06bff 100%);
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box exclude,
    linear-gradient(#000 0 0);
}

.row-glow {
  inset: 0;
  border-radius: var(--radius-md);
  /* Sem "respirar": animar box-shadow em loop repinta a lista inteira em chip
     fraco (rolagem e D-pad travavam). Luz fixa — visual quase idêntico. */
  box-shadow:
    0 0 26px rgba(22, 136, 255, 0.55),
    0 0 70px rgba(11, 92, 255, 0.3);
}
</style>
