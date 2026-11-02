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
      @keydown="onStageKeydown"
      @keyup="onStageKeyup"
      @focusout="onStageFocusout"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dragstart.prevent="noop"
      @click.capture="onClickCapture"
    >
      <!-- Palco plano e estático: cada posição (offset) é um card fixo — trocar
           de seleção só troca o conteúdo (nome, ícone, destino) de cada posição,
           sem deslizar nada. -->
      <div class="stage__viewport relative w-full" :style="viewportStyle" @scroll="unscroll">
        <div class="absolute inset-0" role="list">
          <NavigationCard
            v-for="entry in visibleEntries"
            :key="entry.offset"
            :item="entry.item"
            :offset="entry.offset"
            :is-active="entry.offset === 0"
            :metrics="metrics"
            :ref="(el) => setCardRef(entry.offset, el)"
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
  /** Cards visíveis de cada lado do central: 2 deitado (5 no palco), 1 em pé. */
  range: number;
  /** Centro vertical dos cards no palco (px) — abaixo do meio, pra mostrar o fundo. */
  centerY: number;
}

/** Centro vertical dos cards, em fração da altura do palco. */
const CENTER_Y = 0.76;

/** Card ativo: altura = largura / 1.14 × HEIGHT_SCALE (0.6, NavigationCard). */
const ACTIVE_H_PER_W = 0.6 / 1.14;
const CENTER_BOTTOM_GAP = 12;

/** Centro dos cards baixo, mas sem o card central passar do pé do palco. */
function centerYFor(stageH: number, activeW: number): number {
  const lowest = stageH - (activeW * ACTIVE_H_PER_W) / 2 - CENTER_BOTTOM_GAP;
  return Math.round(Math.min(stageH * CENTER_Y, lowest));
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/**
 * Em landscape o app é o canvas 1440×810 escalado (utils/viewportScale):
 * calculamos a geometria nas medidas "virtuais" desse canvas e multiplicamos
 * pela escala — o carrossel acompanha o rem e fica idêntico em qualquer TV.
 * Altura do palco = grade fixa da home (header 11% / barra 11%) × 0.9 de
 * respiro para o piso e os indicadores.
 */
function computeMetrics(w: number, h: number): HomeCarouselMetrics {
  const stageH = Math.round(h * (1 - 0.11 - 0.11) * 0.9);
  // Nenhum card pode ficar mais alto que o palco — senão vaza na barra.
  const fit = (width: number, ratio: number): number => Math.min(width, stageH * ratio);

  // Retrato (celular/tablet em pé): 5 cards precisam caber na largura.
  if (!isLandscape(w, h)) {
    const activeW = fit(clamp(0.31 * w, 210, 290), 1.14);
    return {
      activeW,
      nearW: fit(clamp(0.16 * w, 105, 145), 0.78),
      farW: fit(clamp(0.13 * w, 88, 118), 0.72),
      gap: clamp(0.011 * w, 6, 12),
      stageH,
      range: 1,
      centerY: centerYFor(stageH, activeW),
    };
  }

  const s = getViewportScale(w, h);
  const vw = w / s; // largura virtual (>= 1440; maior em telas mais largas que 16:9)
  const activeW = fit(clamp(0.24 * vw, 256, 416) * s, 1.14);
  return {
    activeW,
    nearW: fit(clamp(0.15 * vw, 152, 256) * s, 0.78),
    farW: fit(clamp(0.125 * vw, 136, 216) * s, 0.72),
    gap: clamp(0.012 * vw, 8, 24) * s,
    stageH,
    range: 2,
    centerY: centerYFor(stageH, activeW),
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

/* ── Cadência do controle remoto ───────────────────────────────────────── */

/**
 * Um aperto = um card. Segurar ←/→ NÃO gira o carrossel: só o primeiro
 * keydown de cada aperto anda; as repetições são ignoradas até soltar.
 *
 * "Segurada" não depende só de `event.repeat` — vários remotes de TV mandam
 * a tecla segurada como keydowns comuns em sequência (repeat sempre false,
 * às vezes com keyup entre eles). Por isso também conta como repetição:
 *  - keydown sem keyup desde o anterior (botão ainda pressionado);
 *  - keydown a menos de HOLD_GAP_MS do anterior (cadência de autorepeat).
 * Além disso, no máximo um passo por quadro pintado (nunca há fila de teclas).
 */
/** Keydowns mais próximos que isso são autorepeat, não um aperto novo. */
const HOLD_GAP_MS = 90;
/** `keyIsDown` só vale até isso sem keydown novo — TV que não manda keyup
 *  não pode travar o carrossel (cobre o atraso inicial do autorepeat). */
const KEY_DOWN_TTL_MS = 700;

/** Último keydown de ←/→ recebido (inclusive os ignorados). */
let lastKeyAt = -Infinity;
/** Botão ←/→ pressionado (keydown sem keyup ainda). */
let keyIsDown = false;
let framePending = false;
/** Passo dono do `framePending` — timeout atrasado não libera o passo seguinte. */
let stepToken = 0;

/** ←/→ — inclui nomes antigos e keyCode do D-pad Android (21/22). */
function stepOf(event: KeyboardEvent): 1 | -1 | 0 {
  const { key, keyCode } = event;
  if (key === 'ArrowRight' || key === 'Right' || keyCode === 22) return 1;
  if (key === 'ArrowLeft' || key === 'Left' || keyCode === 21) return -1;
  return 0;
}

function releaseFrame(token: number): void {
  if (token === stepToken) framePending = false;
}

function onStageKeydown(event: KeyboardEvent): void {
  const step = stepOf(event);
  if (step === 0) {
    onKeydown(event);
    return;
  }

  // Sempre consumida — senão a navegação espacial global move o foco sozinha.
  event.preventDefault();

  const now = performance.now();
  const sinceLast = now - lastKeyAt;
  const held = event.repeat || sinceLast < HOLD_GAP_MS || (keyIsDown && sinceLast < KEY_DOWN_TTL_MS);
  lastKeyAt = now;
  keyIsDown = true;
  if (held || framePending) return;

  framePending = true;
  const token = ++stepToken;
  requestAnimationFrame(() => releaseFrame(token));
  // Rede de segurança: WebView que estrangula rAF não pode travar o carrossel.
  setTimeout(() => releaseFrame(token), 100);

  if (step > 0) next();
  else prev();
}

/** Soltou o botão: o próximo aperto anda de novo. */
function onStageKeyup(event: KeyboardEvent): void {
  if (stepOf(event) !== 0) keyIsDown = false;
}

/** Foco saiu do palco com o botão apertado (keyup não chega aqui). */
function onStageFocusout(event: FocusEvent): void {
  const next = event.relatedTarget as Node | null;
  if (!next || !stageEl.value?.contains(next)) keyIsDown = false;
}

/**
 * O palco nunca rola. WebView antiga ignora `focus({ preventScroll })`: ao
 * focar o card central ainda no meio do deslize, o navegador rolava o palco
 * (overflow hidden ainda rola por script/foco) e jogava todos os cards para
 * um lado, deixando o meio vazio. Qualquer rolagem é desfeita na hora.
 */
function unscroll(event: Event): void {
  const el = event.currentTarget as HTMLElement;
  if (el.scrollLeft !== 0) el.scrollLeft = 0;
  if (el.scrollTop !== 0) el.scrollTop = 0;
}

/** Desfaz rolagem que o foco tenha causado em qualquer ancestral do card. */
function resetAncestorScroll(node: Element): void {
  let el: Element | null = node.parentElement;
  while (el) {
    if (el.scrollLeft !== 0) el.scrollLeft = 0;
    el = el.parentElement;
  }
}

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
 *
 * Troca estática: cada card é chaveado pela POSIÇÃO (offset), não pelo item.
 * Ao navegar, os nós ficam parados no mesmo lugar e só recebem o item novo —
 * nenhuma transição de posição/tamanho dispara, o carrossel não "gira".
 */
const visibleEntries = computed(() => {
  const count = props.items.length;
  if (count === 0) return [];

  const reach = metrics.value.range;

  // Listas curtas (menos itens que a janela): cada índice fica no offset mais
  // perto do centro — sem card duplicado.
  const offsetByIndex = new Map<number, number>();
  for (let distance = 0; distance <= reach; distance += 1) {
    for (const offset of distance === 0 ? [0] : [-distance, distance]) {
      const index = (((activeIndex.value + offset) % count) + count) % count;
      if (!offsetByIndex.has(index)) offsetByIndex.set(index, offset);
    }
  }

  return [...offsetByIndex.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([index, offset]) => ({
      item: props.items[index],
      index,
      offset,
    }));
});

/** Cards por posição (offset) — o central é sempre o offset 0. */
const cardEls = new Map<number, unknown>();

function setCardRef(offset: number, el: unknown): void {
  if (el) cardEls.set(offset, el);
  else cardEls.delete(offset);
}

function resolveNode(offset: number): Element | null {
  const component = cardEls.get(offset) as { $el?: Element } | null;
  const node = component?.$el;
  // `HTMLElement` não existe no SSR — checar apenas a presença do nó.
  return node ?? null;
}

function focusCard(): void {
  if (!import.meta.client) return;
  const node = resolveNode(0);
  if (!(node instanceof HTMLElement)) return;
  node.focus({ preventScroll: true });
  resetAncestorScroll(node);
}

// Toda mudança de seleção atualiza a barra contextual e move o foco real
// para o card central (essencial para navegação por controle remoto).
watch(
  activeIndex,
  (index) => {
    const item = props.items[index];
    if (item) emit('change', item);
    void nextTick(() => focusCard());
  },
  { immediate: true },
);

// Seleção inicial só pode receber foco depois da montagem dos cards.
onMounted(() => {
  // Sempre reseta pro meio (TV ao Vivo) ao montar a home
  const middleIndex = Math.floor(props.items.length / 2);
  if (activeIndex.value !== middleIndex) {
    select(middleIndex);
  }
  void nextTick(() => focusCard());

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
  /* Contenção para performance */
  contain: layout paint;
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

</style>
