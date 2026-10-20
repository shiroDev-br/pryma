<template>
  <!-- Igual ao default, mas sem o AppHeader — usado pela tela de login (pré-sessão). -->
  <div class="relative flex min-h-[var(--app-vh)] flex-col text-ink">
    <AppBackground />
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
