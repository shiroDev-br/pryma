<template>
  <div class="isolate flex min-h-[100svh] flex-col pb-6 lg:pb-8 mb-30">
    <h1 class="sr-only">Pryma — TV ao vivo, filmes e séries</h1>

    <!-- Carrossel cinematográfico — três seções: Filmes, Séries e TV ao Vivo. -->
    <div class="flex flex-1 items-center pt-4 lg:pt-8 mt-56">
      <HomeCarousel class="w-full" :items="menu.items.value" />
    </div>

    <!-- Faixa institucional inferior. -->
    <div class="tv-safe mt-4 pb-20 lg:pb-0">
      <FeaturedStrip />
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Prysma — Início' });

const menu = useHomeMenu();
</script>
