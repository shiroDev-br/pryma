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

    <!-- 3 colunas: grupos (esquerda) · canais do grupo (meio) · prévia (direita).
         Os breakpoints do Tailwind aqui valem 0px (layout único, escalado pelo rem). -->
    <div
      v-else
      class="grid h-[calc(var(--app-vh)_-_7.5rem)] min-h-[30rem] grid-cols-[minmax(14rem,0.6fr)_minmax(0,1fr)_minmax(18rem,0.82fr)] gap-5"
    >
      <!-- Coluna 1: voltar + busca + grupos -->
      <LiveChannelsSidebar
        ref="sidebar"
        v-model:query="search.search.query.value"
        :categories="tvCategories"
        :active-slug="activeSlug"
        :all-count="allCount"
        :favorites-count="favoriteChannels.length"
        :games-count="games.loaded.value ? games.channels.value.length : null"
        :special-totals="specialTotals"
        @clear="search.search.clear()"
        @select="openGroup"
        @back="goBack"
      />

      <!-- Coluna 2: canais do grupo aberto -->
      <section class="live-panel flex min-h-0 flex-col p-4" aria-labelledby="live-list-heading">
        <header class="flex shrink-0 items-center gap-3">
          <Icon
            :name="headerIcon"
            class="h-8 w-8 shrink-0"
            :class="activeSlug === FAVORITES_SLUG ? 'text-[#ffc94d]' : 'text-blue-light'"
            aria-hidden="true"
          />
          <div class="min-w-0 flex-1">
            <h2 id="live-list-heading" class="truncate text-[1.35rem] font-semibold leading-tight text-ink">
              {{ groupLabel }}
            </h2>
            <p class="text-[0.9rem] tabular-nums text-ink-muted">{{ countLabel }}</p>
          </div>
        </header>

        <div ref="listEl" class="rail-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          <LoadingState v-if="listPending" :message="showingGames ? 'Procurando os jogos de hoje…' : 'Carregando canais…'" />

          <ErrorState
            v-else-if="listError"
            title="Não foi possível carregar os canais"
            :message="listError"
            :on-retry="showingGames ? () => games.load(true) : source?.refresh"
          />

          <EmptyState
            v-else-if="channels.length === 0"
            :title="emptyTitle"
            :description="emptyDescription"
          />

          <ul v-else class="space-y-2 p-1" role="list">
            <li v-for="(channel, index) in channels" :key="channel.id" @click.capture="onRowClick($event, channel)">
              <LiveChannelRow
                :media="channel"
                :number="channelNumber(index + 1)"
                :selected="channel.id === selected?.id"
              />
            </li>
          </ul>

          <div ref="listSentinel" class="h-16" aria-hidden="true" />
          <p v-if="source?.isLoading.value && channels.length > 0" class="py-3 text-center text-sm text-ink-muted">
            Carregando…
          </p>
        </div>
      </section>

      <!-- Coluna 3: prévia + qualidades + programação -->
      <LiveChannelPreview
        ref="previewPanel"
        class="flex"
        :media="selected"
        :category-slug="selected?.categoryId ? (categoryById.get(selected.categoryId)?.slug ?? null) : null"
        @variant="pickVariant"
        @zap="zapChannel"
        @closed="focusSelectedRow"
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
import { usePreferencesStore } from '~/stores/preferences';
import { categoryBelongsToSection } from '~/utils/categorySections';
import { isAdultCategory, isAdultItem } from '~/utils/adult';
import { FAVORITES_SLUG, GAMES_SLUG, channelNumber, compareChannelTitles } from '~/utils/live';
import { useDayGameChannels } from '~/composables/useDayGameChannels';
import type { MediaQuery, MediaSummary } from '~/types';
import LiveChannelsSidebar from './LiveChannelsSidebar.vue';
import LiveChannelPreview from './LiveChannelPreview.vue';

useHead({ title: `Pryma — ${SECTIONS.tv.label}` });

const root = ref<HTMLElement | null>(null);
const listEl = ref<HTMLElement | null>(null);
const listSentinel = ref<HTMLElement | null>(null);
/** Instância da coluna 1 — foco nos grupos. */
const sidebar = ref<InstanceType<typeof LiveChannelsSidebar> | null>(null);

const countFormatter = new Intl.NumberFormat('pt-BR');

/* ── Categorias ────────────────────────────────────────────────────────── */

const categories = useCategories();

/** Conteúdo adulto oculto — desbloqueio futuro (flag fica pronta, nunca vem do servidor). */
const adultUnlocked = useState<boolean>('adult.unlocked', () => false);

const tvCategories = computed(() =>
  categories.categories.value.filter(
    (category) =>
      categoryBelongsToSection(category, 'tv') &&
      (adultUnlocked.value || !isAdultCategory(category.slug)),
  ),
);

const categoryById = computed(
  () => new Map(categories.categories.value.map((category) => [category.id, category])),
);

/** Slugs especiais — filtram por nome via busca no servidor. */
const SPECIAL_TAB_SLUGS = ['__premiere__', '__espn__', '__sportv__'] as const;
type SpecialTabSlug = (typeof SPECIAL_TAB_SLUGS)[number];

function isSpecialSlug(slug: string): slug is SpecialTabSlug {
  return (SPECIAL_TAB_SLUGS as readonly string[]).includes(slug);
}

/* ── Estado persistido (sobrevive a ida ao player e à volta) ───────────── */

const liveState = useState('live.tvState', () => ({
  activeSlug: '' as string,
  selectedId: null as string | null,
  /** Texto da busca — volta junto com a lista. */
  query: '' as string,
  /** Rolagem da lista do meio no momento da ida pro player. */
  scrollTop: 0,
  /** true só quando saímos pro player: a volta restaura a posição. Qualquer outra saída zera. */
  returning: false,
}));

/** Entrou na tela vindo do player? Decidido antes de qualquer render. */
const cameBackFromPlayer = liveState.value.returning;
liveState.value.returning = false;

/** Entrada "limpa" (home → TV ao vivo): estado zerado, começa no topo. */
if (!cameBackFromPlayer) {
  liveState.value.activeSlug = '';
  liveState.value.selectedId = null;
  liveState.value.query = '';
  liveState.value.scrollTop = 0;
}

/** Grupo aberto — vazio é "Todos os canais". */
const activeSlug = computed(() => liveState.value.activeSlug);

const activeCategory = computed(
  () => tvCategories.value.find((category) => category.slug === activeSlug.value) ?? null,
);

function setCategory(slug: string): void {
  liveState.value.activeSlug = slug;
}

function goBack(): void {
  // Com grupo aberto, o voltar primeiro volta pra "Todos os canais".
  if (activeSlug.value) {
    setCategory('');
    return;
  }
  navigateTo('/');
}

/* ── Dados ─────────────────────────────────────────────────────────────── */

const mediaParams = computed<MediaQuery>(() => {
  const params: MediaQuery = { type: 'live', limit: DEFAULT_PAGE_SIZE };
  // Slugs especiais/favoritos não são categorias reais — não mandar pra API.
  if (activeCategory.value) params.category = activeSlug.value;
  return params;
});

const mediaList = useMediaList(mediaParams);
const search = useSearchResults({ type: 'live', initialQuery: liveState.value.query });

watch(search.search.query, (value) => {
  liveState.value.query = value;
});

// SSR: a tela sai com os primeiros canais no HTML.
await mediaList.ready;

const searching = computed(() => search.search.isReady.value);

/** Busca fixa por termo — carrega os canais dos grupos especiais no servidor
 *  (ficam fora da primeira página paginada; filtrar client-side não alcança). */
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

const specialTotals = computed<Record<string, number>>(() =>
  Object.fromEntries(
    Object.entries(specialLists).map(([slug, list]) => [slug, list.total.value]),
  ),
);

/** Favoritos de TV ao vivo, na ordem em que foram marcados. */
const preferences = usePreferencesStore();
const favoriteChannels = computed<MediaSummary[]>(() =>
  preferences.favorites
    .map((id) => preferences.favoriteItems[id])
    .filter((item): item is MediaSummary => !!item && item.type === 'live'),
);

const showingFavorites = computed(() => !searching.value && activeSlug.value === FAVORITES_SLUG);

/** Jogos do dia — cruzamento jogos × programação, feito só quando o grupo é aberto. */
const games = useDayGameChannels();
const showingGames = computed(() => !searching.value && activeSlug.value === GAMES_SLUG);

watch(
  activeSlug,
  (slug) => {
    if (slug === GAMES_SLUG && import.meta.client) void games.load();
  },
  { immediate: true },
);

/** Fonte da lista: busca do usuário > grupo especial (busca por termo) > listagem paginada.
 *  Favoritos não têm fonte remota (null). */
const source = computed<PaginatedQuery<MediaSummary> | null>(() => {
  if (searching.value) return search;
  const slug = activeSlug.value;
  if (slug === FAVORITES_SLUG || slug === GAMES_SLUG) return null;
  if (isSpecialSlug(slug)) return specialLists[slug];
  return mediaList;
});

/** Canais da lista do meio — sempre em ordem alfabética (favoritos: ordem de marcação).
 *  Adulto fica de fora até desbloquear. */
const channels = computed<MediaSummary[]>(() => {
  if (showingFavorites.value) return favoriteChannels.value;
  if (showingGames.value) return games.channels.value;

  const category = activeCategory.value;
  const items = source.value?.items.value ?? [];
  const filtered = (!searching.value || !category)
    ? items
    : items.filter((item) => item.categoryId === category.id);

  const visible = adultUnlocked.value
    ? filtered
    : filtered.filter((item) => !isAdultItem(item));

  return [...visible].sort((a, b) => compareChannelTitles(a.title, b.title));
});

const listPending = computed(() =>
  showingGames.value ? games.isLoading.value || !games.loaded.value : !!source.value?.isPending.value,
);
const listError = computed(() =>
  showingGames.value ? games.error.value : (source.value?.error.value?.message ?? ''),
);

const total = computed(() => {
  if (showingFavorites.value || showingGames.value || (searching.value && activeCategory.value)) {
    return channels.value.length;
  }
  return source.value?.total.value ?? 0;
});

/** "Todos os canais" — soma das categorias (o total da listagem muda com o grupo aberto). */
const allCount = computed(() =>
  tvCategories.value.reduce((sum, category) => sum + category.itemCount, 0),
);

const groupLabel = computed(() => {
  if (searching.value) return 'Resultados';
  if (activeSlug.value === FAVORITES_SLUG) return 'Favoritos';
  if (activeSlug.value === GAMES_SLUG) return 'Jogos do dia';
  if (activeSlug.value === '__premiere__') return 'Premiere';
  if (activeSlug.value === '__espn__') return 'ESPN';
  if (activeSlug.value === '__sportv__') return 'SporTV';
  return activeCategory.value?.name ?? 'Todos os canais';
});

const headerIcon = computed(() => {
  if (activeSlug.value === FAVORITES_SLUG) return 'material-symbols:star-rounded';
  if (activeSlug.value === GAMES_SLUG) return 'material-symbols:scoreboard-outline-rounded';
  return 'material-symbols:sensors-rounded';
});

const countLabel = computed(() => {
  const count = total.value;
  return `${countFormatter.format(count)} ${count === 1 ? 'canal' : 'canais'}`;
});

const emptyTitle = computed(() => {
  if (searching.value) return 'Nenhum canal encontrado';
  if (showingFavorites.value) return 'Nenhum favorito ainda';
  if (showingGames.value) return 'Nenhum jogo com transmissão hoje';
  return 'Nenhum canal neste grupo';
});

const emptyDescription = computed(() => {
  if (searching.value) return 'Tente outro nome.';
  if (showingFavorites.value) return 'Escolha um canal e use "Favoritar" embaixo da prévia.';
  if (showingGames.value) return 'Não achamos canais passando os jogos de hoje. Veja os grupos de esportes.';
  return 'Escolha outro grupo ou volte mais tarde.';
});

/* ── Seleção (prévia da direita) ───────────────────────────────────────── */

const selectedId = ref<string | null>(liveState.value.selectedId);
/** Canal escolhido guardado inteiro: a versão escolhida na prévia (FHD/HD…) pode não estar na lista. */
const selectedMedia = ref<MediaSummary | null>(null);

/** Sem canal escolhido, a coluna da direita fica vazia (nada de prévia/programação). */
const selected = computed<MediaSummary | null>(() => {
  const id = selectedId.value;
  if (!id) return null;
  if (selectedMedia.value?.id === id) return selectedMedia.value;
  return channels.value.find((channel) => channel.id === id) ?? null;
});

function select(channel: MediaSummary): void {
  selectedId.value = channel.id;
  selectedMedia.value = channel;
  liveState.value.selectedId = channel.id;
}

/**
 * Passar pelos canais com a seta só move o foco — não abre prévia nem
 * programação (cada canal visitado custaria conexão no provedor e render).
 * 1º OK/clique escolhe o canal (detalhes + prévia); 2º OK põe a prévia em tela cheia.
 */
function onRowClick(event: MouseEvent, channel: MediaSummary): void {
  if (channel.id !== selected.value?.id) {
    event.preventDefault(); // capture roda antes do RouterLink, que respeita o defaultPrevented
    select(channel);
    return;
  }
  // 2º OK no canal escolhido: a prévia (já tocando) vai pra tela cheia — sem abrir o player.
  event.preventDefault();
  previewPanel.value?.expand();
}

/** Escolheu outra versão na prévia (FHD/HD…). */
function pickVariant(channel: MediaSummary): void {
  select(channel);
}

function rowOf(id: string | null | undefined): HTMLElement | null {
  if (!id) return null;
  return listEl.value?.querySelector<HTMLElement>(`[data-nav="row"][data-channel-id="${CSS.escape(id)}"]`) ?? null;
}

/**
 * Tela cheia: ↑/↓ trocam para o canal de cima/de baixo da lista. A prévia segue
 * expandida (o `?full=1` fica) e só a fonte muda. Perto do fim da lista carrega mais.
 */
function zapChannel(direction: 1 | -1): void {
  const list = channels.value;
  // Versão escolhida nos chips (FHD/HD…) pode não estar na lista: usa a linha marcada.
  const currentId = selected.value?.id ?? null;
  let index = list.findIndex((channel) => channel.id === currentId);
  if (index < 0) index = list.findIndex((channel) => channel.id === liveState.value.selectedId);
  const next = list[index + direction];
  if (!next) return;
  select(next);
  if (index + direction >= list.length - 3) source.value?.loadMore();
  // A lista acompanha por trás (a volta da tela cheia cai no canal certo).
  void nextTick(() => rowOf(next.id)?.scrollIntoView({ block: 'nearest', behavior: 'auto' }));
}

/** Saiu da tela cheia: foco na linha do canal que estava tocando. */
function focusSelectedRow(): void {
  void nextTick(() => rowOf(selected.value?.id ?? liveState.value.selectedId)?.focus({ preventScroll: false }));
}

/** Coluna 3 — expande a prévia em tela cheia. */
const previewPanel = ref<InstanceType<typeof LiveChannelPreview> | null>(null);

/* ── Abrir grupo ───────────────────────────────────────────────────────── */

/** OK num grupo pede foco no 1º canal assim que a lista do meio carregar. */
const focusRowsWhenReady = ref(false);

function firstRow(): HTMLElement | null {
  return listEl.value?.querySelector<HTMLElement>('[data-nav="row"]') ?? null;
}

function tryFocusRows(): void {
  if (!focusRowsWhenReady.value || listPending.value) return;
  focusRowsWhenReady.value = false;
  const row = firstRow();
  if (!row) return; // grupo vazio: o foco fica no grupo
  row.focus({ preventScroll: true });
}

function openGroup(slug: string): void {
  setCategory(slug);
  focusRowsWhenReady.value = true;
  void nextTick(tryFocusRows);
}

watch([listPending, () => channels.value.length], () => void nextTick(tryFocusRows));

/* ── Navegação por setas (teclado / controle remoto) ───────────────────── */

const { onKeydown } = useLiveNav({
  root,
  selectedId: () => selected.value?.id ?? null,
  activeGroup: () => activeSlug.value,
});

/* ── Rolagem infinita (lista do meio) ──────────────────────────────────── */

function loadMoreIfVisible(isIntersecting: boolean): void {
  if (isIntersecting) source.value?.loadMore();
}

useIntersectionObserver(listSentinel, loadMoreIfVisible);

// Trocou grupo/busca: volta ao topo da lista do meio e esvazia a coluna da direita.
watch([activeSlug, () => search.search.normalizedQuery.value], async () => {
  selectedId.value = null;
  selectedMedia.value = null;
  liveState.value.selectedId = null;
  await nextTick();
  listEl.value?.scrollTo({ top: 0 });
});

/* ── Entrada / saída da tela ───────────────────────────────────────────── */

/** Resolve quando `ready()` vira true (ou depois de `timeout` ms, pra nunca travar a volta). */
function until(ready: () => boolean, timeout = 8000): Promise<void> {
  if (ready()) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(finish, timeout);
    const stop = watch(ready, (value) => {
      if (value) finish();
    });
    function finish(): void {
      clearTimeout(timer);
      stop();
      resolve();
    }
  });
}

/** Volta do player: carrega páginas até achar o canal, devolve a rolagem e foca. */
async function restoreAfterPlayer(): Promise<void> {
  // A volta remonta a tela: categorias e 1ª página ainda carregando, coluna do meio nem existe.
  await until(() => !!listEl.value && !listPending.value);
  const id = liveState.value.selectedId;
  const list = source.value;
  if (id && list) {
    let guard = 0;
    while (!channels.value.some((channel) => channel.id === id) && list.hasNext.value && guard++ < 80) {
      if (list.isLoading.value) {
        await new Promise((resolve) => setTimeout(resolve, 60));
      } else {
        await list.loadMore();
      }
    }
  }
  await nextTick();
  if (listEl.value) listEl.value.scrollTop = liveState.value.scrollTop;

  const row = id
    ? listEl.value?.querySelector<HTMLElement>(`[data-nav="row"][data-channel-id="${CSS.escape(id)}"]`)
    : null;
  if (row && listEl.value) {
    const box = listEl.value.getBoundingClientRect();
    const rect = row.getBoundingClientRect();
    if (rect.top < box.top || rect.bottom > box.bottom) row.scrollIntoView({ block: 'center', behavior: 'auto' });
    row.focus({ preventScroll: true });
    return;
  }
  // Canal não existe mais na lista: foco no grupo aberto.
  if (!sidebar.value?.focusGroup(activeSlug.value)) sidebar.value?.focusFirst();
}

onMounted(() => {
  if (cameBackFromPlayer) {
    void restoreAfterPlayer();
  } else {
    // Entrada limpa: foco no primeiro item da coluna da esquerda. A coluna só
    // existe depois que as categorias chegam — focar na montagem deixava o
    // foco no <body> e o 1º toque do controle caía no meio da lista.
    void until(() => tvCategories.value.length > 0).then(async () => {
      await nextTick();
      const active = document.activeElement;
      if (!active || active === document.body) sidebar.value?.focusFirst();
    });
  }
});

const router = useRouter();

onBeforeUnmount(() => {
  // Só preserva o estado se o destino for o player; qualquer outra saída
  // (home, busca, etc.) faz a próxima entrada começar do início.
  // `router.currentRoute` já aponta pro destino neste momento.
  const goingToPlayer = router.currentRoute.value.path.startsWith('/medias/');
  liveState.value.returning = goingToPlayer;
  if (goingToPlayer) {
    // O canal aberto é o da linha clicada (foco atual), não necessariamente o da prévia.
    const focusedId = (document.activeElement as HTMLElement | null)?.dataset?.channelId;
    liveState.value.selectedId = focusedId ?? selectedId.value ?? liveState.value.selectedId;
    liveState.value.scrollTop = listEl.value?.scrollTop ?? 0;
  }
});
</script>

<style scoped>
/* Painel — fundo opaco. Sem backdrop-filter: em colunas de altura inteira,
   o blur era recalculado com a lista rolando atrás (travava D-pad e rolagem). */
.live-panel {
  border: 1px solid rgba(124, 154, 255, 0.14);
  border-radius: 1.35rem;
  background: linear-gradient(180deg, rgba(8, 22, 52, 0.96), rgba(4, 12, 32, 0.98));
}
</style>
