<template>
  <div class="home-page relative min-h-[100svh] overflow-hidden">
    <h1 class="sr-only">Prysma — televisão, filmes, séries e entretenimento</h1>

    <section class="home-hero flex min-h-[calc(100svh-4rem)] items-center justify-center" aria-label="Menu principal">
      <div class="home-hero__content w-full">
        <div class="home-identity tv-safe pointer-events-none">
          <p class="home-identity__eyebrow">Seu entretenimento em um só lugar</p>
          <div class="mt-2 flex items-center gap-3">
            <img src="/prysma-mark.svg" alt="" class="h-9 w-9" aria-hidden="true" />
            <span class="home-identity__name">PRYSMA</span>
          </div>
        </div>

        <HomeCarousel
          :items="menu.items.value"
          :is-loading="menu.isLoading.value"
          :error="menu.error.value"
          :on-retry="menu.refresh"
        />
      </div>
    </section>

    <HomeNavigationBar />
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Prysma — Início' });

const menu = useHomeMenu();
</script>
