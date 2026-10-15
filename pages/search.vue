<template>
  <div class="tv-safe pb-28 pt-24">
    <header class="mb-8 space-y-6">
      <NuxtLink
        :to="filteredSection ? `/browse/${filteredSection.key}` : '/'"
        class="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors duration-fast hover:text-ink"
      >
        <Icon name="material-symbols:arrow-back-rounded" class="h-4 w-4" aria-hidden="true" />
        {{ filteredSection ? filteredSection.def.label : 'Início' }}
      </NuxtLink>

      <div class="space-y-1.5">
        <p class="kicker">Buscar</p>
        <div class="flex flex-wrap items-baseline justify-between gap-3">
          <h1 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {{ filteredSection ? `Busque em ${filteredSection.def.label}` : 'Busque em todo o catálogo' }}
          </h1>
          <p v-if="search.search.isReady.value" class="text-sm tabular-nums text-ink-muted">
            {{ resultLabel }}
          </p>
        </div>
      </div>

      <div class="relative max-w-2xl">
        <Icon
          name="material-symbols:search"
          class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          v-model="search.search.query.value"
          type="search"
          placeholder="Buscar por título, ator ou gênero…"
          aria-label="Buscar no catálogo"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          :aria-expanded="showSuggestions"
          :aria-activedescendant="activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined"
          class="w-full rounded-sm border border-line bg-surface/80 py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted/70 transition-colors duration-fast focus:border-blue-dark focus:outline-none focus:shadow-focus"
          autofocus
          @focus="inputFocused = true"
          @blur="onInputBlur"
          @keydown="onInputKeydown"
        />

        <ul
          v-if="showSuggestions"
          id="search-suggestions"
          role="listbox"
          aria-label="Sugestões"
          class="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-sm border border-line bg-surface/95 shadow-card backdrop-blur-md"
        >
          <li
            v-for="(suggestion, index) in suggest.suggestions.value"
            :key="`${suggestion.type}-${suggestion.value}`"
            :id="`suggestion-${index}`"
            role="option"
            :aria-selected="index === activeIndex"
            class="cursor-pointer border-l-2 transition-colors duration-fast"
            :class="
              index === activeIndex
                ? 'border-blue bg-elevated/80'
                : 'border-transparent hover:bg-elevated/50'
            "
            @mouseenter="activeIndex = index"
            @mousedown.prevent
            @click="applySuggestion(suggestion)"
          >
            <span class="flex items-center gap-3 px-3 py-2.5">
              <Icon
                :name="SUGGESTION_ICONS[suggestion.type]"
                class="h-4 w-4 shrink-0 text-blue"
                aria-hidden="true"
              />
              <span class="min-w-0 flex-1 truncate text-sm text-ink">{{ suggestion.value }}</span>
              <span class="shrink-0 text-[0.7rem] text-ink-muted">
                {{ SUGGESTION_LABELS[suggestion.type] }}
              </span>
            </span>
          </li>
        </ul>
      </div>
    </header>

    <EmptyState
      v-if="!search.search.isReady.value"
      title="Digite para buscar"
      :description="
        filteredSection
          ? `Busca limitada a ${filteredSection.def.label} — use ao menos 2 letras.`
          : 'Use ao menos 2 letras — a busca varre títulos, atores e gêneros.'
      "
    />

    <LoadingState v-else-if="search.isPending.value" message="Buscando…" />

    <ErrorState
      v-else-if="search.error.value"
      title="Não foi possível buscar"
      :message="search.error.value.message"
      :on-retry="search.refresh"
    />

    <EmptyState
      v-else-if="search.items.value.length === 0"
      title="Nenhum resultado encontrado"
      :description="`Não encontramos títulos para “${search.search.normalizedQuery.value}”.`"
    />

    <template v-else>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <MediaCard v-for="media in filteredItems" :key="media.id" :media="media" />
      </div>

      <div ref="sentinel" class="h-px" aria-hidden="true" />

      <div class="flex justify-center pt-4">
        <button
          v-if="search.hasNext.value"
          type="button"
          class="rounded-sm border border-line bg-surface px-6 py-2.5 text-sm text-ink transition-colors duration-fast hover:border-blue-dark hover:text-blue-light disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="search.isLoading.value"
          @click="search.loadMore()"
        >
          {{ search.isLoading.value ? 'Carregando…' : 'Carregar mais' }}
        </button>
      </div>
    </template>

    <BottomInfoBar
      title="Busca"
      :subtitle="search.search.isReady.value ? resultLabel : (filteredSection ? `Somente ${filteredSection.def.label}` : 'Todas as seções')"
      icon="material-symbols:search"
    />
  </div>
</template>

<script setup lang="ts">
import { SECTIONS } from '~/constants';
import { isAdultItem } from '~/utils/adult';
import type { Suggestion, MediaType, MediaSummary } from '~/types';

useHead({ title: 'Prysma — Buscar' });

const route = useRoute();

/** Conteúdo adulto fica oculto na busca até o desbloqueio. */
const adultUnlocked = useState<boolean>('adult.unlocked', () => false);

/** `?type=vod|series|live` — vem do card "Buscar" da categoria. */
function parseMediaType(value: unknown): MediaType | null {
  return value === 'vod' || value === 'series' || value === 'live' ? value : null;
}

const searchType = computed(() => parseMediaType(route.query.type));

const filteredSection = computed(() => {
  const type = searchType.value;
  if (!type) return null;
  const entry = Object.entries(SECTIONS).find(([, def]) => def.type === type);
  return entry ? ({ key: entry[0], def: entry[1] } as const) : null;
});

const search = useSearchResults({ type: () => searchType.value });
const suggest = useSearchSuggestions(() => search.search.query.value);

const inputFocused = ref(false);
const activeIndex = ref(-1);

/** Filtra episódios individuais — agrupa por seriesId e mostra só 1 por série. */
const filteredItems = computed(() => {
  const items = search.items.value;
  const seenSeries = new Set<string>();
  const result: MediaSummary[] = [];

  for (const item of items) {
    if (!adultUnlocked.value && isAdultItem(item)) continue;

    if (item.type !== 'series' || !item.seriesId) {
      // Filmes e live: passa direto
      result.push(item);
      continue;
    }

    // Séries: só adiciona se ainda não viu este seriesId
    if (!seenSeries.has(item.seriesId)) {
      seenSeries.add(item.seriesId);
      result.push(item);
    }
  }
  return result;
});

const showSuggestions = computed(
  () => inputFocused.value && search.search.isReady.value && suggest.suggestions.value.length > 0,
);

/** Lista nova chega enquanto o remote anda — recomeça a navegação. */
watch(suggest.suggestions, () => {
  activeIndex.value = -1;
});

const SUGGESTION_ICONS: Record<Suggestion['type'], string> = {
  title: 'material-symbols:theaters-outline-rounded',
  genre: 'material-symbols:category-outline-rounded',
  actor: 'material-symbols:person-outline-rounded',
  category: 'material-symbols:folder-outline-rounded',
};

const SUGGESTION_LABELS: Record<Suggestion['type'], string> = {
  title: 'Título',
  genre: 'Gênero',
  actor: 'Ator',
  category: 'Categoria',
};

function applySuggestion(suggestion: Suggestion): void {
  search.search.setQuery(suggestion.value);
  suggest.reset();
  activeIndex.value = -1;
  inputFocused.value = false; // esconde sugestões ao aplicar
}

/** Autocomplete clássico: o foco fica no input e as setas andam pela lista. */
function onInputKeydown(event: KeyboardEvent): void {
  const count = suggest.suggestions.value.length;

  if (!showSuggestions.value || count === 0) return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      activeIndex.value = activeIndex.value < count - 1 ? activeIndex.value + 1 : 0;
      break;
    case 'ArrowUp':
      event.preventDefault();
      activeIndex.value = activeIndex.value > 0 ? activeIndex.value - 1 : count - 1;
      break;
    case 'Enter': {
      const suggestion = suggest.suggestions.value[activeIndex.value];
      if (!suggestion) return;
      event.preventDefault();
      applySuggestion(suggestion);
      break;
    }
    case 'Escape':
      event.preventDefault();
      suggest.reset();
      activeIndex.value = -1;
      inputFocused.value = false;
      break;
  }
}

function onInputBlur(): void {
  // Pequeno delay pra permitir clique na sugestão
  setTimeout(() => {
    inputFocused.value = false;
  }, 150);
}

const resultLabel = computed(() => {
  const total = filteredItems.value.length; // usa itens filtrados
  return `${total} ${total === 1 ? 'resultado' : 'resultados'} para “${search.search.normalizedQuery.value}”`;
});

const sentinel = ref<HTMLElement | null>(null);
useIntersectionObserver(sentinel, (isIntersecting) => {
  if (isIntersecting) search.loadMore();
});
</script>
