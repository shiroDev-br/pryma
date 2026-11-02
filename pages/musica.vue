<template>
  <YoutubeScreen :section="MUSIC_SECTION" />
</template>

<script setup lang="ts">
import { MUSIC_SECTION } from '~/constants/youtube';

definePageMeta({ layout: 'player' });
useHead({ title: 'Música — Pryma' });
</script>
