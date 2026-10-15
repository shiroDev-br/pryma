<template>
  <div class="space-y-2 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto">
    <div v-for="cat in categories" :key="cat.name" class="space-y-1">
      <!-- Cabeçalho da categoria - clica pra expandir/colapsar -->
      <button
        type="button"
        class="w-full flex items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors duration-fast border-line bg-surface/70 hover:border-blue-dark/60 hover:bg-elevated/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/50"
        @click="toggleCategory(cat.name)"
        :aria-expanded="isExpanded(cat.name)"
      >
        <Icon
          :name="isExpanded(cat.name) ? 'material-symbols:keyboard-arrow-up' : 'material-symbols:keyboard-arrow-down'"
          class="h-6 w-6 shrink-0 text-ink-muted transition-transform duration-fast"
          aria-hidden="true"
        />
        <Icon name="material-symbols:live-tv" class="h-5 w-5 shrink-0 text-blue" aria-hidden="true" />
        <span class="min-w-0 truncate text-base font-semibold">{{ cat.name }}</span>
        <span class="shrink-0 text-sm text-ink-muted/70 flex items-center gap-1.5">
          <span class="bg-blue/10 text-blue px-2 py-0.5 rounded-full text-[0.7rem] font-medium">
            {{ cat.channels.length }}
          </span>
        </span>
      </button>

      <!-- Lista de canais (expande pra baixo) -->
      <Transition name="slide">
        <div v-show="isExpanded(cat.name)" class="space-y-1 pl-4 border-l border-white/5 ml-3">
          <button
            v-for="channel in cat.channels"
            :key="channel.id"
            type="button"
            class="w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-fast border-line bg-surface/50 hover:border-blue-dark/60 hover:bg-elevated/60"
            @click="selectChannel(channel)"
            :class="{ 'bg-blue/10 border-blue/60': selectedChannel?.id === channel.id }"
          >
            <img
              v-if="channel.logoUrl"
              :src="channel.logoUrl"
              alt=""
              class="h-8 w-8 shrink-0 object-contain rounded-sm bg-elevated"
              loading="lazy"
              aria-hidden="true"
            />
            <div v-else class="h-8 w-8 shrink-0 flex items-center justify-center rounded-sm bg-elevated" aria-hidden="true">
              <Icon name="material-symbols:live-tv" class="h-4 w-4 text-blue-dark" />
            </div>
            <span class="min-w-0 truncate text-sm font-medium">{{ channel.title }}</span>
            <Icon name="material-symbols:play-arrow-rounded" class="h-4 w-4 shrink-0 text-blue" aria-hidden="true" />
          </button>
        </div>
      </Transition>
    </div>
  </div>

  <!-- Painel principal: Preview do canal -->
  <MediaDetailPanel
    class="rail-scroll hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto"
    :media="previewMedia"
    :similar="[]"
    @preview="onPreview"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getRepositories } from '~/repositories';
import { useMediaDetailsStore } from '~/stores/mediaDetails';
import type { MediaSummary } from '~/types';

interface Props {
  items: MediaSummary[];
}

const props = defineProps<Props>();

/** Categorias agrupadas (sem estado de UI) */
const categories = computed(() => {
  const map = new Map<string, MediaSummary[]>();

  for (const channel of props.items) {
    const catName = channel.categoryName || 'Outros';
    const existing = map.get(catName);
    if (existing) {
      existing.push(channel);
    } else {
      map.set(catName, [channel]);
    }
  }

  const priority = ['Aberto', 'Esportes', 'Desenhos 24h', 'Notícias', 'Variedades', 'Filmes', 'Séries', 'Infantil', 'Documentários', 'Música', 'Religioso', 'Outros'];
  return [...map.entries()].map(([name, channels]) => ({ name, channels })).sort((a, b) => {
    const idxA = priority.indexOf(a.name);
    const idxB = priority.indexOf(b.name);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
});

/** Estado de expansão: Set com nomes das categorias expandidas */
const expandedCategories = ref<Set<string>>(new Set());

/** Canal selecionado (mostra no painel direito) */
const selectedChannel = ref<MediaSummary | null>(null);

function isExpanded(categoryName: string): boolean {
  return expandedCategories.value.has(categoryName);
}

function toggleCategory(categoryName: string): void {
  if (expandedCategories.value.has(categoryName)) {
    expandedCategories.value.delete(categoryName);
  } else {
    expandedCategories.value.add(categoryName);
  }
}

function selectChannel(channel: MediaSummary): void {
  selectedChannel.value = channel;
}

const store = useMediaDetailsStore();

const previewMedia = ref<MediaSummary | null>(null);

watch(selectedChannel, () => {
  previewMedia.value = selectedChannel.value ?? props.items[0] ?? null;
}, { immediate: true });

function onPreview(media: MediaSummary): void {
  previewMedia.value = media;
}

watch(selectedChannel, () => {
  if (selectedChannel.value) {
    store.ensure(selectedChannel.value.id);
  }
});
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease-out;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
  overflow: hidden;
}

/* Scrollbar fina */
.lg\:overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}
.lg\:overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.lg\:overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}
.lg\:overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>