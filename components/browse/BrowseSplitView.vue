<template>
  <div
    ref="rootEl"
    class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] xl:gap-8"
  >
    <div class="min-w-0 space-y-2">
      <!-- Card "Buscar" — primeiro da listagem; entra só na busca por tipo (não na TV ao vivo). -->
      <NuxtLink
        v-if="showSearchCard"
        :to="`/search?type=${type}`"
        class="group flex w-full items-center gap-3 rounded-md border border-line/70 bg-surface/70 p-1.5 text-left transition-colors duration-fast hover:border-blue-dark/60 hover:bg-surface focus:outline-none focus-visible:shadow-focus sm:gap-4"
      >
        <div
          class="flex h-[3.4rem] w-[2.3rem] shrink-0 items-center justify-center rounded bg-elevated text-blue-dark"
          aria-hidden="true"
        >
          <Icon name="material-symbols:search-rounded" class="h-6 w-6" />
        </div>
        <div class="min-w-0 flex-1 py-0.5">
          <p class="truncate text-[1.02rem] font-semibold leading-snug text-ink">
            Buscar em {{ typeLabel }}
          </p>
          <p class="mt-1 truncate text-[0.78rem] text-ink-muted">Títulos, atores ou gêneros</p>
        </div>
        <Icon
          name="material-symbols:chevron-right-rounded"
          class="h-5 w-5 shrink-0 text-ink-muted transition-colors duration-fast group-hover:text-blue-light"
          aria-hidden="true"
        />
      </NuxtLink>

      <MediaListRow
        v-for="media in items"
        :key="media.id"
        :media="media"
        :selected="highlightId === media.id"
        @preview="preview"
      />
    </div>

    <MediaDetailPanel
      class="rail-scroll hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(var(--app-vh)_-_7.5rem)] lg:overflow-y-auto"
      :media="panelMedia"
      :similar="similarShown"
      @preview="preview"
    />
  </div>
</template>

<script setup lang="ts">
import { getRepositories } from '~/repositories';
import type { MediaSummary, MediaType } from '~/types';

const props = defineProps<{
  items: MediaSummary[];
  categorySlug: string;
  type: MediaType;
}>();

const TYPE_LABELS: Record<MediaType, string> = {
  vod: 'Filmes',
  series: 'Séries',
  live: 'TV ao Vivo',
};

const typeLabel = computed(() => TYPE_LABELS[props.type]);

/** TV ao vivo é canais — a busca só faz sentido para filmes e séries. */
const showSearchCard = computed(() => props.type !== 'live');

/**
 * Listagem em duas colunas: linhas à esquerda, detalhe à direita.
 * Hover/foco em qualquer item (linha ou "Mais como este") move a prévia;
 * o clique sempre abre o player.
 */
const selectedRef = ref<MediaSummary | null>(null);

const selected = computed<MediaSummary | null>(() => {
  const current = selectedRef.value;
  if (!current) return props.items[0] ?? null;

  const known =
    props.items.some((item) => item.id === current.id) ||
    similarPool.value.some((item) => item.id === current.id);

  return known ? current : (props.items[0] ?? null);
});

/**
 * Painel da direita segue a seleção com um atraso curto: segurar ↓ passa por
 * vários títulos por segundo e cada troca remonta arte, sinopse e elenco —
 * sem isso o painel re-renderizava a cada linha e a TV engasgava. A linha
 * destacada (`highlightId`) continua imediata.
 */
const PANEL_DELAY = 90;
const panelRef = shallowRef<MediaSummary | null>(null);
let panelTimer: ReturnType<typeof setTimeout> | undefined;

function preview(media: MediaSummary): void {
  selectedRef.value = media;
  if (panelTimer) clearTimeout(panelTimer);
  panelTimer = setTimeout(() => {
    panelRef.value = media;
  }, PANEL_DELAY);
}

const highlightId = computed(() => selected.value?.id ?? null);

/** Mesma validação de `selected`, aplicada à seleção atrasada do painel. */
const panelMedia = computed<MediaSummary | null>(() => {
  const current = panelRef.value;
  if (!current || current.id === selected.value?.id) return selected.value;
  const known =
    props.items.some((item) => item.id === current.id) ||
    similarPool.value.some((item) => item.id === current.id);
  return known ? current : selected.value;
});

/**
 * Ao abrir a categoria, o foco vai para o título destacado. Sem foco, a
 * primeira ↓ do controle partia do centro da tela e caía no 2º/3º título.
 */
const rootEl = ref<HTMLElement | null>(null);

onMounted(() => {
  const active = document.activeElement;
  if (active && active !== document.body) return;
  rootEl.value?.querySelector<HTMLElement>('.media-row[aria-current="true"]')?.focus({ preventScroll: true });
});

onBeforeUnmount(() => {
  if (panelTimer) clearTimeout(panelTimer);
});

/* ── "Mais como este": títulos mais recentes da mesma categoria ── */
const repository = getRepositories().media;
const similarPool = shallowRef<MediaSummary[]>([]);
let similarRequest = 0;

async function loadSimilar(): Promise<void> {
  if (import.meta.server) return;

  const requestId = ++similarRequest;
  try {
    const page = await repository.listMedia({
      category: props.categorySlug,
      type: props.type,
      sort: '-added',
      limit: 12,
    });
    if (requestId === similarRequest) similarPool.value = page.items;
  } catch {
    if (requestId === similarRequest) similarPool.value = [];
  }
}

const similarShown = computed(() => {
  const currentId = selected.value?.id;
  return similarPool.value.filter((item) => item.id !== currentId).slice(0, 8);
});

watch(
  () => [props.categorySlug, props.type] as const,
  () => {
    selectedRef.value = null;
    panelRef.value = null;
    similarPool.value = [];
    loadSimilar();
  },
  { immediate: true },
);
</script>
