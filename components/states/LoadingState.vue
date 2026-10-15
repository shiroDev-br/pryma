<template>
  <div class="flex items-center gap-3 px-1 py-6 text-sm text-ink-muted" role="status">
    <Icon name="svg-spinners:3-dots-fade" class="h-5 w-5 text-blue-dark" aria-hidden="true" />
    <span>{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    message?: string;
  }>(),
  { message: 'Carregando…' },
);
</script>
