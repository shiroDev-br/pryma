<template>
  <div class="relative flex min-h-[100svh] flex-col text-ink">
    <AppBackground />
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
