<template>
  <div class="home-page isolate">
    <h1 class="sr-only">Pryma — TV ao vivo, filmes e séries</h1>

    <!-- Palco: ocupa o miolo entre o header (11%) e a barra inferior (11%). -->
    <div class="home-page__stage">
      <HomeCarousel class="w-full" :items="menu.items.value" />
    </div>

    <!-- Faixa institucional — borda a borda, fixa na base da tela. -->
    <FeaturedStrip class="home-page__strip" />
  </div>
</template>

<style scoped>
/* Grade fixa da TV: header 11% · palco 78% · barra 11%.
   Posicionamento ABSOLUTO com alturas em px (--header-h/--footer-h vêm do
   plugin viewport-scale): independe de flex/% e de vh na WebView antiga —
   era aqui que o palco colapsava e a barra inferior crescia na TV.
   Fallback em vh/rem para SSR e retrato. */
.home-page {
  --header-h: 11vh;
  --footer-h: 11vh;
  position: relative;
  height: var(--app-vh);
  overflow: hidden;
}

.home-page__stage {
  position: absolute;
  top: var(--header-h);
  bottom: var(--footer-h);
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
}

.home-page__strip {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--footer-h);
}

/* Retrato estreito: a home volta a rolar em vez de espremer os cards. */
@media (max-width: 599px) and (orientation: portrait) {
  .home-page {
    --header-h: 5rem;
    height: auto;
    min-height: var(--app-vh);
    overflow: visible;
    padding-top: var(--header-h);
  }

  .home-page__stage {
    position: static;
  }

  .home-page__strip {
    position: static;
    height: auto;
  }
}
</style>

<script setup lang="ts">
useHead({ title: 'Pryma — Início' });

const menu = useHomeMenu();
</script>
