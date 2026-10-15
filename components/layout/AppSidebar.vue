<template>
  <aside
    class="sidebar fixed inset-y-0 left-0 z-50 hidden w-[var(--sidebar-w)] flex-col border-r border-white/[0.07] lg:flex"
    aria-label="Menu lateral"
  >
    <!-- Identidade -->
    <NuxtLink
      to="/"
      class="group flex shrink-0 items-center gap-3.5 px-6 pb-2 pt-7"
      aria-label="Prysma — início"
    >
      <img
        src="/prysma-mark.svg"
        alt=""
        width="48"
        height="48"
        aria-hidden="true"
        class="h-11 w-11 shrink-0 transition-transform duration-fast group-hover:scale-105"
      />
      <span class="leading-none">
        <span class="block text-[1.15rem] font-semibold tracking-[0.34em] text-ink">PRYSMA</span>
        <span class="mt-2 block text-[0.55rem] font-medium tracking-[0.7em] text-blue/70">
          IPTV
        </span>
      </span>
    </NuxtLink>

    <!-- Navegação principal -->
    <nav class="mt-9 flex-1 overflow-y-auto px-4" aria-label="Navegação principal">
      <ul class="flex flex-col gap-1.5">
        <li v-for="link in links" :key="link.label">
          <NuxtLink
            :to="{ path: link.path, query: link.query }"
            class="nav-link group flex h-[3.1rem] items-center gap-4 rounded-full border px-4 text-[0.95rem] transition-all duration-fast"
            :class="
              isActive(link)
                ? 'nav-link--active border-[#1688ff]/55 font-medium text-ink'
                : 'border-transparent text-ink-muted hover:bg-white/[0.04] hover:text-ink'
            "
            :aria-current="isActive(link) ? 'page' : undefined"
          >
            <AppIcon
              :name="link.icon"
              class="h-[1.45rem] w-[1.45rem] shrink-0 transition-colors duration-fast"
              :class="isActive(link) ? 'text-ink' : 'text-blue-light/70 group-hover:text-blue-light'"
            />
            <span>{{ link.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <!-- Rodapé: próximo jogo (só com time escolhido), assinatura e assinatura da marca -->
    <div class="shrink-0 pb-8">
      <div v-if="football.isReady && football.team" class="mx-5 mb-4">
        <NextMatchBadge />
      </div>

      <div
        class="mx-5 flex items-center gap-3.5 rounded-xl border border-white/[0.14] bg-white/[0.03] px-4 py-3 backdrop-blur-sm"
      >
        <span class="flex flex-col items-center gap-1.5">
          <AppIcon name="prysma:crown" class="h-6 w-6 text-amber-400" />
          <span class="flex items-center gap-[3px]" aria-hidden="true">
            <span class="h-[3px] w-[3px] rounded-full bg-emerald-400" />
            <span class="h-[3px] w-[3px] rounded-full bg-emerald-400" />
            <span class="h-[3px] w-[3px] rounded-full bg-emerald-400" />
          </span>
        </span>
        <span class="leading-tight">
          <span class="block text-[0.62rem] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Assinatura
          </span>
          <span class="mt-1 block text-[0.95rem] font-semibold text-ink">Ativa</span>
        </span>
      </div>

      <p class="mx-6 mt-6 text-[0.82rem] leading-relaxed text-ink-muted">
        Mais que TV,<br />é o seu mundo<br />em um só lugar.
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { LocationQueryRaw } from 'vue-router';

interface SidebarLink {
  label: string;
  icon: string;
  path: string;
  query?: LocationQueryRaw;
}

/** Destinos da sidebar — apenas rotas que existem no app. */
const links: SidebarLink[] = [
  { label: 'Início', icon: 'material-symbols:home-rounded', path: '/' },
  { label: 'Planos', icon: 'material-symbols:workspace-premium-outline-rounded', path: '/pricing' },
  {
    label: 'Canais',
    icon: 'material-symbols:live-tv-outline-rounded',
    path: '/medias',
    query: { type: 'live' },
  },
  {
    label: 'Filmes',
    icon: 'material-symbols:movie-outline-rounded',
    path: '/medias',
    query: { type: 'vod' },
  },
  {
    label: 'Séries',
    icon: 'material-symbols:tv-gen-outline-rounded',
    path: '/medias',
    query: { type: 'series' },
  },
  {
    label: 'Favoritos',
    icon: 'material-symbols:star-outline-rounded',
    path: '/medias',
    query: { favorites: '1' },
  },
  {
    label: 'Configurações',
    icon: 'material-symbols:settings-outline-rounded',
    path: '/background',
  },
];

const route = useRoute();
const football = useFavoriteTeam();

/** Ativo por rota + query — diferencia os tipos dentro de `/medias`. */
function isActive(link: SidebarLink): boolean {
  if (route.path !== link.path) return false;
  if (!link.query) return true;
  return Object.entries(link.query).every(([key, value]) => route.query[key] === value);
}
</script>

<style scoped>
.sidebar {
  background:
    radial-gradient(120% 40% at 0% 0%, rgba(22, 136, 255, 0.07), transparent 60%),
    linear-gradient(180deg, rgba(2, 8, 23, 0.9) 0%, rgba(1, 4, 12, 0.96) 100%);
  backdrop-filter: blur(18px);
  box-shadow: 1px 0 0 rgba(22, 136, 255, 0.08), 12px 0 40px rgba(0, 0, 0, 0.35);
}

/* Pílula ativa — azul elétrico com brilho, como na referência. */
.nav-link--active {
  background: linear-gradient(90deg, rgba(11, 92, 255, 0.34) 0%, rgba(10, 31, 69, 0.55) 100%);
  box-shadow:
    0 0 22px rgba(22, 136, 255, 0.4),
    inset 0 0 16px rgba(22, 136, 255, 0.16);
}
</style>
