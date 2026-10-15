<template>
  <section class="relative" aria-label="Menu principal">
    <LoadingState v-if="isLoading" message="Carregando menu…" class="justify-center py-24" />

    <ErrorState
      v-else-if="error"
      class="mx-auto max-w-xl"
      title="Não foi possível carregar o menu"
      :message="error.message"
      :on-retry="onRetry"
    />

    <EmptyState
      v-else-if="items.length === 0"
      class="mx-auto max-w-xl"
      title="Nenhum destino disponível"
      description="Assim que o catálogo for atualizado, as opções aparecem aqui."
    />

    <div v-else class="stage relative flex flex-col items-center" @keydown="onKeydown">
      <div
        class="relative w-full"
        style="height: clamp(21rem, 52vh, 34rem); perspective: var(--carousel-perspective)"
      >
        <div class="absolute inset-0" style="transform-style: preserve-3d" role="list">
          <NavigationCard
            v-for="entry in visibleEntries"
            :key="entry.item.id"
            :item="entry.item"
            :offset="entry.offset"
            :is-active="entry.offset === 0"
            :ref="(el) => setCardRef(entry.index, el)"
            @activate="select(entry.index)"
          />
        </div>
      </div>

      <div class="home-carousel__hint" aria-hidden="true">
        <span class="home-carousel__line" />
        <span>Use <strong>← →</strong> para navegar</span>
        <span class="home-carousel__line" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { HomeMenuItem } from '~/composables/useHomeMenu';

const props = withDefaults(
  defineProps<{
    items: HomeMenuItem[];
    isLoading?: boolean;
    error?: Error | null;
    onRetry?: (() => void) | undefined;
  }>(),
  { isLoading: false, error: null, onRetry: undefined },
);

const OVERSCAN = 2;
const { activeIndex, onKeydown, select } = useCarouselNavigation({
  count: computed(() => props.items.length),
  wrap: true,
});

const visibleEntries = computed(() =>
  props.items
    .map((item, index) => ({ item, index, offset: index - activeIndex.value }))
    .filter((entry) => Math.abs(entry.offset) <= OVERSCAN),
);

const cardEls = new Map<number, unknown>();

function setCardRef(index: number, el: unknown): void {
  if (el) cardEls.set(index, el);
  else cardEls.delete(index);
}

function focusCard(index: number): void {
  if (!import.meta.client) return;
  const component = cardEls.get(index) as { $el?: Element } | null;
  const node = component?.$el;
  if (node instanceof HTMLElement) node.focus({ preventScroll: true });
}

watch(activeIndex, (index) => {
  void nextTick(() => focusCard(index));
}, { immediate: true });

onMounted(() => {
  void nextTick(() => focusCard(activeIndex.value));
});
</script>

<style scoped>
.home-carousel__hint {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: -0.5rem;
  color: rgba(190, 207, 233, .58);
  font-size: .66rem;
  font-weight: 600;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.home-carousel__hint strong {
  color: rgba(255,255,255,.9);
}

.home-carousel__line {
  width: clamp(2rem, 7vw, 6rem);
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(83, 157, 255, .55));
}

.home-carousel__line:last-child {
  background: linear-gradient(90deg, rgba(83, 157, 255, .55), transparent);
}
</style>
