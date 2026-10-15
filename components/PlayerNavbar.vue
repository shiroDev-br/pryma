<template>
  <nav
    class="fixed inset-x-0 top-0 z-50 h-14 border-b border-line/50 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-normal"
    :class="playerStore.isPlaying ? 'opacity-60 hover:opacity-100' : 'opacity-100'"
  >
    <div class="tv-safe flex h-full items-center justify-between gap-4">
      <NuxtLink
        to="/"
        class="flex shrink-0 items-center gap-3 rounded-sm"
        aria-label="Prysma — início"
      >
        <span
          class="flex h-8 w-8 items-center justify-center rounded-md border border-blue-dark/50 bg-elevated text-blue"
        >
          <Icon name="material-symbols:tv" class="h-4 w-4" aria-hidden="true" />
        </span>
        <span class="hidden text-sm font-semibold tracking-[0.28em] text-ink sm:block">Prysma</span>
      </NuxtLink>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-sm border border-line bg-surface/80 px-3 py-2 text-sm text-ink-muted transition-colors duration-fast hover:border-blue-dark hover:text-blue-light"
        @click="goBack"
      >
        <Icon name="material-symbols:chevron-left" class="h-5 w-5" aria-hidden="true" />
        <span>Voltar</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { usePlayerStore } from '~/stores/player';

const router = useRouter();
const playerStore = usePlayerStore();

function goBack(): void {
  if (window.history.length > 1) router.back();
  else navigateTo('/');
}
</script>
