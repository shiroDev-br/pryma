<template>
  <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 class="text-[1.6rem] font-bold leading-tight tracking-tight">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 text-sm text-ink-muted">{{ subtitle }}</p>
    </div>
    <div class="flex items-center gap-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>
