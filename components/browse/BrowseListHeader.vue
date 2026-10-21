<template>
  <header class="browse-list-header mb-8 space-y-6">
    <NuxtLink
      :to="backTo"
      class="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors duration-fast hover:text-ink"
    >
      <Icon name="material-symbols:arrow-back-rounded" class="h-4 w-4" aria-hidden="true" />
      {{ sectionLabel }}
    </NuxtLink>

    <div class="space-y-1.5">
      <p class="kicker">{{ sectionLabel }}</p>
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <h1 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ heading }}</h1>
        <p class="text-sm tabular-nums text-ink-muted">{{ count }}</p>
      </div>

      <!-- Slot: controles da listagem (ex.: ordenação da categoria). -->
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  /** Destino do link "voltar" — a seção de origem. */
  backTo: string;
  /** Rótulo da seção — link de volta e kicker. */
  sectionLabel: string;
  /** Título da página. */
  heading: string;
  /** Contagem exibida ao lado do título. */
  count: string;
}>();
</script>
