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
        class="category-rail -mx-2 px-2 py-2"
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

        <!-- Card "Continuar assistindo" — só filmes/séries, só se houver progresso local. -->
        <li v-if="sectionDef.type !== 'live' && hasRecents" class="min-w-0">
          <NuxtLink
            data-category-card
            :to="`/browse/${section}/${RECENTS_SLUG}`"
            class="group relative block h-[6.5rem] w-[9.5rem] overflow-hidden rounded-lg border border-line/70 bg-surface transition-all duration-normal hover:-translate-y-1 hover:border-blue-dark/70 hover:shadow-card focus-visible:shadow-focus sm:h-[9rem] sm:w-[11rem] md:h-[10.5rem] md:w-[12.5rem]"
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
import { categoryBelongsToSection } from '~/utils/categorySections';
import { isAdultCategory } from '~/utils/adult';
import { pickSpatialBest } from '~/utils/spatial';
import { RECENTS_SLUG, hasRecentProgress } from '~/utils/recentlyWatched';

const route = useRoute();

/** Troca de seção (/browse/filmes → /browse/series) remonta a página com a seção nova. */
definePageMeta({ key: (route) => route.fullPath });

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
      categoryBelongsToSection(category.slug, section) &&
      (adultUnlocked.value || !isAdultCategory(category.slug)),
  ),
);

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

function focusCard(index: number, repeat = false): void {
  const target = cards()[index];
  if (!target) return;
  lastIndex = index;
  target.focus({ preventScroll: true });
  // Autorepeat do remote: rolagem instantânea (suave empilhada trava a TV).
  target.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: repeat ? 'auto' : 'smooth' });
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

  const repeat = event.repeat;

  // Vindo da faixa inferior: ↑ volta para o último card focado.
  if (target.closest('[data-highlights]')) {
    if (key === 'ArrowUp') {
      event.preventDefault();
      focusCard(lastIndex, repeat);
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

  event.preventDefault();
  if (next < 0 || next === index) return;
  focusCard(next, repeat);
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
  scroll-padding-inline: 0.5rem;
  scrollbar-width: none;
}

.category-rail::-webkit-scrollbar {
  display: none;
}

.category-rail > li {
  scroll-snap-align: start;
}

@media (min-width: 640px) {
  .category-rail {
    --cols: 3;
    --gap: 1rem;
  }
}

@media (min-width: 1024px) {
  .category-rail {
    --cols: 4;
    --gap: 1.25rem;
  }
}

@media (min-width: 1280px) {
  .category-rail {
    --cols: 5;
    --gap: 1.5rem;
  }
}

@media (min-width: 1800px) {
  .category-rail {
    --cols: 6;
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
