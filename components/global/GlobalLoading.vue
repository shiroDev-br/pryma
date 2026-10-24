<template>
  <Transition name="global-loading" appear>
    <div
      v-if="isLoading"
      class="global-loading fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="flex flex-col items-center gap-4 text-center px-6">
        <Icon name="svg-spinners:3-dots-fade" class="h-10 w-10 text-blue-dark" aria-hidden="true" />
        <p class="text-lg font-medium text-ink">{{ loadingMessage }}</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useGlobalLoading } from '~/composables/useGlobalLoading';

const { isLoading, loadingMessage } = useGlobalLoading();
</script>

<style scoped>
.global-loading-enter-active,
.global-loading-leave-active {
  transition: opacity 0.2s ease;
}

.global-loading-enter-from,
.global-loading-leave-to {
  opacity: 0;
}
</style>