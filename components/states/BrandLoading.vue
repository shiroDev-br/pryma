<template>
  <div
    class="brand-loading flex flex-col items-center justify-center px-6 text-center"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div class="flex items-center">
      <img
        src="/prysma-mark.svg"
        alt=""
        width="56"
        height="56"
        aria-hidden="true"
        class="mr-4 h-14 w-14 shrink-0"
      />
      <span class="brand-loading__name text-[2.6rem] font-semibold leading-none text-ink">PRYMA</span>
    </div>

    <!-- Barra indo e voltando: só transform (compositor) — segue animando com a
         thread principal ocupada montando a tela/abrindo o stream. -->
    <div class="brand-loading__track mt-8" aria-hidden="true">
      <span class="brand-loading__bar" />
    </div>

    <p class="mt-5 text-[1.05rem] font-medium text-ink-muted">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    message?: string;
  }>(),
  { message: 'Aguarde que seu conteúdo já estará pronto!' },
);
</script>

<style scoped>
.brand-loading {
  background:
    radial-gradient(60% 50% at 50% 45%, rgba(11, 92, 255, 0.16), transparent 70%),
    #020817;
}

/* Margem no lugar do letter-spacing final: centraliza o nome de verdade. */
.brand-loading__name {
  letter-spacing: 0.32em;
  margin-right: -0.32em;
}

.brand-loading__track {
  position: relative;
  width: 18rem;
  height: 0.3rem;
  overflow: hidden;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.1);
}

.brand-loading__bar {
  position: absolute;
  inset: 0 auto 0 0;
  width: 35%;
  border-radius: 9999px;
  background: linear-gradient(90deg, #4aa3ff, #1b5cff 55%, #b06bff);
  box-shadow: 0 0 12px rgba(22, 136, 255, 0.6);
  will-change: transform;
  animation: brand-loading-bounce 1.1s ease-in-out infinite alternate;
}

/* 0 → (100% da trilha − 35% da barra) = 65/35 ≈ 185.7% da própria barra. */
@keyframes brand-loading-bounce {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(185.7%);
  }
}
</style>
