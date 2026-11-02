<template>
  <component :is="link.tag.value" v-bind="link.bind.value" class="home-tile" @click="link.openExternal">
    <span
      v-if="item.image"
      class="home-tile__art"
      :style="{ backgroundImage: `url(${item.image})` }"
      aria-hidden="true"
    />
    <span class="home-tile__icon" aria-hidden="true">
      <img v-if="item.logoUrl" :src="item.logoUrl" alt="" class="h-full w-full object-contain" />
      <AppIcon v-else :name="item.icon" class="h-full w-full" />
    </span>
    <span class="home-tile__title">{{ item.title }}</span>
    <span class="home-tile__text">{{ item.description }}</span>
  </component>
</template>

<script setup lang="ts">
import type { HomeMenuItem } from '~/composables/useHomeMenu';

const props = defineProps<{ item: HomeMenuItem }>();

const link = useMenuItemLink(() => props.item);
</script>

<style scoped>
.home-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 7.25rem;
  padding: 0.85rem;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-lg);
  background: linear-gradient(168deg, rgba(10, 22, 48, 0.86), rgba(2, 6, 18, 0.92));
  color: var(--color-text);
  text-align: left;
}

.home-tile:active {
  border-color: var(--color-blue);
}

.home-tile__art {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: cover;
  opacity: 0.35;
}

.home-tile__icon {
  position: relative;
  width: 1.75rem;
  height: 1.75rem;
  margin-bottom: auto;
}

.home-tile__title {
  position: relative;
  margin-top: 0.6rem;
  overflow: hidden;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-tile__text {
  position: relative;
  display: -webkit-box;
  margin-top: 0.2rem;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 0.72rem;
  line-height: 1.3;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
