<template>
  <component
    :is="link.tag.value"
    v-bind="link.bind.value"
    class="nav-card group absolute left-1/2 top-1/2 block"
    :class="depthClass"
    :style="cardStyle"
    :aria-current="isActive ? 'true' : undefined"
    :aria-label="item.title"
    :aria-hidden="ghost ? 'true' : undefined"
    :tabindex="ghost ? -1 : undefined"
    @click="onClick"
    data-nav-card
  >
    <!-- Halo + borda em gradiente (só card ativo): azul elétrico → violeta. -->
    <span v-if="isActive" class="nav-card__glow pointer-events-none absolute" aria-hidden="true" />
    <span v-if="isActive" class="nav-card__ring pointer-events-none absolute" aria-hidden="true" />
    <!-- Reflexo no piso do palco. -->
    <span
      v-if="isActive"
      class="nav-card__reflection pointer-events-none absolute"
      aria-hidden="true"
    />

    <!-- Superfície em vidro com imagem de fundo. -->
    <span
      class="absolute inset-0 overflow-hidden rounded-[var(--radius-lg)] border transition-colors duration-normal"
      :class="
        isActive
          ? 'border-transparent bg-[linear-gradient(168deg,rgba(8,26,66,0.85)_0%,rgba(2,8,28,0.82)_100%)]'
          : 'border-white/[0.1] bg-[linear-gradient(168deg,rgba(10,22,48,0.5)_0%,rgba(2,6,18,0.7)_100%)] group-hover:border-blue-dark/50'
      "
      aria-hidden="true"
    >
      <!-- Imagem do card. -->
      <span
        v-if="item.image"
        class="absolute inset-0 bg-cover bg-center transition-opacity duration-normal"
        :class="isActive ? 'opacity-55' : 'opacity-45'"
        :style="{ backgroundImage: `url(${item.image})` }"
      />

      <!-- Scrim para legibilidade do conteúdo. -->
      <span
        class="absolute inset-0"
        :style="{
          background: isActive
            ? 'linear-gradient(180deg, rgba(2,8,28,0.35) 0%, rgba(2,8,28,0.7) 55%, rgba(2,8,28,0.88) 100%)'
            : 'linear-gradient(180deg, rgba(2,8,23,0.05) 0%, rgba(2,8,23,0.55) 52%, rgba(2,8,23,0.92) 100%)',
        }"
      />

      <!-- Brilho interno do card ativo. -->
      <span
        v-if="isActive"
        class="absolute inset-0"
        style="
          background:
            radial-gradient(85% 55% at 50% -8%, rgba(77, 157, 255, 0.28), transparent 60%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 40%);
        "
      />
    </span>

    <!-- Conteúdo -->
    <span
      class="nav-card__body relative flex h-full flex-col items-center text-center"
      :class="isActive ? 'justify-center px-5 py-3' : 'justify-center px-4 py-3'"
    >
      <!-- Ícone: ativo = traço grande sem caixa; inativo = medalhão redondo. -->
      <span
        v-if="isActive"
        class="flex h-[2.6rem] w-[2.6rem] shrink-0 items-center justify-center text-ink"
        aria-hidden="true"
      >
        <img
          v-if="item.logoUrl"
          :src="item.logoUrl"
          :alt="item.title"
          class="h-full w-full object-contain"
        />
        <AppIcon v-else :name="item.icon" class="h-full w-full" />
      </span>
      <span
        v-else
        class="flex h-[2.4rem] w-[2.4rem] shrink-0 items-center justify-center rounded-full border border-white/20 bg-[#050d1f]/80 text-ink"
        aria-hidden="true"
      >
        <img
          v-if="item.logoUrl"
          :src="item.logoUrl"
          :alt="item.title"
          class="h-[1.8rem] w-[1.8rem] object-contain"
        />
        <AppIcon v-else :name="item.icon" class="h-[1.4rem] w-[1.4rem]" />
      </span>

      <!-- Título -->
      <span
        v-if="!item.hideTitle"
        class="nav-card__title block max-w-full shrink-0 truncate font-semibold uppercase transition-colors duration-fast"
        :class="
          isActive
            ? 'mt-2 text-[1.6rem] leading-none tracking-[0.05em] text-ink'
            : 'mt-2.5 text-[0.85rem] leading-none tracking-[0.1em] text-ink'
        "
      >
        {{ item.title }}
      </span>

      <!-- Descrição — só no card ativo (os laterais, baixos, ficam em ícone + nome). -->
      <span
        v-if="isActive"
        class="mt-1.5 max-w-[30ch] truncate text-[0.75rem] leading-snug text-ink"
      >
        {{ item.longDescription ?? item.description }}
      </span>

      <!-- Meta — só card ativo (quando o dado existe). -->
      <span
        v-if="isActive && item.meta"
        class="mt-1.5 block text-[0.95rem] font-medium tabular-nums tracking-[0.1em] text-blue"
      >
        {{ item.meta }}
      </span>

      <!-- Indicador de entrada. -->
      <span
        class="flex shrink-0 items-center justify-center rounded-full border transition-colors duration-fast"
          :class="
            isActive
              ? 'mt-2.5 h-8 w-8 border-[#4d9dff]/70 bg-[#0b3a9c]/60 text-ink shadow-[0_0_16px_rgba(22,136,255,0.45)] group-hover:bg-[#0b5cff]/70'
              : 'mt-2.5 h-7 w-7 border-white/30 bg-black/25 text-ink group-hover:border-[#1688ff] group-hover:text-blue-light'
          "
        aria-hidden="true"
      >
        <Icon
          name="material-symbols:arrow-forward-rounded"
          :class="isActive ? 'h-5 w-5' : 'h-4 w-4'"
        />
      </span>
    </span>
  </component>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';
import type { HomeMenuItem } from '~/composables/useHomeMenu';

const props = defineProps<{
  item: HomeMenuItem;
  /** Distância assinada em relação ao card ativo (0 = centro, ±1 = vizinho …). */
  offset: number;
  isActive: boolean;
  /** Card de espera fora da borda (invisível, sem foco) — entra deslizando ao navegar. */
  ghost?: boolean;
  /** Geometria do palco em px (calculada no pai — WebView antiga não resolve clamp/calc+var). */
  metrics: { activeW: number; nearW: number; farW: number; gap: number; centerY: number };
}>();

const emit = defineEmits<{
  /** Pedido de ativação — o pai decide selecionar (lado) ou navegar (centro). */
  activate: [];
}>();

const link = useMenuItemLink(() => props.item);

type Depth = 'active' | 'near' | 'far';

/** Cards baixos (~1/2 da proporção original) — mais fundo à mostra. Mesmo valor em HomeCarousel (ACTIVE_H_PER_W). */
const HEIGHT_SCALE = 0.6;

/** Banda de profundidade de uma distância ao centro (o fantasma usa a do mais distante). */
function depthOf(abs: number): Depth {
  if (abs === 0) return 'active';
  if (abs === 1) return 'near';
  return 'far';
}

const depth = computed(() => depthOf(Math.abs(props.offset)));

const depthClass = computed(() => ({
  'z-30': depth.value === 'active',
  'z-20': depth.value === 'near',
  'z-10': depth.value === 'far' && !props.ghost,
  'pointer-events-none': props.ghost,
}));

/**
 * Posição horizontal do centro do card — tudo em px, vindo do `metrics` do
 * pai (WebView antiga de TV não resolve `clamp()` nem `calc(var() / 2)`,
 * o que deixava os cards empilhados no centro).
 */
const cardStyle = computed<CSSProperties>(() => {
  const abs = Math.abs(props.offset);
  const sign = Math.sign(props.offset);
  const m = props.metrics;

  const widthOf = (band: Depth): number => (band === 'active' ? m.activeW : band === 'near' ? m.nearW : m.farW);
  const width = widthOf(depth.value);

  // Altura derivada da largura (no lugar de aspect-ratio — Chrome <88 da TV
  // ignora a propriedade e o card colapsa para a altura do conteúdo).
  const RATIO: Record<string, number> = { active: 1.14, near: 0.78, far: 0.72 };
  const height = Math.round((width / RATIO[depth.value]) * HEIGHT_SCALE);

  // Deslocamento = metade do card ativo + respiro + (larguras dos cards
  // intermediários + respiros) + metade deste card. Sem isso, o card de
  // profundidade 2 ficava POR CIMA do de profundidade 1.
  let between = 0;
  for (let step = 1; step < abs; step += 1) between += widthOf(depthOf(step)) + m.gap;
  const shift = abs === 0 ? 0 : sign * (m.activeW / 2 + m.gap + between + width / 2);
  // Fantasma: opacidade 0 — acende durante o deslize de entrada.
  const brightness = props.ghost ? 0 : abs === 0 ? 1 : abs === 1 ? 0.82 : 0.66;

  // Faixa lateral plana (sem rotateY/translateZ): em TV em modo compat a
  // perspectiva 3D distorcia os cards — a referência dos notebooks é o
  // coverflow reto, deslizando no eixo X com wrap-around infinito.
  return {
    top: `${m.centerY}px`,
    width: `${Math.round(width)}px`,
    height: `${height}px`,
    transform: `translate(-50%, -50%) translateX(${Math.round(shift)}px)`,
    // Opacity (não filter:brightness): filtro por card re-rasteriza o conteúdo
    // a cada frame da transição — em chip fraco a home travava ao trocar.
    opacity: brightness,
    willChange: 'transform',
  };
});

function onClick(event: MouseEvent): void {
  if (props.isActive) {
    link.openExternal(event);
    return;
  }
  event.preventDefault();
  emit('activate');
}
</script>

<style scoped>
.nav-card {
  /* Faixa plana — só translateX/width/height/opacity (sem preserve-3d).
     Deslize próprio, mais curto que o `--transition-slow` geral: o carrossel
     acompanha toques rápidos do controle sem ficar para trás. */
  --nav-card-slide: 210ms cubic-bezier(0.22, 0.61, 0.36, 1);
  transition:
    transform var(--nav-card-slide),
    width var(--nav-card-slide),
    height var(--nav-card-slide),
    opacity var(--nav-card-slide);
  /* Contenção de layout/pintura. Sem content-visibility:auto: ela adiava o
     desenho do card que entra pela borda — ele "piscava" no meio do deslize. */
  contain: layout paint style;
}

/* Borda em gradiente (azul elétrico → violeta) — máscara recorta só o contorno. */
.nav-card__ring {
  inset: -2px;
  padding: 2.5px;
  border-radius: calc(var(--radius-lg) + 2px);
  background: linear-gradient(135deg, #4aa3ff 0%, #1b5cff 52%, #b06bff 100%);
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box exclude,
    linear-gradient(#000 0 0);
}

/* Halo azul difuso atrás do card — luz fixa. Animar box-shadow em loop
   repinta o palco inteiro em chip fraco (celular/TV compat travavam). */
.nav-card__glow {
  inset: 0;
  border-radius: var(--radius-lg);
  box-shadow:
    0 0 34px rgba(22, 136, 255, 0.45),
    0 0 100px rgba(11, 92, 255, 0.22);
}

/* Reflexo azul no piso, logo abaixo do card. */
.nav-card__reflection {
  left: 4%;
  right: 4%;
  top: calc(100% + 0.6rem);
  height: 34%;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  background: linear-gradient(
    180deg,
    rgba(34, 120, 255, 0.34) 0%,
    rgba(22, 80, 220, 0.12) 45%,
    transparent 100%
  );
}
</style>
