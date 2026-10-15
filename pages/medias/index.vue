<template>
  <div />
</template>

<script setup lang="ts">
// O catálogo antigo (filtros na home) deu lugar ao fluxo /browse/{seção}.
await navigateTo('/', { redirectCode: 302, replace: true });
</script>
