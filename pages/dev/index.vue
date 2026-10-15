<template>
  <div class="min-h-screen bg-black text-white p-6 space-y-8">
    <header class="flex items-center justify-between border-b border-white/10 pb-4">
      <div>
        <h1 class="text-xl font-bold">Data layer smoke test</h1>
        <p class="text-sm text-zinc-400">
          Página dev-only (substituída na fase 2) · dataMode:
          <span class="text-emerald-400">{{ dataMode }}</span>
        </p>
      </div>

      <div class="flex items-center gap-3">
        <template v-if="auth.isAuthenticated.value">
          <span class="text-sm text-zinc-300">Olá, {{ auth.displayName.value }}</span>
          <button class="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20" @click="auth.logout()">
            Logout
          </button>
        </template>

        <form v-else class="flex items-center gap-2" @submit.prevent="submitLogin">
          <input
            v-model="credentials.email"
            type="email"
            class="px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm w-40"
            placeholder="E-mail"
          />
          <input
            v-model="credentials.password"
            type="password"
            class="px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm w-28"
            placeholder="Senha"
          />
          <button class="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-sm" :disabled="auth.status.value === 'pending'">
            Login
          </button>
        </form>
      </div>
    </header>

    <p v-if="auth.error.value" class="text-sm text-red-400">
      auth: [{{ auth.error.value.code }}] {{ auth.error.value.message }}
    </p>

    <!-- Busca (debounce + sanitize) -->
    <section class="space-y-2">
      <h2 class="text-sm font-semibold text-zinc-300">Search</h2>
      <input
        v-model="search.search.query.value"
        type="search"
        placeholder="Digite ao menos 2 caracteres (ex.: cao acha 'Ação')..."
        class="w-full max-w-xl px-4 py-2.5 rounded-lg bg-white/5 border border-white/10"
      />
      <p class="text-xs text-zinc-500">
        normalized: <code>{{ search.search.normalizedQuery.value || '—' }}</code>
        · ready: {{ search.search.isReady.value }} · debouncing: {{ search.search.isDebouncing.value }}
        · results: {{ search.total.value }} · status: {{ search.status.value }}
      </p>
    </section>

    <!-- Categorias -->
    <section class="space-y-2">
      <h2 class="text-sm font-semibold text-zinc-300">
        Categories ({{ categoriesQuery.categories.value.length }})
      </h2>
      <div class="flex flex-wrap gap-2">
        <button
          class="px-3 py-1 rounded-full text-xs border"
          :class="selectedCategory ? 'bg-white/10 border-white/20' : 'bg-blue-600 border-blue-500'"
          @click="selectedCategory = ''"
        >
          Todas ({{ formatCount(mediaTotalAll) }})
        </button>
        <button
          v-for="category in categoriesQuery.categories.value"
          :key="category.id"
          class="px-3 py-1 rounded-full text-xs border"
          :class="selectedCategory === category.slug ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'"
          @click="selectedCategory = category.slug"
        >
          {{ category.name }} ({{ formatCount(category.itemCount) }})
        </button>
      </div>
    </section>

    <!-- Lista / grid -->
    <section class="space-y-3">
      <h2 class="text-sm font-semibold text-zinc-300">
        {{ search.search.isReady.value ? 'Results' : 'Catalog' }}
        · {{ activeList.total.value }} itens · status: {{ activeList.status.value }}
      </h2>

      <p v-if="activeList.error.value" class="text-sm text-red-400">
        [{{ activeList.error.value.code }}] {{ activeList.error.value.message }}
      </p>

      <div v-if="activeList.isPending.value" class="text-sm text-zinc-500">Carregando…</div>

      <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <button
          v-for="media in activeList.items.value"
          :key="media.id"
          class="text-left rounded-lg overflow-hidden bg-white/5 border transition-colors"
          :class="selectedMediaId === media.id ? 'border-blue-500 ring-1 ring-blue-500/40' : 'border-white/10 hover:border-white/30'"
          @click="openMedia(media)"
        >
          <img
            :src="media.thumbnailUrl ?? undefined"
            :alt="media.title"
            loading="lazy"
            decoding="async"
            class="w-full aspect-[9/16] object-cover"
          />
          <div class="p-2">
            <p class="text-xs font-medium truncate">{{ media.title }}</p>
            <p class="text-[10px] text-zinc-500 truncate">
              {{ media.categoryName }}<template v-if="media.year"> · {{ media.year }}</template>
              <template v-if="media.isLive"> · LIVE</template>
            </p>
          </div>
        </button>
      </div>

      <div ref="sentinel" class="h-px" />

      <button
        v-if="activeList.hasNext.value"
        class="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
        :disabled="activeList.isLoading.value"
        @click="activeList.loadMore()"
      >
        {{ activeList.isLoading.value ? 'Carregando…' : 'Load more' }}
      </button>
    </section>

    <!-- Player -->
    <section ref="playerSection" v-if="selectedMediaId" class="space-y-3 border-t border-white/10 pt-6 scroll-mt-24">
      <h2 class="text-sm font-semibold text-zinc-300">Player · {{ selectedMediaId }}</h2>

      <p v-if="playback.error.value" class="text-sm text-red-400">
        [{{ playback.error.value.code }}] {{ playback.error.value.message }}
      </p>

      <video ref="videoEl" class="w-full max-w-3xl aspect-video bg-black" playsinline controls v-if="playback.playback.value">
        <source :src="playback.playback.value.url" />
      </video>

      <div class="flex items-center gap-3">
        <button class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm" @click="playerControls.toggle()">
          {{ playerControls.isPlaying.value ? 'Pause' : 'Play' }}
        </button>
        <span class="text-xs text-zinc-400">
          {{ formatDuration(playerControls.currentTime.value) }} / {{ formatDuration(playerControls.duration.value) }}
        </span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import 'plyr/dist/plyr.css';
import { DEFAULT_PAGE_SIZE } from '~/constants';
import { formatCount, formatDuration } from '~/utils/format';
import { getRepositories } from '~/repositories';
import { MOCK_DEMO_CREDENTIALS } from '~/mocks/auth.mock';
import type { MediaSummary } from '~/types';

// Página dev-only: valida a camada de dados ponta a ponta antes do layout (fase 2).
// É a única página que pode importar de mocks/ (credenciais de demonstração).

const { public: runtimeConfig } = useRuntimeConfig();
const dataMode = runtimeConfig.dataMode;

const auth = useAuth();
const categoriesQuery = useCategories();
const selectedCategory = useRouteQueryState('category');
const search = useSearchResults();
const playback = usePlayback();

const mediaParams = computed(() => ({
  category: selectedCategory.value || undefined,
  limit: DEFAULT_PAGE_SIZE,
}));
const mediaList = useMediaList(mediaParams);
await mediaList.ready;

// Busca pronta assume a lista; caso contrário, catálogo (com filtro de categoria).
const activeList = computed(() => (search.search.isReady.value ? search : mediaList));
const mediaTotalAll = ref(0);

void getRepositories()
  .media.listMedia({ limit: 1 })
  .then((page) => {
    mediaTotalAll.value = page.total;
  });

const sentinel = ref<HTMLElement | null>(null);
useIntersectionObserver(sentinel, (isIntersecting) => {
  if (isIntersecting) activeList.value.loadMore();
});

// Player
const selectedMediaId = ref<string | null>(null);
const videoEl = ref<HTMLVideoElement | null>(null);
const playerSection = ref<HTMLElement | null>(null);
const playerControls = usePlayer(videoEl, { mediaId: selectedMediaId });

async function openMedia(media: MediaSummary): Promise<void> {
  selectedMediaId.value = media.id;
  const session = await playback.load(media.id);
  if (session && videoEl.value) videoEl.value.src = session.url;

  // Só rola depois do Vue renderizar a seção do player.
  await nextTick();
  playerSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Login
const credentials = ref({ ...MOCK_DEMO_CREDENTIALS });

async function submitLogin(): Promise<void> {
  await auth.login({ email: credentials.value.email, password: credentials.value.password });
}
</script>
