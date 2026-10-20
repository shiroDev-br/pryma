<template>
  <component
    :is="cardTag"
    v-bind="cardBind"
    class="nav-card group absolute left-1/2 top-1/2 block"
    :class="[
      depthClass,
      { 'max-sm:hidden': !isActive },
      // Cards distantes só em telas largas — em phone/tablet estouravam a borda.
      { 'max-lg:hidden': depth === 'far' },
    ]"
    :style="cardStyle"
    :aria-current="isActive ? 'true' : undefined"
    :aria-label="item.title"
    @click="onClick"
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
      class="absolute inset-0 overflow-hidden rounded-[var(--radius-lg)] border backdrop-blur-md transition-colors duration-normal"
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
      class="nav-card__body relative flex h-full flex-col items-center px-5 text-center"
      :class="isActive ? 'justify-center py-5 sm:py-6' : 'justify-end pb-5 pt-4'"
    >
      <!-- Ícone: ativo = traço grande sem caixa; inativo = medalhão redondo. -->
      <span
        v-if="isActive"
        class="flex h-[3.6rem] w-[3.6rem] shrink-0 items-center justify-center text-ink sm:h-[4.6rem] sm:w-[4.6rem]"
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
        class="flex h-[2.9rem] w-[2.9rem] shrink-0 items-center justify-center rounded-full border border-white/20 bg-[#050d1f]/80 text-ink backdrop-blur-sm"
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
            ? 'mt-2.5 text-[clamp(1.35rem,2.3vw,2.1rem)] leading-none tracking-[0.05em] text-ink sm:mt-4'
            : 'mt-3 text-[clamp(0.72rem,1vw,0.92rem)] leading-none tracking-[0.1em] text-ink'
        "
      >
        {{ item.title }}
      </span>

      <!-- Descrição -->
      <span
        class="transition-colors duration-fast"
        :class="
          isActive
            ? 'mt-2.5 max-w-[30ch] text-balance text-[clamp(0.78rem,0.95vw,0.9rem)] leading-snug text-ink sm:mt-4'
            : 'mt-2 line-clamp-3 max-w-[20ch] text-[clamp(0.6rem,0.75vw,0.7rem)] leading-snug text-ink-muted'
        "
      >
        {{ isActive ? (item.longDescription ?? item.description) : item.description }}
      </span>

      <!-- Meta — só card ativo (quando o dado existe). -->
      <span
        v-if="isActive && item.meta"
        class="mt-3 block text-[1.05rem] font-medium tabular-nums tracking-[0.1em] text-blue"
      >
        {{ item.meta }}
      </span>

      <!-- Indicador de entrada. -->
      <span
        class="flex shrink-0 items-center justify-center rounded-full border transition-colors duration-fast"
          :class="
            isActive
              ? 'mt-3.5 h-9 w-9 border-[#4d9dff]/70 bg-[#0b3a9c]/60 text-ink shadow-[0_0_16px_rgba(22,136,255,0.45)] group-hover:bg-[#0b5cff]/70 sm:mt-5 sm:h-10 sm:w-10'
              : 'mt-4 h-8 w-8 border-white/30 bg-black/25 text-ink group-hover:border-[#1688ff] group-hover:text-blue-light'
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
// NuxtLink é resolvido em compilação — import explícito pro `component :is` em runtime.
import { NuxtLink } from '#components';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import type { HomeMenuItem } from '~/composables/useHomeMenu';

const props = defineProps<{
  item: HomeMenuItem;
  /** Distância assinada em relação ao card ativo (0 = centro, ±1 = vizinho …). */
  offset: number;
  isActive: boolean;
}>();

const emit = defineEmits<{
  /** Pedido de ativação — o pai decide selecionar (lado) ou navegar (centro). */
  activate: [];
}>();

/** Link externo (ex.: Atualizações) abre no navegador do sistema. */
const isExternal = computed(() => Boolean(props.item.externalUrl));

/** Com link externo → âncora; com rota → link de navegação; sem rota → botão inerte. */
const cardTag = computed(() => {
  if (isExternal.value) return 'a';
  return props.item.to ? NuxtLink : 'button';
});

const cardBind = computed(() => {
  if (isExternal.value) {
    return { href: props.item.externalUrl, target: '_blank', rel: 'noopener noreferrer' };
  }
  return props.item.to ? { to: props.item.to } : { type: 'button' as const };
});

/** Bandas de profundidade — apenas offsets até ±2 são renderizados. */
const depth = computed(() => {
  const abs = Math.abs(props.offset);
  if (abs === 0) return 'active';
  if (abs === 1) return 'near';
  return 'far';
});

const depthClass = computed(() => ({
  'z-30': depth.value === 'active',
  'z-20': depth.value === 'near',
  'z-10': depth.value === 'far',
}));

/**
 * Posição horizontal do centro do card, derivada das larguras por profundidade
 * (--card-w-*) e do respiro entre cards (--card-gap) — definidas em main.css.
 */
const SHIFT: Record<string, string> = {
  active: '0px',
  near: '(var(--card-w-active) / 2 + var(--card-w-near) / 2 + var(--card-gap))',
  far: '(var(--card-w-active) / 2 + var(--card-w-near) + var(--card-w-far) / 2 + var(--card-gap) * 2)',
};

const cardStyle = computed<CSSProperties>(() => {
  const abs = Math.abs(props.offset);
  const sign = Math.sign(props.offset);

  const z = abs === 0 ? 0 : abs === 1 ? -40 : -110;
  // Borda voltada ao centro fica mais perto do olhar; a de fora recua (como na referência).
  const rotateY = abs === 0 ? 0 : sign * (abs === 1 ? 13 : 17);
  const brightness = abs === 0 ? 1 : abs === 1 ? 0.82 : 0.66;
  const shift = abs === 0 ? '0px' : `calc(${sign} * ${SHIFT[depth.value]})`;

  // Altura derivada da largura (no lugar de aspect-ratio — Chrome <88 da TV
  // ignora a propriedade e o card colapsa para a altura do conteúdo).
  const RATIO: Record<string, string> = { active: '1.14', near: '0.78', far: '0.72' };

  return {
    width: `var(--card-w-${depth.value})`,
    height: `calc(var(--card-w-${depth.value}) / ${RATIO[depth.value]})`,
    transform: `translate(-50%, -50%) translateX(${shift}) translateZ(${z}px) rotateY(${rotateY}deg)`,
    // Opacity (não filter:brightness): filtro por card re-rasteriza o conteúdo
    // a cada frame da transição 3D — em chip fraco a home travava ao trocar.
    opacity: brightness,
    willChange: 'transform',
  };
});

function onClick(event: MouseEvent): void {
  if (props.isActive) {
    // Link externo: abre no navegador do sistema (Fora do app).
    if (isExternal.value && props.item.externalUrl) {
      event.preventDefault();
      if (Capacitor.isNativePlatform()) {
        void Browser.open({ url: props.item.externalUrl });
      } else {
        window.open(props.item.externalUrl, '_blank', 'noopener');
      }
    }
    return;
  }
  event.preventDefault();
  emit('activate');
}
</script>

<style scoped>
.nav-card {
  transform-style: preserve-3d;
  /* Em CSS (não inline) para o media query de TV poder ajustar. */
  transition:
    transform var(--transition-slow),
    width var(--transition-slow),
    height var(--transition-slow),
    filter var(--transition-slow);
}

/* Celular deitado — card enxuto: padding e título menores pra não truncar. */
@media (max-height: 500px) {
  .nav-card__body {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .nav-card__title {
    font-size: clamp(1rem, 2.7vw, 1.2rem);
  }
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

/* Cards do carrossel giram em 3D — backdrop-filter e filter:blur re-rasterizam
   o fundo a cada frame da animação. Vidro vira fundo sólido em todos os
   tamanhos (não só na TV: o modo compat da TV tem viewport estreito). */
.nav-card .backdrop-blur-md {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
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
