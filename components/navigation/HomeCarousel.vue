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

    <div
      v-else
      class="stage relative flex flex-col items-center"
      @keydown="onKeydown"
    >
      <!-- Piso iluminado — a lâmina azul sob os cards, como na referência. -->
      <div class="stage-floor pointer-events-none absolute inset-x-0 -bottom-4" aria-hidden="true" />

      <!-- Palco com perspectiva: os cards distribuem-se em profundidade. -->
      <div
        class="relative w-full"
        style="height: clamp(19rem, 44vh, 28rem); perspective: var(--carousel-perspective)"
      >
        <div
          class="absolute inset-0"
          style="transform-style: preserve-3d"
          role="list"
        >
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

      <!-- Indicadores — apoio à navegação (toque/teclado). -->
      <NavigationIndicators
        v-if="items.length > 1"
        class="mt-10"
        :count="items.length"
        :active-index="activeIndex"
        :label="'Destinos da home'"
        @select="select"
      />
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

/** Emitido quando a seleção muda — a página usa para a barra inferior. */
const emit = defineEmits<{
  change: [item: HomeMenuItem];
}>();

/** Distância máxima renderizada em cada lado (além do card central). */
const OVERSCAN = 2;

// Estado de seleção vive apenas no composable; o componente cuida do foco DOM.
// Wrap-around: navegação contínua, típica de interfaces de TV.
// Seleção inicial no card central (meio da lista — ex.: "Planos").
const { activeIndex, onKeydown, select } = useCarouselNavigation({
  count: computed(() => props.items.length),
  initialIndex: Math.floor(props.items.length / 2),
  wrap: true,
});

/**
 * Apenas os itens próximos da seleção são renderizados — contém o custo em listas grandes.
 * Índices enrolam nas pontas (roda infinita): no último card, o primeiro aparece à esquerda.
 */
const visibleEntries = computed(() => {
  const count = props.items.length;
  if (count === 0) return [];

  const seen = new Set<number>();
  const entries: { item: HomeMenuItem; index: number; offset: number }[] = [];

  for (let offset = -OVERSCAN; offset <= OVERSCAN; offset += 1) {
    const index = (((activeIndex.value + offset) % count) + count) % count;
    if (seen.has(index)) continue; // listas com menos itens que a janela — sem duplicar card
    seen.add(index);
    entries.push({ item: props.items[index], index, offset });
  }

  return entries;
});

const cardEls = new Map<number, unknown>();

function setCardRef(index: number, el: unknown): void {
  if (el) cardEls.set(index, el);
  else cardEls.delete(index);
}

function resolveNode(index: number): Element | null {
  const component = cardEls.get(index) as { $el?: Element } | null;
  const node = component?.$el;
  // `HTMLElement` não existe no SSR — checar apenas a presença do nó.
  return node ?? null;
}

function focusCard(index: number): void {
  if (!import.meta.client) return;
  const node = resolveNode(index);
  if (node instanceof HTMLElement) node.focus({ preventScroll: true });
}

// Toda mudança de seleção atualiza a barra contextual e move o foco real
// para o card central (essencial para navegação por controle remoto).
watch(
  activeIndex,
  (index) => {
    const item = props.items[index];
    if (item) emit('change', item);
    void nextTick(() => focusCard(index));
  },
  { immediate: true },
);

// Seleção inicial só pode receber foco depois da montagem dos cards.
onMounted(() => {
  void nextTick(() => focusCard(activeIndex.value));
});
</script>

<style scoped>
/* Luz refletida no chão do palco — pool azul difuso sob o card ativo. */
.stage-floor {
  width: min(74%, 58rem);
  height: 5.5rem;
  margin-inline: auto;
  background: radial-gradient(
    50% 62% at 50% 28%,
    rgba(22, 136, 255, 0.38) 0%,
    rgba(11, 92, 255, 0.13) 45%,
    transparent 75%
  );
  filter: blur(14px);
}

/* Linha de brilho focal — o reflexo nítido do anel no piso. */
.stage-floor::after {
  content: '';
  position: absolute;
  left: 20%;
  right: 20%;
  top: 32%;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(143, 205, 255, 0.7) 50%,
    transparent 100%
  );
  filter: blur(1px);
}
</style>
