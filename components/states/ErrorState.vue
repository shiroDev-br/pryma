<template>
  <div
    class="flex flex-col items-start gap-3 rounded-md border border-danger/40 bg-surface/70 px-6 py-8"
    role="alert"
  >
    <div class="flex items-center gap-2">
      <Icon name="material-symbols:error-outline" class="h-5 w-5 text-danger" aria-hidden="true" />
      <p class="text-base font-medium text-ink">{{ title }}</p>
    </div>
    <p v-if="message" class="text-sm text-ink-muted">{{ message }}</p>
    <button
      v-if="onRetry"
      type="button"
      class="rounded-sm border border-line bg-elevated px-4 py-2 text-sm text-ink transition-colors duration-fast hover:border-blue-dark hover:text-blue-light"
      @click="onRetry"
    >
      Tentar novamente
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  message?: string | null;
  onRetry?: (() => void) | undefined;
}>();
</script>
