<template>
  <div     class="flex flex-col items-start gap-2 rounded-md border border-line/60 bg-surface/70 px-6 py-8">
    <p class="text-base font-medium text-ink">{{ title }}</p>
    <p v-if="description" class="text-sm text-ink-muted">{{ description }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>
