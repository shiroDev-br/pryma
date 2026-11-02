<template>
  <div class="browse-category-page tv-safe pb-28 pt-24">
    <BrowseListHeader
      :back-to="`/browse/${section}`"
      :section-label="sectionDef.label"
      :heading="heading"
      :count="resultLabel"
    >
      <div
        v-if="canSort"
        class="flex flex-wrap gap-2 pt-2"
        role="group"
        aria-label="Ordenar títulos"
      >
        <button
          v-for="option in SORT_OPTIONS"
          :key="option.value"
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.8rem] font-medium transition-colors duration-fast focus:outline-none focus-visible:shadow-focus"
          :class="
            sort === option.value
              ? 'border-blue/60 bg-blue-dark/25 text-ink'
              : 'border-line bg-surface/60 text-ink-muted hover:text-ink'
          "
          :aria-pressed="sort === option.value"
          @click="sort = option.value"
        >
          <Icon :name="option.icon" class="h-4 w-4" aria-hidden="true" />
          {{ option.label }}
        </button>
      </div>
    </BrowseListHeader>

    <LoadingState v-if="mediaList.isPending.value" message="Carregando títulos…" />

    <ErrorState
      v-else-if="categoryMissing"
      title="Categoria não encontrada"
      description="Ela pode ter sido removida do catálogo."
    />

    <ErrorState
      v-else-if="mediaList.error.value"
      title="Não foi possível carregar os títulos"
      :message="mediaList.error.value.message"
      :on-retry="mediaList.refresh"
    />

    <EmptyState
      v-else-if="visibleItems.length === 0"
      title="Nada por aqui ainda"
      description="Tente outra categoria ou volte mais tarde."
    />

    <template v-else>
      <TVLiveSplitView
        v-if="sectionDef.type === 'live'"
        :items="visibleItems"
        :category-slug="categorySlug"
        :type="sectionDef.type"
      />

      <!-- Filmes/séries: grade de pôsteres (como na busca); o card abre a tela de detalhes. -->
      <div
        v-else
        class="grid grid-cols-6 gap-4"
        data-media-grid
        @keydown="onGridKeydown"
      >
        <MediaCard v-for="media in visibleItems" :key="media.id" :media="media" />
      </div>

      <div ref="sentinel" class="h-px" aria-hidden="true" />

      <div class="flex justify-center pt-4">
        <button
          v-if="mediaList.hasNext.value"
          type="button"
          class="rounded-sm border border-line bg-surface px-6 py-2.5 text-sm text-ink transition-colors duration-fast hover:border-blue-dark hover:text-blue-light disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="mediaList.isLoading.value"
          @click="mediaList.loadMore()"
        >
          {{ mediaList.isLoading.value ? 'Carregando…' : 'Carregar mais' }}
        </button>
      </div>
    </template>

    <BottomInfoBar :title="heading" :subtitle="resultLabel" :icon="sectionDef.icon" />
  </div>
</template>

<script setup lang="ts">
import { DEFAULT_PAGE_SIZE, DEFAULT_SORT, SECTIONS, isSectionKey } from '~/constants';
import { isAdultCategory, isAdultItem } from '~/utils/adult';
import { ALL_CATEGORY_SLUG, categoryBelongsToSection } from '~/utils/categorySections';
import type { MediaSort } from '~/types';
import TVLiveSplitView from '~/components/browse/TVLiveSplitView.vue';

const { onGridKeydown } = useGridNav();

const route = useRoute();

const sectionParam = String(route.params.section);
if (!isSectionKey(sectionParam)) {
  throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada', fatal: true });
}

const section = sectionParam;
const sectionDef = SECTIONS[section];
const categorySlug = String(route.params.category);

// Categoria adulta fora do desbloqueio — responde como inexistente.
const adultUnlocked = useState<boolean>('adult.unlocked', () => false);
if (isAdultCategory(categorySlug) && !adultUnlocked.value) {
  throw createError({ statusCode: 404, statusMessage: 'Categoria não encontrada', fatal: true });
}

const categories = useCategories();

/** Ordenação da listagem — o servidor aceita os seis valores de `MediaSort`. */
const sort = ref<MediaSort>(DEFAULT_SORT);

const SORT_OPTIONS: { value: MediaSort; label: string; icon: string }[] = [
  { value: '-added', label: 'Mais recentes', icon: 'material-symbols:swap-vert-rounded' },
  { value: '-year', label: 'Ano', icon: 'material-symbols:calendar-month-outline-rounded' },
  { value: 'title', label: 'A–Z', icon: 'material-symbols:sort-by-alpha-rounded' },
];

/** Ordenação só nos catálogos (filmes/séries) — canais ao vivo não têm ordem. */
const canSort = computed(() => sectionDef.type !== 'live');

/** Séries: a listagem agrupa episódios por `seriesId` — um card por série. */
const isSeriesSection = computed(() => sectionDef.type === 'series');

/** "Todos": a seção inteira, sem filtro de categoria. */
const isAll = categorySlug === ALL_CATEGORY_SLUG;

const mediaParams = computed(() => ({
  category: isAll ? undefined : categorySlug,
  type: sectionDef.type,
  sort: sort.value,
  limit: DEFAULT_PAGE_SIZE,
}));

const mediaList = useMediaList(mediaParams);

// SSR: página de categoria sai com itens (ou vazio/erro) no HTML.
await mediaList.ready;

const category = computed(() =>
  categories.categories.value.find((item) => item.slug === categorySlug),
);

const heading = computed(() => {
  if (isAll) return isSeriesSection.value ? 'Todas as séries' : 'Todos os filmes';
  return category.value?.name ?? categorySlug;
});

/** Categorias desta seção (o "Todos" soma elas e herda o tipo do catálogo). */
const sectionCategories = computed(() =>
  categories.categories.value.filter(
    (item) =>
      categoryBelongsToSection(item, section) && (adultUnlocked.value || !isAdultCategory(item.slug)),
  ),
);

/** "Todos" lista sem filtro de categoria — o adulto sai aqui até o desbloqueio. */
const visibleItems = computed(() =>
  isAll && !adultUnlocked.value
    ? mediaList.items.value.filter((item) => !isAdultItem(item))
    : mediaList.items.value,
);

/** Só acusa "não encontrada" quando as categorias carregaram e o slug não existe nelas. */
const categoryMissing = computed(
  () =>
    !isAll &&
    !mediaList.isPending.value &&
    !mediaList.error.value &&
    categories.error.value === null &&
    categories.categories.value.length > 0 &&
    category.value === undefined,
);

const resultLabel = computed(() => {
  // "Todos": soma das categorias visíveis (o total da API conta o adulto).
  const allTotal = sectionCategories.value.reduce((sum, item) => sum + item.itemCount, 0);
  const total = isAll && allTotal > 0 ? allTotal : mediaList.total.value;
  // Catálogo Xtream lista uma entrada por série; a lista legada, episódios.
  const typed = isAll ? sectionCategories.value.some((item) => item.type) : category.value?.type;
  const seriesNoun = typed ? ['série', 'séries'] : ['episódio', 'episódios'];
  const noun = isSeriesSection.value
    ? total === 1
      ? seriesNoun[0]
      : seriesNoun[1]
    : total === 1
      ? 'título'
      : 'títulos';
  return `${total} ${noun}`;
});

const sentinel = ref<HTMLElement | null>(null);
useIntersectionObserver(sentinel, (isIntersecting) => {
  if (isIntersecting) mediaList.loadMore();
});

// Foco no primeiro card — o D-pad segue pela grade.
onMounted(() => {
  if (document.activeElement && document.activeElement !== document.body) return;
  document.querySelector<HTMLElement>('[data-media-grid] [data-media-card]')?.focus({ preventScroll: true });
});

useHead({ title: computed(() => `Pryma — ${heading.value}`) });
</script>
