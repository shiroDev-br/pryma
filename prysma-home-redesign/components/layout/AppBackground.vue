<template>
  <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg" aria-hidden="true">
    <div class="bg-ambient absolute inset-0" />

    <img
      v-if="wallpaper"
      :src="wallpaper"
      alt=""
      decoding="async"
      draggable="false"
      class="wallpaper absolute inset-0 h-full w-full object-cover"
    />

    <div v-if="wallpaper" class="wallpaper-overlay absolute inset-0" />

    <div class="home-horizon absolute inset-x-0 bottom-[9%] h-[42%]" />
    <div class="home-stars absolute inset-0" />
    <div class="home-vignette absolute inset-0" />
  </div>
</template>

<script setup lang="ts">
import { usePreferencesStore } from '~/stores/preferences';

const preferences = usePreferencesStore();
const { selectedUrl } = useBackgrounds();

onMounted(() => preferences.hydrateBackground());

const wallpaper = computed(() => selectedUrl.value);
</script>

<style scoped>
.bg-ambient {
  background:
    radial-gradient(55% 55% at 70% 22%, rgba(30, 73, 129, .38), transparent 60%),
    radial-gradient(42% 38% at 35% 42%, rgba(13, 69, 131, .2), transparent 70%),
    linear-gradient(180deg, #061021 0%, #030814 48%, #010309 100%);
}

.home-horizon {
  background:
    radial-gradient(32% 65% at 72% 20%, rgba(255, 174, 105, .5), transparent 50%),
    linear-gradient(150deg, transparent 0 38%, rgba(4, 17, 38, .96) 39% 54%, transparent 55%),
    linear-gradient(25deg, transparent 0 48%, rgba(3, 14, 30, .98) 49% 63%, transparent 64%);
  filter: blur(1px);
  opacity: .9;
}

.home-stars {
  opacity: .25;
  background-image:
    radial-gradient(circle at 15% 25%, rgba(255,255,255,.75) 0 1px, transparent 1.5px),
    radial-gradient(circle at 72% 18%, rgba(255,255,255,.65) 0 1px, transparent 1.5px),
    radial-gradient(circle at 55% 32%, rgba(255,255,255,.5) 0 1px, transparent 1.5px);
  background-size: 220px 180px, 300px 240px, 260px 210px;
}

.wallpaper-overlay {
  background:
    linear-gradient(180deg, rgba(1, 4, 10, .68) 0%, rgba(1, 4, 10, .1) 35%, rgba(1, 4, 10, .68) 100%),
    linear-gradient(90deg, rgba(1, 4, 10, .42), transparent 45%, rgba(1, 4, 10, .28));
}

.home-vignette {
  background: radial-gradient(120% 100% at 50% 48%, transparent 46%, rgba(0, 0, 0, .7) 100%);
}

@keyframes wallpaper-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.wallpaper {
  animation: wallpaper-in .42s ease both;
}
</style>
