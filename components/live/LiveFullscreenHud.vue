<template>
  <!-- HUD da prévia em tela cheia: ←/→ escolhem, OK aciona, ↑/↓ trocam de canal
       (as teclas são tratadas em LiveChannelPreview, por `[data-full-ctl]`). -->
  <div class="pv-hud absolute inset-0 z-20">
    <div class="absolute inset-x-0 top-0 flex items-center bg-gradient-to-b from-black/85 via-black/35 to-transparent px-4 pb-16 pt-5 sm:px-10 sm:pt-8">
      <button
        type="button"
        class="pv-ctl mr-5 grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/20 bg-black/70 text-white"
        aria-label="Voltar para a lista"
        data-full-ctl
        @click.stop="$emit('back')"
      >
        <Icon name="material-symbols:arrow-back-rounded" class="h-6 w-6" aria-hidden="true" />
      </button>
      <span class="min-w-0">
        <span class="block truncate text-lg font-semibold text-white sm:text-2xl">{{ media.title }}</span>
        <span class="mt-0.5 block truncate text-sm text-white/70">
          {{ media.categoryName ?? 'Ao vivo' }}
          <template v-if="programTitle"> · {{ programTitle }}</template>
        </span>
      </span>
    </div>

    <div class="absolute inset-x-0 bottom-0 flex items-center flex-wrap gap-y-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-5 pt-20 sm:px-10 sm:pb-8">
      <span class="mr-5 inline-flex items-center rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-white">
        <span class="live-dot mr-2 h-2 w-2 rounded-full bg-[#ff4d4d]" aria-hidden="true" />
        Ao vivo
      </span>

      <button
        v-for="variant in variants"
        :key="variant.media.id"
        type="button"
        class="pv-ctl mr-2.5 inline-flex h-11 min-w-[4.5rem] items-center justify-center rounded-full border px-4 text-[0.9rem] font-semibold tracking-wide"
        :class="
          variant.media.id === activeVariantId
            ? 'border-transparent bg-blue-dark text-white'
            : 'border-white/20 bg-black/70 text-white/80'
        "
        :aria-pressed="variant.media.id === activeVariantId"
        data-full-ctl
        @click.stop="$emit('pick-variant', variant.media)"
      >
        {{ variant.label }}
      </button>

      <span class="hidden flex-1 sm:block" />

      <span class="mr-6 hidden items-center text-sm text-white/60 sm:inline-flex">
        <Icon name="material-symbols:swap-vert-rounded" class="mr-1.5 h-5 w-5" aria-hidden="true" />
        Trocar de canal
      </span>

      <button
        type="button"
        class="pv-ctl mr-2.5 inline-flex h-11 items-center rounded-full border border-white/20 bg-black/70 px-4 text-[0.9rem] font-medium text-white"
        :aria-pressed="fillScreen"
        data-full-ctl
        @click.stop="$emit('toggle-fill')"
      >
        <Icon
          :name="fillScreen ? 'material-symbols:fit-screen-outline-rounded' : 'material-symbols:fullscreen-rounded'"
          class="mr-2 h-5 w-5"
          aria-hidden="true"
        />
        {{ fillScreen ? 'Ajustar à tela' : 'Preencher tela' }}
      </button>

      <button
        type="button"
        class="pv-ctl inline-flex h-11 items-center rounded-full border border-white/20 bg-black/70 px-4 text-[0.9rem] font-medium text-white"
        :aria-pressed="favorite"
        data-full-ctl
        @click.stop="$emit('toggle-favorite')"
      >
        <Icon
          :name="favorite ? 'material-symbols:star-rounded' : 'material-symbols:star-outline-rounded'"
          class="mr-2 h-5 w-5"
          :class="favorite ? 'text-[#ffc94d]' : ''"
          aria-hidden="true"
        />
        {{ favorite ? 'Nos favoritos' : 'Favoritar' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LiveVariant } from '~/composables/useLiveQualityVariants';
import type { MediaSummary } from '~/types';

defineProps<{
  media: MediaSummary;
  /** Programa no ar, quando a grade tem. */
  programTitle: string | null;
  variants: LiveVariant[];
  activeVariantId: string | null;
  fillScreen: boolean;
  favorite: boolean;
}>();

defineEmits<{
  back: [];
  'pick-variant': [media: MediaSummary];
  'toggle-fill': [];
  'toggle-favorite': [];
}>();
</script>

<style scoped>
/* Foco sempre visível (mesmo fora do dpad-mode — o OK do controle não liga o modo). */
.pv-ctl:focus {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
