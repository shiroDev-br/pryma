<template>
  <!-- Sem `appear`: com ele o SSR embrulha o overlay num `template` vazio e a
       hidratação quebra ("content.getAttribute is not a function") se o
       overlay ligar antes de a página hidratar. O overlay nunca está visível
       no primeiro render, então `appear` não tinha efeito. -->
  <Transition name="global-loading">
    <BrandLoading v-if="isLoading" class="global-loading fixed inset-0 z-[100]" />
  </Transition>
</template>

<script setup lang="ts">
import { useGlobalLoading } from '~/composables/useGlobalLoading';

const { isLoading } = useGlobalLoading();
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