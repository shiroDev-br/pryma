<template>
  <!-- Atalho do trilho de categorias (Favoritos, Continuar assistindo). -->
  <NuxtLink
    data-category-card
    :to="to"
    class="group relative block h-[6.5rem] w-[9.5rem] overflow-hidden rounded-lg border border-line/70 bg-surface transition-[transform,border-color] duration-normal hover:-translate-y-1 hover:border-blue-dark/70 hover:shadow-card focus-visible:shadow-focus sm:h-[9rem] sm:w-[11rem] md:h-[10.5rem] md:w-[12.5rem]"
    :aria-label="title"
  >
    <div class="relative flex h-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br p-3 sm:gap-2 sm:p-4" :class="tint">
      <Icon :name="icon" class="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12" :class="iconClass" aria-hidden="true" />
      <p class="text-center text-xs font-semibold text-ink sm:text-sm">{{ title }}</p>
      <p class="text-center text-[0.62rem] text-ink-muted sm:text-[0.7rem]">{{ hint }}</p>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  to: string;
  title: string;
  hint: string;
  icon: string;
  iconClass: string;
  /** Classes `from-*`/`to-*` do degradê de fundo. */
  tint: string;
}>();
</script>
