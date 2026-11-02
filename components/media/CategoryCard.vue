<template>
  <NuxtLink
    :to="to"
    class="category-card group relative block aspect-[3/2] min-h-[8.5rem] overflow-hidden rounded-lg border border-white/10 bg-surface transition-[transform,border-color] duration-normal [container-type:inline-size] focus:outline-none focus-visible:border-accent focus-visible:shadow-focus"
  >
    <!-- Degradê da categoria — base permanente (sobrevive se a arte falhar no WebView). -->
    <div
      class="absolute inset-0 category-card__art transition-transform duration-slow ease-stage"
      :style="{ background: gradient }"
      aria-hidden="true"
    />

    <!-- Arte de fundo — background-image (não <img>): não depende de aspect-ratio
         nem de lazy-load, que quebram em WebViews antigos de celular. -->
    <div
      v-if="visual.art"
      class="absolute inset-0 bg-cover bg-center category-card__art transition-transform duration-slow ease-stage"
      :style="{ backgroundImage: `url(${visual.art})` }"
      aria-hidden="true"
    />

    <!-- Escurecimento para legibilidade do texto -->
    <div
      class="absolute inset-0 bg-gradient-to-t from-[#020817]/90 via-[#020817]/35 to-[#020817]/5"
      aria-hidden="true"
    />

    <!-- Tamanhos escalam com a largura do card (cqw), então não estouram em telas menores -->
    <div class="card-body relative flex h-full flex-col justify-end">
      <!-- Tile some quando a arte já traz o logo da plataforma (Netflix, HBO…) -->
      <span
        v-if="!visual.hideIcon"
        class="card-tile flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-[#050b1c]/90 text-ink shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
        aria-hidden="true"
      >
        <Icon :name="visual.icon" class="card-icon" />
      </span>

      <span class="flex items-end justify-between gap-2">
        <span class="min-w-0">
          <span class="card-name line-clamp-2 block font-semibold text-ink">{{ category.name }}</span>
          <span class="card-count mt-0.5 block tabular-nums text-ink-muted">{{ countLabel }}</span>
        </span>

        <Icon
          name="material-symbols:chevron-right-rounded"
          class="card-chevron shrink-0 text-ink category-card__chevron transition-transform duration-fast"
          aria-hidden="true"
        />
      </span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { getCategoryVisual, gradientForHue } from '~/utils/categoryVisuals';
import type { Category } from '~/types';

const props = defineProps<{
  category: Category;
  to: string;
}>();

const visual = computed(() => getCategoryVisual(props.category.slug));
const gradient = computed(() => gradientForHue(visual.value.hue));

const countFormatter = new Intl.NumberFormat('pt-BR');

const countLabel = computed(() => {
  const count = props.category.itemCount;
  return `${countFormatter.format(count)} ${count === 1 ? 'título' : 'títulos'}`;
});
</script>

<style scoped>
/* Hover só fora do modo D-pad — ponteiro parado da TV não marca um 2º card. */
body:not(.dpad-mode) .category-card:hover {
  transform: translateY(-0.125rem);
  border-color: rgba(var(--color-accent-rgb), 0.6);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}

body:not(.dpad-mode) .category-card:hover .category-card__art {
  transform: scale(1.06);
}

body:not(.dpad-mode) .category-card:hover .category-card__chevron {
  transform: translateX(0.125rem);
}

/* Fallbacks em rem primeiro: WebViews antigos (sem cqw/container queries)
   caem neles; os navegadores modernos sobrescrevem com o clamp() seguinte. */
.card-body {
  gap: 0.4rem;
  padding: 0.65rem;
}

.card-tile {
  width: 2.1rem;
  height: 2.1rem;
}

.card-icon {
  width: 52%;
  height: 52%;
}

.card-name {
  font-size: 0.9rem;
  line-height: 1.2;
}

.card-count {
  font-size: 0.68rem;
}

.card-chevron {
  width: 1.15rem;
  height: 1.15rem;
  margin-bottom: 0.15rem;
}

.card-body {
  gap: clamp(0.35rem, 4.5cqw, 0.9rem);
  padding: clamp(0.55rem, 6cqw, 1.25rem);
}

.card-tile {
  width: clamp(1.9rem, 16cqw, 3.6rem);
  height: clamp(1.9rem, 16cqw, 3.6rem);
}

.card-name {
  font-size: clamp(0.8rem, 6cqw, 1.25rem);
}

.card-count {
  font-size: clamp(0.66rem, 4.4cqw, 0.92rem);
}

.card-chevron {
  width: clamp(1rem, 7cqw, 1.75rem);
  height: clamp(1rem, 7cqw, 1.75rem);
}
</style>
