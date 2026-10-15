<template>
  <nav class="pointer-events-none fixed inset-x-0 bottom-0 z-40" aria-label="Navegação rápida">
    <div class="tv-safe pb-4 sm:pb-5">
      <div
        class="rail-scroll pointer-events-auto flex items-center gap-2 overflow-x-auto rounded-lg border border-white/10 bg-black/60 px-2 py-2 backdrop-blur-md"
      >
        <ul class="flex shrink-0 items-center gap-1">
          <li v-for="link in links" :key="link.label">
            <NuxtLink
              :to="{ path: link.path, query: link.query }"
              class="flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors duration-fast"
              :class="
                isActive(link)
                  ? 'bg-[#0b5cff]/25 text-ink'
                  : 'text-ink-muted hover:bg-white/5 hover:text-ink'
              "
              :aria-current="isActive(link) ? 'page' : undefined"
            >
              <Icon :name="link.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{{ link.label }}</span>
            </NuxtLink>
          </li>
        </ul>

        <div
          class="ml-auto hidden min-w-[15rem] shrink-0 border-l border-white/10 pl-4 sm:block"
        >
          <NextMatchBadge />
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { LocationQueryRaw } from 'vue-router';

interface QuickLink {
  label: string;
  icon: string;
  path: string;
  query?: LocationQueryRaw;
}

/** Atalhos — apenas rotas que já existem no app. */
const links: QuickLink[] = [
  { label: 'Início', icon: 'material-symbols:home-rounded', path: '/' },
  { label: 'Canais', icon: 'material-symbols:live-tv', path: '/medias', query: { type: 'live' } },
  { label: 'Filmes', icon: 'material-symbols:movie', path: '/medias', query: { type: 'vod' } },
  { label: 'Séries', icon: 'material-symbols:video-library', path: '/medias', query: { type: 'series' } },
  { label: 'Meu time', icon: 'material-symbols:sports-soccer', path: '/team' },
  { label: 'Planos', icon: 'material-symbols:workspace-premium', path: '/pricing' },
];

const route = useRoute();

/** Ativo por rota + query — diferencia os tipos dentro de `/medias`. */
function isActive(link: QuickLink): boolean {
  if (route.path !== link.path) return false;
  if (!link.query) return true;
  return Object.entries(link.query).every(([key, value]) => route.query[key] === value);
}
</script>
