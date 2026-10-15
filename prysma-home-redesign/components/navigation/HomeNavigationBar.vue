<template>
  <nav class="home-navigation fixed inset-x-0 bottom-0 z-40" aria-label="Navegação rápida">
    <div class="home-navigation__inner tv-safe">
      <NuxtLink
        v-for="item in items"
        :key="item.label"
        :to="item.to"
        class="home-navigation__item group"
      >
        <span class="home-navigation__icon">
          <Icon :name="item.icon" class="h-5 w-5" aria-hidden="true" />
        </span>
        <span>{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
const items = [
  { label: 'Canais', icon: 'material-symbols:grid-view', to: '/medias?type=live' },
  { label: 'Filmes', icon: 'material-symbols:movie', to: '/medias?type=vod' },
  { label: 'Séries', icon: 'material-symbols:live-tv', to: '/medias?type=series' },
  { label: 'Animação', icon: 'material-symbols:toys', to: '/medias?category=animacao' },
  { label: 'Catálogo', icon: 'material-symbols:search', to: '/medias' },
  { label: 'Meu time', icon: 'material-symbols:sports-soccer', to: '/team' },
  { label: 'Planos', icon: 'material-symbols:workspace-premium', to: '/pricing' },
];
</script>

<style scoped>
.home-navigation {
  padding-bottom: max(env(safe-area-inset-bottom), .65rem);
}

.home-navigation__inner {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: .15rem;
  min-height: 4.8rem;
  border-top: 1px solid rgba(115, 151, 206, .14);
  background: linear-gradient(180deg, rgba(2, 7, 17, .76), rgba(1, 4, 11, .96));
  backdrop-filter: blur(18px) saturate(125%);
}

.home-navigation__item {
  position: relative;
  display: flex;
  min-width: 7rem;
  flex: 1 1 0;
  max-width: 10rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .28rem;
  color: rgba(176, 194, 223, .62);
  font-size: .64rem;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
  transition: color 180ms ease, background 180ms ease;
}

.home-navigation__item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 18%;
  right: 18%;
  height: 2px;
  background: transparent;
  transition: background 180ms ease, box-shadow 180ms ease;
}

.home-navigation__item:hover,
.home-navigation__item:focus-visible {
  color: white;
  background: rgba(21, 91, 184, .1);
}

.home-navigation__item:hover::before,
.home-navigation__item:focus-visible::before {
  background: #218cff;
  box-shadow: 0 0 18px rgba(33, 140, 255, .65);
}

.home-navigation__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #75b9ff;
}

@media (max-width: 800px) {
  .home-navigation__inner {
    overflow-x: auto;
    justify-content: flex-start;
  }

  .home-navigation__item {
    min-width: 6.5rem;
    flex: 0 0 auto;
  }
}
</style>
