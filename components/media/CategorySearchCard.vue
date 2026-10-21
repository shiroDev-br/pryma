<template>
  <NuxtLink
    :to="`/search?type=${type}`"
    class="group relative block aspect-[3/2] overflow-hidden rounded-lg border border-white/10 bg-surface transition-[transform,border-color,box-shadow] duration-normal [container-type:inline-size] hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-card focus:outline-none focus-visible:border-accent focus-visible:shadow-focus"
  >
    <!-- Fundo: degradê gerado (mesma linguagem visual do CategoryCard) -->
    <div
      class="absolute inset-0 transition-transform duration-slow ease-stage group-hover:scale-[1.06]"
      :style="{ background: gradient }"
      aria-hidden="true"
    />

    <div
      class="absolute inset-0 bg-gradient-to-t from-[#020817]/90 via-[#020817]/35 to-[#020817]/5"
      aria-hidden="true"
    />

    <div class="card-body relative flex h-full flex-col justify-end">
      <span
        class="card-tile flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-[#050b1c]/90 text-ink shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
        aria-hidden="true"
      >
        <Icon name="material-symbols:search-rounded" class="card-icon" />
      </span>

      <span class="flex items-end justify-between gap-2">
        <span class="min-w-0">
          <span class="card-name line-clamp-2 block font-semibold text-ink">Buscar em {{ label }}</span>
          <span class="card-count mt-0.5 block text-ink-muted">Todo o catálogo — sem filtro por categoria</span>
        </span>

        <Icon
          name="material-symbols:chevron-right-rounded"
          class="card-chevron shrink-0 text-ink transition-transform duration-fast group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { gradientForHue } from '~/utils/categoryVisuals';

defineProps<{
  /** Tipo da seção — vod (filmes) ou series. */
  type: 'vod' | 'series';
  /** Rótulo amigável: "Filmes" / "Séries". */
  label: string;
}>();

/** Hue fixo azul — card de ação, não de gênero. */
const gradient = gradientForHue(215);
</script>

<style scoped>
.card-body {
  gap: clamp(0.35rem, 4.5cqw, 0.9rem);
  padding: clamp(0.55rem, 6cqw, 1.25rem);
}

.card-tile {
  width: clamp(1.9rem, 16cqw, 3.6rem);
  height: clamp(1.9rem, 16cqw, 3.6rem);
}

.card-icon {
  width: 52%;
  height: 52%;
}

.card-name {
  font-size: clamp(0.8rem, 6cqw, 1.25rem);
  line-height: 1.2;
}

.card-count {
  font-size: clamp(0.66rem, 4.4cqw, 0.92rem);
}

.card-chevron {
  width: clamp(1rem, 7cqw, 1.75rem);
  height: clamp(1rem, 7cqw, 1.75rem);
  margin-bottom: 0.15rem;
}
</style>
