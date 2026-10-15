<template>
  <div ref="root" class="tv-safe pb-6 pt-24" @keydown="onKeydown">
    <!-- Fundo liso (sem a montanha) — a tela de canais é densa e precisa de contraste. -->
    <div class="bg-ambient fixed inset-0 -z-[5]" aria-hidden="true" />

    <h1 class="sr-only">TV ao Vivo — todos os canais</h1>

    <LoadingState
      v-if="categories.isLoading.value && tvCategories.length === 0"
      message="Carregando canais…"
    />

    <ErrorState
      v-else-if="categories.error.value"
      title="Não foi possível carregar os canais"
      :message="categories.error.value.message"
      :on-retry="categories.refresh"
    />

    <div
      v-else
      class="grid h-[calc(100svh-7.5rem)] min-h-[30rem] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)] xl:grid-cols-[minmax(16rem,0.54fr)_minmax(0,1fr)_minmax(19rem,0.73fr)] xl:gap-6"
    >
      <!-- Coluna 1: busca + atalhos -->
      <aside class="live-panel hidden min-h-0 flex-col p-4 xl:flex" aria-label="Atalhos de canais">
        <label class="search-box flex h-12 shrink-0 items-center gap-3 px-4 focus-within:shadow-focus">
          <Icon name="material-symbols:search-rounded" class="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
          <input
            v-model="search.search.query.value"
            type="search"
            inputmode="search"
            autocomplete="off"
            maxlength="100"
            placeholder="Buscar canais…"
            aria-label="Buscar canais"
            class="min-w-0 flex-1 bg-transparent text-[0.95rem] text-ink placeholder:text-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            data-nav="search"
          />
          <button
            v-if="search.search.query.value"
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted hover:text-ink focus:outline-none focus-visible:shadow-focus"
            aria-label="Limpar busca"
            tabindex="-1"
            @click="search.search.clear()"
          >
            <Icon name="material-symbols:close-rounded" class="h-4 w-4" aria-hidden="true" />
          </button>
        </label>

        <!-- Grupo atual (reflete a aba ativa) -->
        <button
          type="button"
          class="group-row mt-4 flex h-[3.4rem] w-full shrink-0 items-center gap-3.5 px-4 text-left text-ink focus:outline-none focus-visible:shadow-focus"
          data-nav="sidebar"
          @click="focusFirstRow"
        >
          <Icon name="material-symbols:tv-gen-outline-rounded" class="h-6 w-6 shrink-0" aria-hidden="true" />
          <span class="min-w-0 flex-1 truncate text-[1rem] font-semibold">{{ groupLabel }}</span>
          <span class="shrink-0 text-[0.95rem] font-medium tabular-nums">{{ countFormatter.format(total) }}</span>
          <Icon name="material-symbols:chevron-right-rounded" class="h-6 w-6 shrink-0" aria-hidden="true" />
        </button>

        <div ref="sideEl" class="rail-scroll mt-1 min-h-0 flex-1 overflow-y-auto pr-1" role="list">
          <!-- Categorias expansíveis -->
          <div v-for="cat in sidebarCategories" :key="cat.name" class="space-y-1">
            <button
              type="button"
              class="w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-fast border-line bg-surface/70 hover:border-blue-dark/60 hover:bg-elevated/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/50"
              :class="{ 'bg-blue/15 border-blue/50': activeSlug === cat.slug }"
              @click="selectSidebarCategory(cat)"
              :aria-expanded="isSidebarCategoryExpanded(cat.name)"
              data-nav="sidebar"
            >
              <Icon
                :name="isSidebarCategoryExpanded(cat.name) ? 'material-symbols:keyboard-arrow-up' : 'material-symbols:keyboard-arrow-down'"
                class="h-5 w-5 shrink-0 text-ink-muted transition-transform duration-fast"
                aria-hidden="true"
              />
              <Icon name="material-symbols:live-tv" class="h-5 w-5 shrink-0" :class="activeSlug === cat.slug ? 'text-blue-light' : 'text-blue'" aria-hidden="true" />
              <span class="min-w-0 truncate text-sm font-semibold" :class="activeSlug === cat.slug ? 'text-blue-light' : ''">{{ cat.name }}</span>
              <span class="shrink-0 text-[0.7rem] text-ink-muted/70 flex items-center gap-1.5">
                <span class="px-2 py-0.5 rounded-full text-[0.65rem] font-medium" :class="activeSlug === cat.slug ? 'bg-blue/25 text-blue-light' : 'bg-blue/10 text-blue'">
                  {{ cat.channels.length }}
                </span>
              </span>
            </button>

<Transition name="slide">
                  <div v-show="isSidebarCategoryExpanded(cat.name)" class="space-y-1 pl-4 border-l border-white/5 ml-2">
                    <div v-for="(channel, idx) in cat.channels" :key="channel.id" class="space-y-1">
                      <!-- Canal -->
                      <button
                        type="button"
                        class="w-full flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors duration-fast border-line bg-surface/50 hover:border-blue-dark/60 hover:bg-elevated/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/50"
                        @click="toggleChannelGuide(channel.id)"
                        :class="{ 'bg-blue/10 border-blue/60': selected?.id === channel.id }"
                        :aria-expanded="isChannelGuideExpanded(channel.id)"
                        data-nav="sidebar"
                        :data-channel-id="channel.id"
                      >
                        <Icon
                          :name="isChannelGuideExpanded(channel.id) ? 'material-symbols:keyboard-arrow-up' : 'material-symbols:keyboard-arrow-down'"
                          class="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-fast"
                          aria-hidden="true"
                        />
                        <img
                          v-if="channel.logoUrl"
                          :src="channel.logoUrl"
                          alt=""
                          class="h-7 w-7 shrink-0 object-contain rounded-sm bg-elevated"
                          loading="lazy"
                          aria-hidden="true"
                        />
                        <div v-else class="h-7 w-7 shrink-0 flex items-center justify-center rounded-sm bg-elevated" aria-hidden="true">
                          <Icon name="material-symbols:live-tv" class="h-4 w-4 text-blue-dark" />
                        </div>
                        <span class="min-w-0 truncate text-sm font-medium">{{ channel.title }}</span>
                        <Icon name="material-symbols:play-arrow-rounded" class="h-4 w-4 shrink-0 text-blue" aria-hidden="true" />
                      </button>

                      <!-- Guia/Programação do canal (expande pra baixo) -->
                      <Transition name="slide">
                        <div v-show="isChannelGuideExpanded(channel.id)" class="space-y-1 pl-4 border-l border-white/5 ml-1">
                          <ChannelGuide
                            :channel-id="channel.id"
                            :channel="channel"
                            @pick-channel="pickChannel"
                          />
                        </div>
                      </Transition>
                    </div>
                  </div>
                </Transition>
          </div>

          <div ref="sideSentinel" class="h-16" aria-hidden="true" />
        </div>
      </aside>

      <!-- Coluna 2: lista de canais -->
      <section class="live-panel flex min-h-0 flex-col p-4 sm:p-5" aria-labelledby="live-list-heading">
        <header class="flex shrink-0 items-center gap-4">
          <button
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface/70 text-ink-muted transition-colors duration-fast hover:border-blue/50 hover:text-ink focus:outline-none focus-visible:shadow-focus"
            aria-label="Voltar"
            data-nav="back"
            @click="goBack"
          >
            <Icon name="material-symbols:arrow-back-rounded" class="h-5 w-5" aria-hidden="true" />
          </button>

          <span class="flex h-12 w-12 shrink-0 items-center justify-center text-blue-light" aria-hidden="true">
            <Icon name="material-symbols:sensors-rounded" class="h-9 w-9" />
          </span>

          <div class="min-w-0 flex-1">
            <h2 id="live-list-heading" class="truncate text-[1.5rem] font-semibold leading-tight text-ink">
              {{ heading }}
            </h2>
            <p class="text-[0.95rem] tabular-nums text-ink-muted">{{ countLabel }}</p>
          </div>

          <!-- Ordenação -->
          <div class="relative shrink-0">
            <button
              type="button"
              class="sort-btn inline-flex h-11 items-center gap-2.5 px-4 text-[0.92rem] text-ink focus:outline-none focus-visible:shadow-focus"
              aria-haspopup="listbox"
              :aria-expanded="sortOpen"
              data-nav="sort"
              @click="sortOpen = !sortOpen"
              @keydown.esc="sortOpen = false"
            >
              Ordem: {{ currentSortLabel }}
              <Icon name="material-symbols:keyboard-arrow-down-rounded" class="h-5 w-5 text-ink-muted" aria-hidden="true" />
            </button>

            <template v-if="sortOpen">
              <button
                type="button"
                class="fixed inset-0 z-10 cursor-default"
                tabindex="-1"
                aria-label="Fechar ordenação"
                @click="sortOpen = false"
              />
              <ul
                class="absolute right-0 top-full z-20 mt-2 w-52 rounded-md border border-line bg-[#06142d]/95 p-1.5 shadow-stage backdrop-blur-md"
                role="listbox"
                aria-label="Ordenar canais"
              >
                <li v-for="option in SORT_OPTIONS" :key="option.value" role="option" :aria-selected="sortKey === option.value">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between rounded-sm px-3 py-2.5 text-left text-sm transition-colors duration-fast hover:bg-white/5 focus:outline-none focus-visible:shadow-focus"
                    :class="sortKey === option.value ? 'text-blue-light' : 'text-ink-muted hover:text-ink'"
                    @click="setSort(option.value)"
                  >
                    {{ option.label }}
                    <Icon v-if="sortKey === option.value" name="material-symbols:check-rounded" class="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              </ul>
            </template>
          </div>
        </header>

        <!-- Abas por categoria -->
        <div class="relative mt-4 shrink-0">
          <div
            ref="tabsEl"
            class="tabs-rail flex gap-3 overflow-x-auto pr-10"
            role="tablist"
            aria-label="Categorias de canais"
            @scroll.passive="updateTabEdges"
          >
            <button
              v-for="tab in tabs"
              :key="tab.slug"
              type="button"
              role="tab"
              class="tab-pill shrink-0 whitespace-nowrap px-5 text-[0.95rem] font-medium transition-colors duration-fast focus:outline-none focus-visible:shadow-focus"
              :class="tab.slug === activeSlug ? 'tab-pill--active text-ink' : 'text-ink hover:border-blue-dark/60'"
              :aria-selected="tab.slug === activeSlug"
              data-nav="tab"
              :data-tab="tab.slug"
              @click="setCategory(tab.slug)"
            >
              {{ tab.label }}
            </button>
          </div>

          <button
            v-show="canScrollTabs"
            type="button"
            class="absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#06142d]/90 text-ink backdrop-blur-sm transition-colors duration-fast hover:text-blue-light focus:outline-none focus-visible:shadow-focus"
            aria-label="Mais categorias"
            tabindex="-1"
            @click="scrollTabs"
          >
            <Icon name="material-symbols:chevron-right-rounded" class="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <!-- Lista -->
        <div ref="listEl" class="rail-scroll mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          <LoadingState v-if="source.isPending.value" message="Carregando canais…" />

          <ErrorState
            v-else-if="source.error.value"
            title="Não foi possível carregar os canais"
            :message="source.error.value.message"
            :on-retry="source.refresh"
          />

          <EmptyState
            v-else-if="channels.length === 0"
            :title="searching ? 'Nenhum canal encontrado' : 'Nenhum canal nesta categoria'"
            :description="searching ? 'Tente outro nome.' : 'Escolha outra categoria ou volte mais tarde.'"
          />

          <ul v-else class="space-y-2.5 p-1" role="list">
            <li v-for="(channel, index) in channels" :key="channel.id">
              <LiveChannelRow
                :media="channel"
                :number="channelNumber(index + 1)"
                :selected="channel.id === selected?.id"
                @preview="preview"
              />
            </li>
          </ul>

          <div ref="listSentinel" class="h-16" aria-hidden="true" />
          <p v-if="source.isLoading.value && channels.length > 0" class="py-3 text-center text-sm text-ink-muted">
            Carregando…
          </p>
        </div>
      </section>

      <!-- Coluna 3: prévia + programação -->
      <LiveChannelPreview
        class="hidden lg:flex"
        :media="selected"
        :category-slug="selected?.categoryId ? (categoryById.get(selected.categoryId)?.slug ?? null) : null"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { DEFAULT_PAGE_SIZE, SECTIONS } from '~/constants';
import { getRepositories } from '~/repositories';
import { useSearchResults } from '~/composables/useSearchResults';
import { usePaginatedQuery } from '~/composables/usePaginatedQuery';
import type { PaginatedQuery } from '~/composables/usePaginatedQuery';
import { categoryBelongsToSection } from '~/utils/categorySections';
import { isAdultCategory, isAdultItem } from '~/utils/adult';
import { getCategoryVisual } from '~/utils/categoryVisuals';
import { channelNumber } from '~/utils/live';
import type { MediaQuery, MediaSort, MediaSummary, GuideProgram } from '~/types';
import ChannelGuide from './ChannelGuide.vue';

type SortKey = 'default' | 'title' | '-added';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Padrão' },
  { value: 'title', label: 'A–Z' },
  { value: '-added', label: 'Mais recentes' },
];

const countFormatter = new Intl.NumberFormat('pt-BR');

useHead({ title: `Prysma — ${SECTIONS.tv.label}` });

const root = ref<HTMLElement | null>(null);
const listEl = ref<HTMLElement | null>(null);
const sideEl = ref<HTMLElement | null>(null);
const tabsEl = ref<HTMLElement | null>(null);
const listSentinel = ref<HTMLElement | null>(null);
const sideSentinel = ref<HTMLElement | null>(null);

/* ── Categorias / abas ─────────────────────────────────────────────────── */

const categories = useCategories();

const tvCategories = computed(() =>
  categories.categories.value.filter(
    (category) =>
      categoryBelongsToSection(category.slug, 'tv') &&
      (adultUnlocked.value || !isAdultCategory(category.slug)),
  ),
);

const categoryById = computed(
  () => new Map(categories.categories.value.map((category) => [category.id, category])),
);

/** Filtro e ordem sobrevivem à ida ao player e à volta (estado em memória, SSR-safe). */
const storedSlug = useState<string>('live.category', () => '');
const sortKey = useState<SortKey>('live.sort', () => 'default');

/** Conteúdo adulto oculto — desbloqueio futura (flag fica pronta, nunca vem do servidor). */
const adultUnlocked = useState<boolean>('adult.unlocked', () => false);

// Sempre abre em "Todos" — reseta ao montar
onMounted(() => {
  storedSlug.value = '';
  sortKey.value = 'default';
});

/** Slugs especiais de abas — filtram por nome via busca no servidor. */
const SPECIAL_TAB_SLUGS = ['__premiere__', '__espn__', '__sportv__'] as const;
type SpecialTabSlug = (typeof SPECIAL_TAB_SLUGS)[number];

function isSpecialSlug(slug: string): slug is SpecialTabSlug {
  return (SPECIAL_TAB_SLUGS as readonly string[]).includes(slug);
}

/** Slug ativo — vazio é "Todos". Slug que não existe mais no catálogo cai em "Todos". */
const activeSlug = computed(() => {
  const slug = storedSlug.value;
  if (isSpecialSlug(slug)) return slug;
  return slug && tvCategories.value.some((category) => category.slug === slug) ? slug : '';
});

const activeCategory = computed(
  () => tvCategories.value.find((category) => category.slug === activeSlug.value) ?? null,
);

const tabs = computed(() => [
  { slug: '', label: 'Todos' },
  { slug: '__premiere__', label: 'Premiere' },
  { slug: '__espn__', label: 'ESPN' },
  { slug: '__sportv__', label: 'SportTV' },
  ...tvCategories.value
    .filter((cat) => !['premieres', 'esportes'].includes(cat.slug))
    .map((category) => ({ slug: category.slug, label: category.name })),
]);

/* ── Sidebar categorias expansíveis ──────────────────────────────────────── */
const sidebarExpanded = ref<Set<string>>(new Set());

/** Mapa nome → slug para filtrar ao clicar na sidebar */
const slugByName = computed(() => {
  const map = new Map<string, string>();
  for (const category of tvCategories.value) {
    map.set(category.name, category.slug);
  }
  // Canais com slug especial
  map.set('Premiere', '__premiere__');
  map.set('ESPN', '__espn__');
  map.set('SportTV', '__sportv__');
  return map;
});

/** Nome de categoria da sidebar — separa ESPN e SportTV das demais */
function sidebarCatName(channel: MediaSummary): string {
  const title = channel.title.toLowerCase();
  if (title.includes('premiere') || title.includes('premiére')) return 'Premiere';
  if (title.includes('espn')) return 'ESPN';
  if (title.includes('sportv') || title.includes('spor tv')) return 'SportTV';
  return channel.categoryName || 'Outros';
}

/** Pool da sidebar — união da listagem principal + buscas especiais (sem duplicatas).
 *  Garante que Premiere/ESPN/SportTV apareçam mesmo fora da primeira página. */
const sidebarPool = computed<MediaSummary[]>(() => {
  const base = searching.value ? channels.value : mediaList.items.value;
  const byId = new Map<string, MediaSummary>();
  for (const item of base) byId.set(item.id, item);
  if (!searching.value) {
    for (const list of Object.values(specialLists)) {
      for (const item of list.items.value) byId.set(item.id, item);
    }
  }
  const all = [...byId.values()];
  return adultUnlocked.value ? all : all.filter((item) => !isAdultItem(item));
});

const sidebarCategories = computed(() => {
  const map = new Map<string, MediaSummary[]>();

  for (const channel of sidebarPool.value) {
    const catName = sidebarCatName(channel);
    const existing = map.get(catName);
    if (existing) {
      existing.push(channel);
    } else {
      map.set(catName, [channel]);
    }
  }

  const priority = ['Premiere', 'ESPN', 'SportTV', 'Aberto', 'Esportes', 'Desenhos 24h', 'Notícias', 'Variedades', 'Filmes', 'Séries', 'Infantil', 'Documentários', 'Música', 'Religioso', 'Outros'];
  return [...map.entries()].map(([name, channels]) => ({ 
    name, 
    channels,
    slug: slugByName.value.get(name) ?? '',
  })).sort((a, b) => {
    const idxA = priority.indexOf(a.name);
    const idxB = priority.indexOf(b.name);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
});

/** Busca fixa por termo — carrega os canais das abas especiais no servidor
 *  (fica fora da primeira página paginada, filtrar client-side não alcança). */
function fixedLiveSearch(term: string): PaginatedQuery<MediaSummary> {
  const repository = getRepositories().media;
  return usePaginatedQuery<MediaSummary>(
    (cursor, signal) =>
      repository.search({ q: term, cursor, type: 'live', limit: 50 }, { signal }),
  );
}

const specialLists: Record<SpecialTabSlug, PaginatedQuery<MediaSummary>> = {
  __premiere__: fixedLiveSearch('premiere'),
  __espn__: fixedLiveSearch('espn'),
  __sportv__: fixedLiveSearch('sportv'),
};

function isSidebarCategoryExpanded(name: string): boolean {
  return sidebarExpanded.value.has(name);
}

/** Clica na categoria da sidebar: filtra a lista e expande para mostrar os canais. */
function selectSidebarCategory(cat: { name: string; slug: string }): void {
  // Filtra a lista principal (mesmo comportamento das abas)
  setCategory(cat.slug);
  // Expande para mostrar os canais da categoria
  sidebarExpanded.value.add(cat.name);
}

/* ── Sidebar guia de canais ─────────────────────────────────────────────── */
const expandedChannelGuides = ref<Set<string>>(new Set());

function isChannelGuideExpanded(channelId: string): boolean {
  return expandedChannelGuides.value.has(channelId);
}

function toggleChannelGuide(channelId: string): void {
  if (expandedChannelGuides.value.has(channelId)) {
    expandedChannelGuides.value.delete(channelId);
  } else {
    expandedChannelGuides.value.add(channelId);
  }
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function setCategory(slug: string): void {
  storedSlug.value = slug;
}

function goBack(): void {
  // Se tem categoria filtrada → limpa o filtro (volta pra "Todos")
  if (activeSlug.value) {
    setCategory('');
    return;
  }
  // Senão → volta pra home
  navigateTo('/');
}

/* ── Ordenação ─────────────────────────────────────────────────────────── */

const sortOpen = ref(false);
const currentSortLabel = computed(
  () => SORT_OPTIONS.find((option) => option.value === sortKey.value)?.label ?? 'Padrão',
);

function setSort(value: SortKey): void {
  sortKey.value = value;
  sortOpen.value = false;
}

/* ── Dados ─────────────────────────────────────────────────────────────── */

const mediaParams = computed<MediaQuery>(() => {
  const params: MediaQuery = { type: 'live', limit: DEFAULT_PAGE_SIZE };
  // Slugs especiais não são categorias reais — não mandar pra API.
  if (activeSlug.value && !isSpecialSlug(activeSlug.value)) params.category = activeSlug.value;
  if (sortKey.value !== 'default') params.sort = sortKey.value as MediaSort;
  return params;
});

const mediaList = useMediaList(mediaParams);
const search = useSearchResults({ type: 'live' });

// SSR: a tela sai com os primeiros canais no HTML.
await mediaList.ready;

const searching = computed(() => search.search.isReady.value);

/** Fonte da lista: busca do usuário > aba especial (busca por termo) > listagem paginada. */
const source = computed(() => {
  if (searching.value) return search;
  const slug = activeSlug.value;
  if (isSpecialSlug(slug)) return specialLists[slug];
  return mediaList;
});

/** Lista exibida — sempre em ordem alfabética. Adulto fica de fora até desbloquear. */
const channels = computed<MediaSummary[]>(() => {
  const category = activeCategory.value;
  const items = source.value.items.value;
  const filtered = (!searching.value || !category)
    ? items
    : items.filter((item) => item.categoryId === category.id);

  const visible = adultUnlocked.value
    ? filtered
    : filtered.filter((item) => !isAdultItem(item));

  return [...visible].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
});

const total = computed(() =>
  searching.value && activeCategory.value ? channels.value.length : source.value.total.value,
);

const groupLabel = computed(() => {
  if (searching.value) return 'Resultados';
  if (activeSlug.value === '__premiere__') return 'Premiere';
  if (activeSlug.value === '__espn__') return 'ESPN';
  if (activeSlug.value === '__sportv__') return 'SportTV';
  return activeCategory.value?.name ?? 'Todos';
});

const heading = computed(() => {
  if (searching.value) return 'Resultados da busca';
  if (activeSlug.value === '__premiere__') return 'Premiere';
  if (activeSlug.value === '__espn__') return 'ESPN';
  if (activeSlug.value === '__sportv__') return 'SportTV';
  return activeCategory.value ? activeCategory.value.name : 'Todos os canais';
});

const countLabel = computed(() => {
  const count = total.value;
  return `${countFormatter.format(count)} ${count === 1 ? 'canal' : 'canais'}`;
});

function iconFor(channel: MediaSummary): string {
  const slug = channel.categoryId ? categoryById.value.get(channel.categoryId)?.slug : null;
  return slug ? getCategoryVisual(slug).icon : 'material-symbols:live-tv';
}

/* ── Seleção (prévia) ──────────────────────────────────────────────────── */

const selectedId = ref<string | null>(null);

const selected = computed<MediaSummary | null>(
  () => channels.value.find((channel) => channel.id === selectedId.value) ?? channels.value[0] ?? null,
);

function preview(channel: MediaSummary): void {
  selectedId.value = channel.id;
}

function rowFor(id: string): HTMLElement | null {
  return listEl.value?.querySelector<HTMLElement>(`[data-nav="row"][data-channel-id="${id}"]`) ?? null;
}

function focusEl(element: HTMLElement | null | undefined): void {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/** Clique num atalho da coluna 1: seleciona e leva a lista até o canal. */
function pickChannel(channel: MediaSummary): void {
  preview(channel);
  const row = rowFor(channel.id);
  row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function focusFirstRow(): void {
  listEl.value?.scrollTo({ top: 0, behavior: 'smooth' });
  focusEl(listEl.value?.querySelector<HTMLElement>('[data-nav="row"]'));
}

/* ── Rolagem infinita ──────────────────────────────────────────────────── */

function loadMoreIfVisible(isIntersecting: boolean): void {
  if (isIntersecting) source.value.loadMore();
}

useIntersectionObserver(listSentinel, loadMoreIfVisible);
useIntersectionObserver(sideSentinel, loadMoreIfVisible);

// Trocou filtro/ordem/busca: volta ao topo das duas listas.
watch([activeSlug, sortKey, () => search.search.normalizedQuery.value], async () => {
  await nextTick();
  listEl.value?.scrollTo({ top: 0 });
  sideEl.value?.scrollTo({ top: 0 });
});

// Mantém a coluna 1 acompanhando o canal selecionado quando a seleção vem da lista.
watch(
  () => selected.value?.id,
  (id) => {
    if (!id) return;
    const button = sideEl.value?.querySelector<HTMLElement>(`[data-channel-id="${id}"]`);
    button?.scrollIntoView({ block: 'nearest' });
  },
);

/* ── Abas: seta de rolagem ─────────────────────────────────────────────── */

const canScrollTabs = ref(false);

function updateTabEdges(): void {
  const element = tabsEl.value;
  if (!element) return;
  canScrollTabs.value = element.scrollLeft < element.scrollWidth - element.clientWidth - 4;
}

function scrollTabs(): void {
  tabsEl.value?.scrollBy({ left: tabsEl.value.clientWidth * 0.7, behavior: 'smooth' });
}

watch(tabs, async () => {
  await nextTick();
  updateTabEdges();
});

/* ── Navegação por setas (teclado / controle remoto) ───────────────────── */

function navList(kind: string): HTMLElement[] {
  const nodes = Array.from(root.value?.querySelectorAll<HTMLElement>(`[data-nav="${kind}"]`) ?? []);
  // Ignora itens ocultos via v-show (display:none), que ficam no DOM mas têm
  // retângulo zero — isso evita que a seta "pule" para um item escondido.
  return nodes.filter((el) => el.getClientRects().length > 0);
}

function activeTabEl(): HTMLElement | undefined {
  const list = navList('tab');
  return list.find((element) => element.getAttribute('aria-selected') === 'true') ?? list[0];
}

function selectedRowEl(): HTMLElement | undefined {
  const id = selected.value?.id;
  return (id ? (rowFor(id) ?? undefined) : undefined) ?? navList('row')[0];
}

function sidebarFor(id: string | undefined): HTMLElement | undefined {
  const list = navList('sidebar');
  return list.find((element) => element.dataset.channelId === id) ?? list[1] ?? list[0];
}

function onKeydown(event: KeyboardEvent): void {
  const { key } = event;
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return;

  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-nav]');
  const kind = target?.dataset.nav;
  if (!target || !kind) return;

  // Consome a seta mesmo sem destino (borda da lista mantém o foco no lugar).
  // Sem preventDefault o evento vaza pro motor espacial global, que puxa o
  // foco pra outra região — é o "salto pra o meio" ao chegar no fim da sidebar.
  const move = (element: HTMLElement | null | undefined): void => {
    event.preventDefault();
    if (element) focusEl(element);
  };

  const step = (kindName: string, delta: 1 | -1): HTMLElement | undefined => {
    const list = navList(kindName);
    return list[list.indexOf(target) + delta];
  };

  switch (kind) {
    case 'search':
      // Campo de texto: só ↓ sai dele (←→ movem o cursor).
      if (key === 'ArrowDown') move(navList('sidebar')[0]);
      break;

    case 'back':
      if (key === 'ArrowRight') move(navList('sort')[0] ?? activeTabEl());
      else if (key === 'ArrowDown') move(activeTabEl());
      break;

    case 'sidebar':
      // ↓ na última categoria/canal volta pro primeiro (wrap-around).
      if (key === 'ArrowDown') move(step('sidebar', 1) ?? navList('sidebar')[0]);
      else if (key === 'ArrowUp') move(step('sidebar', -1) ?? navList('search')[0]);
      else if (key === 'ArrowRight') move(rowFor(target.dataset.channelId ?? '') ?? selectedRowEl());
      break;

    case 'row':
      if (key === 'ArrowDown') move(step('row', 1));
      else if (key === 'ArrowUp') move(step('row', -1) ?? activeTabEl());
      else if (key === 'ArrowLeft') move(sidebarFor(target.dataset.channelId));
      else if (key === 'ArrowRight') move(navList('preview')[0]);
      break;

    case 'tab':
      if (key === 'ArrowRight') move(step('tab', 1));
      else if (key === 'ArrowLeft') move(step('tab', -1) ?? sidebarFor(selected.value?.id));
      else if (key === 'ArrowDown') move(selectedRowEl());
      else if (key === 'ArrowUp') move(navList('sort')[0]);
      break;

    case 'sort':
      if (key === 'ArrowDown') move(activeTabEl());
      else if (key === 'ArrowLeft') move(navList('back')[0] ?? navList('search')[0] ?? sidebarFor(undefined));
      break;

    case 'preview':
      if (key === 'ArrowDown') move(step('preview', 1));
      else if (key === 'ArrowUp') move(step('preview', -1));
      else if (key === 'ArrowLeft') move(selectedRowEl());
      break;
  }
}

let focusedOnce = false;

function focusInitialRow(): void {
  if (focusedOnce) return;
  const first = listEl.value?.querySelector<HTMLElement>('[data-nav="row"]');
  if (!first) return;
  focusedOnce = true;
  first.focus({ preventScroll: true });
}

watch(
  () => channels.value.length,
  async () => {
    await nextTick();
    focusInitialRow();
  },
);

onMounted(() => {
  updateTabEdges();
  focusInitialRow();
  window.addEventListener('resize', updateTabEdges);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateTabEdges);
});
</script>

<style scoped>
/* Painéis — vidro azul-marinho com contorno discreto. */
.live-panel {
  border: 1px solid rgba(124, 154, 255, 0.14);
  border-radius: 1.35rem;
  background: linear-gradient(180deg, rgba(8, 22, 52, 0.78), rgba(4, 12, 32, 0.82));
  backdrop-filter: blur(10px);
}

.search-box {
  border: 1px solid rgba(124, 154, 255, 0.16);
  border-radius: var(--radius-md);
  background: rgba(3, 9, 24, 0.55);
}

/* Linha "grupo atual" — mesmo degradê da aba ativa. */
.group-row {
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, #1e55e6 0%, #4a43d8 100%);
  box-shadow: 0 8px 24px rgba(30, 85, 230, 0.28);
}

.group-row:focus-visible,
.side-btn:focus-visible {
  border-radius: var(--radius-md);
}

.side-btn {
  border-radius: var(--radius-md);
}

.side-item + .side-item {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.sort-btn {
  border: 1px solid rgba(124, 154, 255, 0.2);
  border-radius: var(--radius-md);
  background: rgba(6, 20, 48, 0.8);
}

.sort-btn:focus-visible {
  border-radius: var(--radius-md);
}

.tabs-rail {
  scrollbar-width: none;
}

.tabs-rail::-webkit-scrollbar {
  display: none;
}

.tab-pill {
  height: 2.75rem;
  border: 1px solid rgba(124, 154, 255, 0.18);
  border-radius: 9999px;
  background: rgba(6, 20, 48, 0.75);
}

.tab-pill:focus-visible {
  border-radius: 9999px;
}

.tab-pill--active {
  border-color: transparent;
  background: linear-gradient(90deg, #1e55e6 0%, #3d4fe0 100%);
  box-shadow: 0 6px 20px rgba(30, 85, 230, 0.35);
}

/* Slide transition para sidebar categorias */
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
</style>
