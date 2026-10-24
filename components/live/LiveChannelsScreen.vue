<template>
  <div ref="root" class="live-screen tv-safe pb-6 pt-24" @keydown="onKeydown">
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
      class="grid h-[calc(var(--app-vh)_-_7.5rem)] min-h-[30rem] grid-cols-1 gap-5 lg:grid-cols-[minmax(13rem,0.5fr)_minmax(0,1fr)_minmax(16rem,0.72fr)] lg:gap-5 xl:grid-cols-[minmax(16rem,0.54fr)_minmax(0,1fr)_minmax(19rem,0.73fr)] xl:gap-6"
    >
      <!-- Coluna 1: busca + atalhos -->
      <LiveChannelsSidebar
        ref="sidebar"
        v-model:query="search.search.query.value"
        :pool="sidebarPool"
        :categories="tvCategories"
        :active-slug="activeSlug"
        :label="groupLabel"
        :count="total"
        :selected-id="selected?.id ?? null"
        @clear="search.search.clear()"
        @select="setCategory"
        @pick="pickChannel"
        @play="playChannel"
        @focus-first="focusFirstRow"
      />

      <!-- Coluna 2: lista de canais -->
      <section class="live-panel flex min-h-0 flex-col p-4 lg:p-5" aria-labelledby="live-list-heading">
        <!-- No celular o wrap evita que o título fique "T." espremido pelo seletor de ordem. -->
        <header class="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
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

          <!-- min-w garante que o wrap leve a ordenação pra outra linha
               quando a coluna fica apertada (ex.: 1280px) em vez de
               espremer o título até "Todos os ca…". -->
          <div class="min-w-[11rem] flex-1">
            <h2 id="live-list-heading" class="truncate text-[1.5rem] font-semibold leading-tight text-ink">
              {{ heading }}
            </h2>
            <p class="text-[0.95rem] tabular-nums text-ink-muted">{{ countLabel }}</p>
          </div>

          <!-- Ordenação -->
          <div class="relative ml-auto shrink-0">
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
            class="absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#06142d]/90 text-ink transition-colors duration-fast hover:text-blue-light focus:outline-none focus-visible:shadow-focus"
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
        class="flex"
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
import { channelNumber } from '~/utils/live';
import { mediaHref } from '~/utils/media';
import type { MediaQuery, MediaSort, MediaSummary } from '~/types';
import LiveChannelsSidebar from './LiveChannelsSidebar.vue';

type SortKey = 'default' | 'title' | '-added';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Padrão' },
  { value: 'title', label: 'A–Z' },
  { value: '-added', label: 'Mais recentes' },
];

const countFormatter = new Intl.NumberFormat('pt-BR');

useHead({ title: `Pryma — ${SECTIONS.tv.label}` });

const root = ref<HTMLElement | null>(null);
const listEl = ref<HTMLElement | null>(null);
const tabsEl = ref<HTMLElement | null>(null);
const listSentinel = ref<HTMLElement | null>(null);
/** Instância da coluna 1 — superfície de rolagem e sentinela do filho. */
const sidebar = ref<InstanceType<typeof LiveChannelsSidebar> | null>(null);

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

/* ── Seleção (prévia) ──────────────────────────────────────────────────── */

const selectedId = ref<string | null>(null);

const selected = computed<MediaSummary | null>(
  () => channels.value.find((channel) => channel.id === selectedId.value) ?? channels.value[0] ?? null,
);

/** Atraso curto antes de trocar a prévia: segurar a seta passa por muitas
 *  linhas por segundo e cada troca remonta a arte do canal (img com :key) —
 *  sem debounce a coluna da direita re-renderiza a cada linha e a TV trava. */
let previewTimer: ReturnType<typeof setTimeout> | undefined;

function preview(channel: MediaSummary): void {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    selectedId.value = channel.id;
  }, 80);
}

onBeforeUnmount(() => {
  if (previewTimer) clearTimeout(previewTimer);
});

/* ── Navegação por setas (teclado / controle remoto) ───────────────────── */

const { onKeydown, rowFor, focusFirstRow, focusInitialRow } = useLiveNav({
  root,
  listEl,
  selectedId: () => selected.value?.id ?? null,
});

/** Clique num atalho da coluna 1: seleciona e leva a lista até o canal. */
function pickChannel(channel: MediaSummary): void {
  preview(channel);
  const row = rowFor(channel.id);
  row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/** Clique numa transmissão na guia da coluna 1: vai direto pro player. */
function playChannel(channel: MediaSummary): void {
  console.log('[LiveScreen] playChannel called', channel?.title, mediaHref(channel));
  navigateTo(mediaHref(channel));
}

/* ── Rolagem infinita ──────────────────────────────────────────────────── */

function loadMoreIfVisible(isIntersecting: boolean): void {
  if (isIntersecting) source.value.loadMore();
}

useIntersectionObserver(listSentinel, loadMoreIfVisible);
useIntersectionObserver(() => sidebar.value?.sentinel() ?? null, loadMoreIfVisible);

// Trocou filtro/ordem/busca: volta ao topo das duas listas.
watch([activeSlug, sortKey, () => search.search.normalizedQuery.value], async () => {
  await nextTick();
  listEl.value?.scrollTo({ top: 0 });
  sidebar.value?.resetScroll();
});

// Mantém a coluna 1 acompanhando o canal selecionado quando a seleção vem da lista.
watch(
  () => selected.value?.id,
  (id) => {
    if (!id) return;
    sidebar.value?.revealChannel(id);
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
/* Painéis — fundo opaco. Sem backdrop-filter: em colunas de altura inteira,
   o blur era recalculado com a lista rolando atrás (travava D-pad e rolagem). */
.live-panel {
  border: 1px solid rgba(124, 154, 255, 0.14);
  border-radius: 1.35rem;
  background: linear-gradient(180deg, rgba(8, 22, 52, 0.96), rgba(4, 12, 32, 0.98));
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
</style>
