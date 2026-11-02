<template>
  <!-- TV ao Vivo: tela única de canais (abas + lista + prévia). Filmes/Séries seguem com o trilho de categorias. -->
  <LiveChannelsScreen v-if="section === 'tv'" />

  <div v-else ref="root" class="tv-safe pb-10 pt-24" @keydown="onKeydown">
    <h1 class="sr-only">{{ sectionDef.label }} — escolha uma categoria</h1>

    <LoadingState v-if="categories.isLoading.value" message="Carregando categorias…" />

    <ErrorState
      v-else-if="categories.error.value"
      title="Não foi possível carregar as categorias"
      :message="categories.error.value.message"
      :on-retry="categories.refresh"
    />

    <EmptyState
      v-else-if="sectionDef.type === 'live' && sectionCategories.length === 0"
      title="Nenhuma categoria disponível"
      description="Assim que o catálogo for atualizado, as categorias aparecem aqui."
    />

    <!-- Trilho horizontal: 2 fileiras lado a lado, rolagem lateral / setas do teclado e do controle. -->
    <div v-else class="relative">
      <ul
        ref="rail"
        class="category-rail -mx-3 px-3 py-3"
        role="list"
        aria-label="Categorias"
        @scroll.passive="updateEdges"
        @wheel="onWheel"
      >
        <li v-if="sectionDef.type !== 'live'" class="min-w-0">
          <CategorySearchCard
            data-category-card
            :type="sectionDef.type === 'series' ? 'series' : 'vod'"
            :label="sectionDef.type === 'series' ? 'Séries' : 'Filmes'"
          />
        </li>

        <!-- Card "Todos" — a seção inteira numa lista só, sem dividir por categoria. -->
        <li v-if="sectionDef.type !== 'live'" class="min-w-0">
          <CategoryCard
            data-category-card
            :category="allCategory"
            :to="`/browse/${section}/${ALL_CATEGORY_SLUG}`"
          />
        </li>

        <!-- Card "Favoritos" — só filmes/séries; sempre visível (vazio explica como favoritar). -->
        <li v-if="sectionDef.type !== 'live'" class="min-w-0">
          <NuxtLink
            data-category-card
            :to="`/browse/${section}/favoritos`"
            class="group relative block h-[6.5rem] w-[9.5rem] overflow-hidden rounded-lg border border-line/70 bg-surface transition-[transform,border-color] duration-normal hover:-translate-y-1 hover:border-blue-dark/70 hover:shadow-card focus-visible:shadow-focus sm:h-[9rem] sm:w-[11rem] md:h-[10.5rem] md:w-[12.5rem]"
            aria-label="Favoritos"
          >
            <div class="relative flex h-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#ffc94d]/20 to-blue/10 p-3 sm:gap-2 sm:p-4">
              <Icon name="material-symbols:star-rounded" class="h-8 w-8 text-[#ffc94d] sm:h-10 sm:w-10 md:h-12 md:w-12" aria-hidden="true" />
              <p class="text-center text-xs font-semibold text-ink sm:text-sm">Favoritos</p>
              <p class="text-center text-[0.62rem] text-ink-muted sm:text-[0.7rem]">{{ sectionDef.type === 'series' ? 'Suas séries marcadas' : 'Seus filmes marcados' }}</p>
            </div>
          </NuxtLink>
        </li>

        <!-- Card "Continuar assistindo" — só filmes/séries, só se houver progresso local. -->
        <li v-if="sectionDef.type !== 'live' && hasRecents" class="min-w-0">
          <NuxtLink
            data-category-card
            :to="`/browse/${section}/${RECENTS_SLUG}`"
            class="group relative block h-[6.5rem] w-[9.5rem] overflow-hidden rounded-lg border border-line/70 bg-surface transition-[transform,border-color] duration-normal hover:-translate-y-1 hover:border-blue-dark/70 hover:shadow-card focus-visible:shadow-focus sm:h-[9rem] sm:w-[11rem] md:h-[10.5rem] md:w-[12.5rem]"
            aria-label="Continuar assistindo"
          >
            <div class="relative flex h-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-blue-dark/40 to-blue/10 p-3 sm:gap-2 sm:p-4">
              <Icon name="material-symbols:history-rounded" class="h-8 w-8 text-blue-light sm:h-10 sm:w-10 md:h-12 md:w-12" aria-hidden="true" />
              <p class="text-center text-xs font-semibold text-ink sm:text-sm">Continuar assistindo</p>
              <p class="text-center text-[0.62rem] text-ink-muted sm:text-[0.7rem]">Filmes e séries recentes</p>
            </div>
          </NuxtLink>
        </li>

        <li v-for="category in sectionCategories" :key="category.id" class="min-w-0">
          <CategoryCard
            data-category-card
            :category="category"
            :to="`/browse/${section}/${category.slug}`"
          />
        </li>
      </ul>

      <button
        v-show="canScrollLeft"
        type="button"
        class="rail-arrow left-0"
        aria-label="Categorias anteriores"
        @click="scrollByPage(-1)"
      >
        <Icon name="material-symbols:chevron-left-rounded" class="h-7 w-7" aria-hidden="true" />
      </button>
      <button
        v-show="canScrollRight"
        type="button"
        class="rail-arrow right-0"
        aria-label="Próximas categorias"
        @click="scrollByPage(1)"
      >
        <Icon name="material-symbols:chevron-right-rounded" class="h-7 w-7" aria-hidden="true" />
      </button>
    </div>

    <BrowseHighlights data-highlights :section="section" class="mt-5 lg:mt-6" />
  </div>
</template>

<script setup lang="ts">
import { SECTIONS, isSectionKey } from '~/constants';
import { ALL_CATEGORY_SLUG, categoryBelongsToSection } from '~/utils/categorySections';
import type { Category } from '~/types';
import { isAdultCategory } from '~/utils/adult';
import { pickSpatialBest } from '~/utils/spatial';
import { RECENTS_SLUG, hasRecentProgress } from '~/utils/recentlyWatched';

const route = useRoute();

/** Troca de seção (/browse/filmes → /browse/series) remonta a página com a seção nova.
 *  Só o caminho: `?full=1` (prévia da TV em tela cheia) não pode remontar a tela. */
definePageMeta({ key: (route) => route.path });

const sectionParam = String(route.params.section);
if (!isSectionKey(sectionParam)) {
  throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada', fatal: true });
}

const section = sectionParam;
const sectionDef = SECTIONS[section];

const categories = useCategories();

/** Categoria adulta fica oculta até o desbloqueio. */
const adultUnlocked = useState<boolean>('adult.unlocked', () => false);

/** Só as categorias que pertencem a esta seção (Filmes → filmes, Séries → séries, TV → ao vivo). */
const sectionCategories = computed(() =>
  categories.categories.value.filter(
    (category) =>
      categoryBelongsToSection(category, section) &&
      (adultUnlocked.value || !isAdultCategory(category.slug)),
  ),
);

/** Card "Todos": soma das categorias visíveis da seção (adulto fora até desbloquear). */
const allCategory = computed<Category>(() => ({
  id: '__todos__',
  name: section === 'series' ? 'Todas as séries' : 'Todos os filmes',
  slug: ALL_CATEGORY_SLUG,
  itemCount: sectionCategories.value.reduce((sum, category) => sum + category.itemCount, 0),
  type: sectionDef.type,
}));

/** Mostra o card "Continuar assistindo" só se houver progresso local (client-side). */
const hasRecents = ref(false);
onMounted(() => {
  hasRecents.value = hasRecentProgress();
});

useHead({ title: computed(() => `Pryma — ${sectionDef.label}`) });

/* ── Trilho horizontal ─────────────────────────────────────────────────── */

/** Fileiras do trilho (precisa bater com `grid-template-rows` no CSS abaixo). */
const ROWS = 2;

const root = ref<HTMLElement | null>(null);
const rail = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
let lastIndex = 0;
let focusedOnce = false;

function cards(): HTMLElement[] {
  return Array.from(rail.value?.querySelectorAll<HTMLElement>('[data-category-card]') ?? []);
}

function updateEdges(): void {
  const element = rail.value;
  if (!element) return;
  const max = element.scrollWidth - element.clientWidth;
  canScrollLeft.value = element.scrollLeft > 4;
  canScrollRight.value = element.scrollLeft < max - 4;
}

function scrollByPage(direction: 1 | -1): void {
  const element = rail.value;
  if (!element) return;
  element.scrollBy({ left: direction * element.clientWidth * 0.9, behavior: 'smooth' });
}

/** Roda do mouse vira rolagem lateral (o trilho é horizontal). */
function onWheel(event: WheelEvent): void {
  const element = rail.value;
  if (!element || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

  const max = element.scrollWidth - element.clientWidth;
  if (max <= 0) return;
  const atStart = element.scrollLeft <= 0 && event.deltaY < 0;
  const atEnd = element.scrollLeft >= max - 1 && event.deltaY > 0;
  if (atStart || atEnd) return;

  event.preventDefault();
  element.scrollLeft += event.deltaY;
}

/** Colunas visíveis do trilho (`--cols` no CSS: 2 em retrato, 5 em landscape). */
function visibleColumns(): number {
  const element = rail.value;
  if (!element) return 1;
  return Math.max(1, Number.parseInt(getComputedStyle(element).getPropertyValue('--cols'), 10) || 1);
}

/**
 * Trilho em páginas fixas (como a home): o foco anda pelos cards sem mexer na
 * tela e, ao passar da borda, o trilho salta uma página inteira de uma vez.
 * Antes cada seta rolava suave uma coluna — na TV a rolagem constante engasgava.
 */
function showPageOf(index: number): void {
  const element = rail.value;
  const list = cards();
  const card = list[index]?.closest('li');
  if (!element || !card) return;
  const box = element.getBoundingClientRect();
  const rect = card.getBoundingClientRect();
  if (rect.left >= box.left - 1 && rect.right <= box.right + 1) return;
  const cols = visibleColumns();
  const pageStart = Math.floor(Math.floor(index / ROWS) / cols) * cols * ROWS;
  const anchor = list[pageStart]?.closest('li');
  if (!anchor) return;
  const padding = Number.parseFloat(getComputedStyle(element).paddingLeft) || 0;
  const delta = anchor.getBoundingClientRect().left - element.getBoundingClientRect().left - padding;
  if (Math.abs(delta) > 1) element.scrollLeft += delta;
}

function focusCard(index: number): void {
  const target = cards()[index];
  if (!target) return;
  lastIndex = index;
  target.focus({ preventScroll: true });
  showPageOf(index);
  // Card no fim da página pode estar abaixo da dobra: só a rolagem vertical, sem animação.
  target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
}

function focusHighlights(): void {
  root.value
    ?.querySelector<HTMLElement>('[data-highlights] a, [data-highlights] button')
    ?.focus();
}

/** Navegação 2D por setas (teclado / controle remoto): ←→ colunas, ↑↓ fileiras e faixa inferior. */
function onKeydown(event: KeyboardEvent): void {
  const { key } = event;
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;

  // Vindo da faixa inferior: ↑ volta para o último card focado.
  if (target.closest('[data-highlights]')) {
    if (key === 'ArrowUp') {
      event.preventDefault();
      focusCard(lastIndex);
    }
    return;
  }

  const list = cards();
  const current = target.closest<HTMLElement>('[data-category-card]');
  const index = current ? list.indexOf(current) : -1;
  if (index < 0) return;

  let next = index;
  if (key === 'ArrowRight') next = Math.min(index + ROWS, list.length - 1);
  else if (key === 'ArrowLeft') next = index - ROWS;
  else if (key === 'ArrowUp') next = index % ROWS > 0 ? index - 1 : -1;
  else if (index % ROWS < ROWS - 1 && index + 1 < list.length) next = index + 1;
  else {
    event.preventDefault();
    lastIndex = index;
    focusHighlights();
    return;
  }

  // ↑ na fileira de cima: o motor global sobe pro header (sino, menu, logo).
  if (key === 'ArrowUp' && next < 0) return;
  event.preventDefault();
  if (next < 0 || next === index) return;
  focusCard(next);
}

function focusFirstCard(): void {
  if (focusedOnce || cards().length === 0) return;
  focusedOnce = true;
  cards()[0]?.focus({ preventScroll: true });
}

watch(
  () => sectionCategories.value.length,
  async () => {
    await nextTick();
    updateEdges();
    focusFirstCard();
  },
);

onMounted(() => {
  updateEdges();
  focusFirstCard();
  window.addEventListener('resize', updateEdges);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateEdges);
});
</script>

<style scoped>
/* 2 fileiras × N colunas; as colunas visíveis dependem da largura (cards grandes). */
.category-rail {
  --cols: 2;
  --gap: 0.875rem;
  display: grid;
  grid-template-rows: repeat(2, auto);
  grid-auto-flow: column;
  grid-auto-columns: calc((100% - (var(--cols) - 1) * var(--gap)) / var(--cols));
  gap: var(--gap);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  scroll-padding-inline: 0.75rem;
  /* Salto de página instantâneo (a rolagem suave é só das setas do mouse). */
  scroll-behavior: auto;
  scrollbar-width: none;
}

.category-rail::-webkit-scrollbar {
  display: none;
}

.category-rail > li {
  scroll-snap-align: start;
}

/* Landscape = canvas 1440×810 escalado: 5 colunas (o estado do notebook). */
@media (orientation: landscape) {
  .category-rail {
    --cols: 5;
    --gap: 1.5rem;
  }
}

.rail-arrow {
  position: absolute;
  top: 50%;
  z-index: 10;
  display: flex;
  height: 3rem;
  width: 3rem;
  transform: translateY(-50%);
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(2, 8, 23, 0.92);
  color: #fff;
  transition: background-color 160ms ease, border-color 160ms ease;
}

.rail-arrow:hover {
  border-color: var(--color-accent);
  background: rgba(10, 31, 69, 0.95);
}
</style>
