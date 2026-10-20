<template>
  <div class="home-page isolate flex min-h-[var(--app-vh)] flex-col pb-6 lg:pb-8">
    <h1 class="sr-only">Pryma — TV ao vivo, filmes e séries</h1>

    <!-- Carrossel cinematográfico — três seções: Filmes, Séries e TV ao Vivo. -->
    <div class="home-page__stage flex flex-1 items-center pt-4 lg:pt-8">
      <HomeCarousel class="w-full" :items="menu.items.value" />
    </div>

    <!-- Faixa institucional inferior. -->
    <div class="tv-safe home-page__strip mt-4">
      <FeaturedStrip />
    </div>
  </div>
</template>

<style scoped>
/* Celular deitado — enxuta tudo pra home caber numa tela de 360–400px de altura.
   Só em telas estreitas: a altura de um TV pode encolher com o teclado do
   sistema sem que a home precise virar outro layout. */
@media (max-height: 500px) and (max-width: 900px) {
  .home-page {
    padding-bottom: 0.5rem;
  }

  .home-page__stage {
    /* Respiro mínimo abaixo do header fixo (que é sobreposto ao conteúdo). */
    padding-top: 4rem;
  }

  .home-page__strip {
    margin-top: 0.25rem;
  }
}
</style>

<script setup lang="ts">
useHead({ title: 'Pryma — Início' });

const menu = useHomeMenu();
</script>
