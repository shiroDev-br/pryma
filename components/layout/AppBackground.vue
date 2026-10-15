<template>
  <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg" aria-hidden="true">
    <!-- Base: preto profundo com grafite sutil no topo. -->
    <div class="bg-ambient absolute inset-0" />

    <!-- Padrão: a montanha ocupa o canto superior direito e se dissolve no escuro
         (esquerda e embaixo), como na referência. Não é a imagem esticada na tela. -->
    <template v-if="isDefault">
      <div class="mountain absolute inset-x-0 top-0 h-[74%]">
        <img
          :src="wallpaper"
          alt=""
          decoding="async"
          draggable="false"
          class="mountain__img h-full w-full object-cover"
        />
        <!-- Tom noturno: azul-marinho multiplicado sobre a foto + escurecimento do céu. -->
        <div class="mountain__tint absolute inset-0" />
      </div>
    </template>

    <!-- Plano de fundo escolhido (times) — só existe depois da hidratação do cliente,
         então o SSR não emite a imagem e o browser baixa exatamente uma.
         `decoding="async"` mantém a pintura fora do caminho crítico. -->
    <template v-else-if="wallpaper">
      <img
        :src="wallpaper"
        alt=""
        decoding="async"
        draggable="false"
        class="wallpaper absolute inset-0 h-full w-full object-cover"
      />

      <!-- Escurecimento sobre a imagem — header, conteúdo e bottom bar sempre legíveis. -->
      <div
        class="absolute inset-0"
        style="
          background:
            linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, transparent 18%),
            linear-gradient(0deg, rgba(0, 0, 0, 0.72) 0%, transparent 30%),
            rgba(0, 0, 0, 0.3);
        "
      />
    </template>

    <!-- Iluminação azul difusa atrás do palco central. -->
    <div
      class="absolute left-1/2 top-[48%] h-[52vh] w-[85vw] max-w-[1100px] -translate-x-1/2 -translate-y-1/2 opacity-70"
      style="
        background: radial-gradient(
          55% 50% at 50% 50%,
          rgba(11, 92, 255, 0.14) 0%,
          rgba(11, 92, 255, 0.05) 45%,
          transparent 72%
        );
      "
    />

    <!-- Vinheta nas extremidades. -->
    <div
      class="absolute inset-0"
      style="
        background: radial-gradient(
          120% 95% at 50% 50%,
          transparent 55%,
          rgba(0, 0, 0, 0.55) 100%
        );
      "
    />

    <!-- Textura de ruído ultra discreta — profundidade sem poluição. -->
    <div class="absolute inset-0 bg-noise opacity-[0.025]" />
  </div>
</template>

<script setup lang="ts">
import { usePreferencesStore } from '~/stores/preferences';

const preferences = usePreferencesStore();
const { selectedId, selectedUrl } = useBackgrounds();

// O plano de fundo só é lido no cliente: evita mismatch de hidratação e o
// download duplo (SSR mandaria um default que seria trocado logo em seguida).
onMounted(() => preferences.hydrateBackground());

const wallpaper = computed(() => selectedUrl.value);

/** `none` = "Padrão": composição da montanha em vez de imagem em tela cheia. */
const isDefault = computed(() => selectedId.value === 'none');
</script>

<style scoped>
.bg-noise {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
}

/* Dissolve para o escuro à esquerda e embaixo — a montanha "emerge" do fundo. */
.mountain {
  -webkit-mask-image:
    linear-gradient(180deg, #000 0%, #000 52%, transparent 100%),
    linear-gradient(90deg, transparent 0%, #000 42%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(180deg, #000 0%, #000 52%, transparent 100%),
    linear-gradient(90deg, transparent 0%, #000 42%);
  mask-composite: intersect;
}

.mountain__img {
  object-position: 62% 18%;
  /* Escurece e dessatura: a foto original é de dia, a referência é crepúsculo. */
  filter: brightness(0.5) saturate(0.78) contrast(1.12);
}

.mountain__tint {
  background:
    linear-gradient(180deg, rgba(2, 8, 23, 0.55) 0%, rgba(2, 8, 23, 0.1) 40%, rgba(2, 8, 23, 0.35) 100%),
    linear-gradient(135deg, rgba(10, 24, 70, 0.55) 0%, rgba(24, 14, 60, 0.35) 100%);
  mix-blend-mode: multiply;
}

/* Entrada suave quando a imagem aparece (o `prefers-reduced-motion` do
   design system zera essa animação automaticamente). */
@keyframes wallpaper-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.wallpaper {
  animation: wallpaper-in 0.42s ease both;
}
</style>
