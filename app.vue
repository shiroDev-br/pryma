<template>
  <!-- Sem bg opaco aqui: o canvas (`html`/`body` no main.css) já pinta o preto
       e um `bg-bg` taparia o AppBackground (que fica em z-index negativo). -->
  <div class="min-h-screen flex flex-col text-ink">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
