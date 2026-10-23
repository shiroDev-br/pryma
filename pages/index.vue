<template>
  <div class="home-page isolate">
    <h1 class="sr-only">Pryma — TV ao vivo, filmes e séries</h1>

    <!-- Palco: ocupa o miolo entre o header (11%) e a barra inferior (15%). -->
    <div class="home-page__stage">
      <HomeCarousel class="w-full" :items="menu.items.value" />
    </div>

    <!-- Faixa institucional — borda a borda, fixa na base da tela. -->
    <FeaturedStrip class="home-page__strip" />
  </div>
</template>

<style scoped>
/* Grade fixa da TV: header 11% · palco 78% · barra 11%.
   Header e barra iguais deixam o palco exatamente no centro vertical.
   O header é fixo (AppHeader) e sobrepõe a página — o padding-top abre o vão
   exato dele. Fallback em rem cobre WebView antiga que ignora vh no flex. */
.home-page {
  --header-h: 11vh;
  --footer-h: 11vh;
  height: var(--app-vh);
  padding-top: var(--header-h);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.home-page__stage {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
}

.home-page__strip {
  flex: 0 0 var(--footer-h);
}

/* Celular deitado / telas baixas: header e barra em px para o palco sobrar. */
@media (max-height: 500px) {
  .home-page {
    --header-h: 4.75rem;
    --footer-h: 4.5rem;
  }
}

/* Retrato estreito: a home volta a rolar em vez de espremer os cards. */
@media (max-width: 599px) {
  .home-page {
    height: auto;
    min-height: var(--app-vh);
    overflow: visible;
  }

  .home-page__strip {
    flex: 0 0 auto;
  }
}
</style>

<script setup lang="ts">
useHead({ title: 'Pryma — Início' });

const menu = useHomeMenu();
</script>
