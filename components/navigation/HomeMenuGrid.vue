<template>
  <!-- Home no celular em pé: todos os destinos à vista — o carrossel foi feito para D-pad. -->
  <nav class="home-grid" aria-label="Menu principal">
    <HomeMenuTile v-for="item in items" :key="item.id" :item="item" />
  </nav>
</template>

<script setup lang="ts">
import type { HomeMenuItem } from '~/composables/useHomeMenu';

defineProps<{ items: HomeMenuItem[] }>();
</script>

<style scoped>
.home-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  width: 100%;
  padding: 1rem var(--page-gutter);
}
</style>
