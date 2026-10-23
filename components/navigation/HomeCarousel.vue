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
      ref="stageEl"
      class="stage relative flex flex-col items-center touch-pan-y"
      @keydown="onKeydown"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dragstart.prevent="noop"
      @click.capture="onClickCapture"
    >
      <!-- Piso iluminado — a lâmina azul sob os cards, como na referência. -->
      <div class="stage-floor pointer-events-none absolute inset-x-0 -bottom-4" aria-hidden="true" />

      <!-- Palco plano: os cards distribuem-se lateralmente (coverflow reto). -->
      <div class="stage__viewport relative w-full" :style="viewportStyle">
        <div class="absolute inset-0" role="list">
          <NavigationCard
            v-for="entry in visibleEntries"
            :key="entry.item.id"
            :item="entry.item"
            :offset="entry.offset"
            :is-active="entry.offset === 0"
            :metrics="metrics"
            :ref="(el) => setCardRef(entry.index, el)"
            @activate="select(entry.index)"
          />
        </div>
      </div>

      <!-- Indicadores — apoio à navegação (toque/teclado). -->
      <NavigationIndicators
        v-if="items.length > 1"
        class="stage__indicators"
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

/**
 * Geometria do palco em PIXELS, calculada no JS.
 * A TV antiga (WebView <79) não resolve `clamp()` nem `calc(var(...) / 2)` —
 * os cards ficavam empilhados no centro. Com px pronto, qualquer WebView
 * renderiza igual ao notebook.
 */
interface HomeCarouselMetrics {
  activeW: number;
  nearW: number;
  farW: number;
  gap: number;
  /** Altura do palco em px — usada no viewport e no limite dos cards. */
  stageH: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/**
 * Altura do palco: a mesma grade fixa da home (header 11% / barra 11%),
 * com 10% de respiro para o piso e os indicadores. Em telas baixas o
 * header/barra viram px (iguais aos do pages/index.vue).
 */
function computeStageHeight(h: number): number {
  if (h <= 500) {
    // Mesma troca do pages/index.vue: 4.75rem (header) + 4.5rem (barra).
    return Math.max(120, Math.round((h - 148) * 0.9));
  }
  return Math.round(h * (1 - 0.11 - 0.11) * 0.9);
}

function computeMetrics(w: number, h: number): HomeCarouselMetrics {
  const stageH = computeStageHeight(h);
  // Nenhum card pode ficar mais alto que o palco — senão vaza na barra.
  const fit = (width: number, ratio: number): number => Math.min(width, stageH * ratio);

  // Celular deitado — palco enxuto pra faixa inferior e os dots caberem.
  if (h <= 500 && w <= 900) {
    return {
      activeW: fit(clamp(0.21 * w, 136, 164), 1.14),
      nearW: fit(clamp(0.13 * w, 96, 112), 0.78),
      farW: fit(clamp(0.11 * w, 88, 104), 0.72),
      gap: clamp(0.01 * w, 6, 12),
      stageH,
    };
  }
  // TV em modo compat / tablet retrato — os 5 cards precisam caber na
  // largura (os 4 laterais somam ~0.69w + gaps, sobrando margem nas bordas).
  if (w <= 900) {
    return {
      activeW: fit(clamp(0.31 * w, 210, 290), 1.14),
      nearW: fit(clamp(0.16 * w, 105, 145), 0.78),
      farW: fit(clamp(0.13 * w, 88, 118), 0.72),
      gap: clamp(0.011 * w, 6, 12),
      stageH,
    };
  }
  return {
    activeW: fit(clamp(0.24 * w, 256, 416), 1.14),
    nearW: fit(clamp(0.15 * w, 152, 256), 0.78),
    farW: fit(clamp(0.125 * w, 136, 216), 0.72),
    gap: clamp(0.012 * w, 8, 24),
    stageH,
  };
}

const metrics = ref<HomeCarouselMetrics>(
  import.meta.client ? computeMetrics(window.innerWidth, window.innerHeight) : computeMetrics(1280, 720),
);

/** Altura aplicada no palco em px — sem `vh/clamp` na WebView antiga. */
const viewportStyle = computed(() => ({ height: `${metrics.value.stageH}px` }));

// Estado de seleção vive apenas no composable; o componente cuida do foco DOM.
// Wrap-around: navegação contínua, típica de interfaces de TV.
// Seleção inicial no card central (meio da lista — ex.: "Planos").
const { activeIndex, onKeydown, select, next, prev } = useCarouselNavigation({
  count: computed(() => props.items.length),
  initialIndex: Math.floor(props.items.length / 2),
  wrap: true,
});

/* ── Swipe (touch / mouse drag) — setas e dots continuam funcionando ────── */

const stageEl = ref<HTMLElement | null>(null);
/** Distância mínima em px para virar o card. */
const SWIPE_THRESHOLD = 48;
let swipeStartX = 0;
let swipeStartY = 0;
let swiping = false;
/** Evita que o click herdado do card ative logo após um arrasto. */
let suppressClick = false;

function onPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  swiping = true;
  suppressClick = false;
  swipeStartX = event.clientX;
  swipeStartY = event.clientY;
}

function onPointerMove(event: PointerEvent): void {
  if (!swiping) return;
  const dx = event.clientX - swipeStartX;
  const dy = event.clientY - swipeStartY;
  if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;

  suppressClick = true;
  swiping = false;
  if (dx < 0) next();
  else prev();
}

function onPointerUp(): void {
  swiping = false;
}

/** Drag nativo de link/arrasto emite pointercancel e mata o gesto — sempre bloqueado. */
function noop(): void {}

function onClickCapture(event: MouseEvent): void {
  if (!suppressClick) return;
  event.preventDefault();
  event.stopPropagation();
  suppressClick = false;
}

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

  const updateMetrics = (): void => {
    metrics.value = computeMetrics(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', updateMetrics);
  onBeforeUnmount(() => window.removeEventListener('resize', updateMetrics));
});
</script>

<style scoped>
.stage__viewport {
  /* A altura real vem do JS (metrics.stageH); este px é só o SSR. */
  height: 532px;
  /* hidden como base (Chrome <90 não tem `clip`); clip onde suportado. */
  overflow-x: hidden;
}

@supports (overflow: clip) {
  .stage__viewport {
    overflow-x: clip;
  }
}

/* Dots sobrepostos ao pé do palco — não empurram mais os cards pra cima. */
.stage__indicators {
  position: absolute;
  left: 50%;
  bottom: -1.1rem;
  z-index: 40;
  transform: translateX(-50%);
}

@media (max-height: 500px) {
  .stage__indicators {
    bottom: -0.35rem;
  }
}

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

/* TV (≥1600) — pool azul menos saturado: no tamanho de TV o alpha 0.38
   estourava o tom da marca (feedback de "cor fudida"). */
@media (min-width: 1600px) {
  .stage-floor {
    background: radial-gradient(
      50% 62% at 50% 28%,
      rgba(22, 136, 255, 0.26) 0%,
      rgba(11, 92, 255, 0.09) 45%,
      transparent 75%
    );
  }
}
</style>
