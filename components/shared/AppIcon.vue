<template>
  <!-- Ícones próprios da marca (prefixo `prysma:`) — o restante vem do @nuxt/icon. -->
  <svg
    v-if="name === 'prysma:plans'"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    stroke-width="3.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="5" y="7" width="54" height="37" rx="7" />
    <path d="M32 44v9M21 55h22" />
    <path d="M22 35V21l7 6 3-9 3 9 7-6v14Z" />
  </svg>

  <svg
    v-else-if="name === 'prysma:crown'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M4 18V8l4.5 4L12 5l3.5 7L20 8v10Z" />
    <path d="M4 21h16" />
  </svg>

  <svg
    v-else-if="name === 'prysma:bear'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="6.2" cy="6.2" r="2.4" />
    <circle cx="17.8" cy="6.2" r="2.4" />
    <path d="M12 6.4c-4.4 0-7.4 2.7-7.4 6.4 0 3.6 3 6.2 7.4 6.2s7.4-2.6 7.4-6.2c0-3.7-3-6.4-7.4-6.4Z" />
    <ellipse cx="12" cy="14.2" rx="2.6" ry="1.9" />
    <path d="M9.2 11.4h.01M14.8 11.4h.01" stroke-width="2.4" />
  </svg>

  <svg
    v-else-if="name === 'prysma:mtv'"
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    stroke-width="6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- M grande estilo MTV clássico -->
    <path d="M12 88 L12 12 L35 55 L58 12 L58 88" fill="none" stroke-width="8" />
    <!-- TV dentro do M -->
    <rect x="26" y="32" width="48" height="32" rx="3" stroke-width="5" />
    <path d="M36 42 L50 54 L64 34" stroke-width="4" />
  </svg>

  <Icon v-else :name="name" />
</template>

<script setup lang="ts">
defineProps<{ name: string }>();
</script>