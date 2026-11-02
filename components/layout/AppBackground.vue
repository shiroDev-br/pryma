<template>
  <!-- Camada própria (`app-bg`): o fundo é caro de pintar (máscara, filtro,
       multiply, ruído) e é estático — isolado, a animação dos cards por cima
       não obriga a repintá-lo a cada quadro. -->
  <div class="app-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg" aria-hidden="true">
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
        <!-- Tom noturno + dissolve para o escuro (esquerda e embaixo) com degradês
             comuns. Antes: filtro na foto, máscara dupla e mix-blend — cada um uma
             superfície de tela inteira na GPU; em TV/Fire Stick com pouca memória
             de vídeo a página parava de ser desenhada (só sobravam os ícones). -->
        <div class="mountain__tint absolute inset-0" />
        <div class="mountain__fade absolute inset-0" />
      </div>
    </template>

    <!-- Plano de fundo escolhido (times ou animado) — só existe depois da hidratação
         do cliente, então o SSR não emite a imagem e o browser baixa exatamente uma.
         `decoding="async"` mantém a pintura fora do caminho crítico. -->
    <template v-else-if="wallpaper">
      <img
        :key="posterSrc"
        :src="posterSrc"
        alt=""
        decoding="async"
        draggable="false"
        class="wallpaper absolute inset-0 h-full w-full object-cover"
        @error="onPosterError"
      />

      <!-- Animado: o pôster é o 1º quadro do vídeo, então a troca não pisca.
           Só entra quando começa a tocar; erro ou demora ficam no pôster. -->
      <video
        v-if="videoSrc"
        :key="videoSrc"
        ref="videoEl"
        :src="videoSrc"
        :poster="BLANK_POSTER"
        class="absolute inset-0 h-full w-full object-cover transition-opacity duration-slow"
        :class="videoPlaying ? 'opacity-100' : 'opacity-0'"
        muted
        loop
        autoplay
        playsinline
        disablepictureinpicture
        preload="auto"
        tabindex="-1"
        @canplay="onVideoCanPlay"
        @playing="onVideoPlaying"
        @timeupdate="onVideoTimeUpdate"
        @error="onVideoFailed('error')"
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
      class="absolute left-1/2 top-[48%] h-[52%] w-[85%] max-w-[65rem] -translate-x-1/2 -translate-y-1/2 opacity-70"
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


  </div>
</template>

<script setup lang="ts">
import { BLANK_POSTER } from '~/constants';
import { releaseVideo } from '~/utils/video';
import { Capacitor } from '@capacitor/core';
import { usePreferencesStore } from '~/stores/preferences';

const preferences = usePreferencesStore();
const { selectedId, selectedUrl, selectedMedia, resetMissing } = useBackgrounds();
const motionSuspended = useBackgroundMotionSuspended();
const apiBase = String(useRuntimeConfig().public.apiBaseUrl || '').replace(/\/+$/, '');

/** Sem quadro nenhum nesse prazo (TV fraca, rede lenta): desiste e fica no pôster. */
const VIDEO_START_TIMEOUT_MS = 20_000;

// O plano de fundo só é lido no cliente: evita mismatch de hidratação e o
// download duplo (SSR mandaria um default que seria trocado logo em seguida).
onMounted(() => {
  preferences.hydrateBackground();
  readEnvironment();
});

const wallpaper = computed(() => selectedUrl.value);

// ── Fundo animado ────────────────────────────────────────────────────────────
const videoEl = ref<HTMLVideoElement | null>(null);
const videoPlaying = ref(false);
/** Falhou (erro/timeout) para este wallpaper — não tenta de novo até trocar. */
const failedSrc = ref('');
const pageHidden = ref(false);
/** Preferências do sistema/rede, lidas uma vez no cliente. */
const env = reactive({ reducedMotion: false, saveData: false, hd: true });

function readEnvironment(): void {
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  env.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  env.saveData = connection?.saveData === true;
  // 1080p só no navegador com tela grande e rede boa. APK (TV/celular) usa o
  // 720p: metade do download e da decodificação — atrás do escurecimento do
  // fundo a diferença não aparece, e TV box fraca não engasga.
  const pixels = Math.max(window.innerHeight, window.innerWidth * (9 / 16)) * (window.devicePixelRatio || 1);
  env.hd =
    !Capacitor.isNativePlatform() && pixels > 800 && !/(^|-)([23])g$/.test(connection?.effectiveType ?? '');
}

const videoSrc = computed(() => {
  const media = selectedMedia.value;
  if (!media || !preferences.backgroundMotion) return '';
  if (env.reducedMotion || env.saveData || motionSuspended.value) return '';
  const src = env.hd ? media.video1080Url : media.video720Url;
  return src === failedSrc.value ? '' : src;
});

let startTimer: ReturnType<typeof setTimeout> | undefined;

// Antes do patch do DOM (flush 'pre'): o <video> atual ainda é o antigo — solta o
// decodificador dele já, senão a prévia ao vivo/trailer que pediu a pausa não abre.
watch(
  videoSrc,
  () => releaseVideo(videoEl.value),
  { flush: 'pre' },
);

watch(videoSrc, (src) => {
  videoPlaying.value = false;
  clearTimeout(startTimer);
  if (src) startTimer = setTimeout(() => onVideoFailed('timeout'), VIDEO_START_TIMEOUT_MS);
});

function onVideoPlaying(): void {
  clearTimeout(startTimer);
  videoPlaying.value = true;
}

/**
 * WebView de TV nem sempre dispara `playing` (ou ignora o `autoplay` de um
 * <video> inserido depois): o vídeo tocava invisível (opacity 0) e caía no
 * timeout. Qualquer avanço do tempo conta como tocando.
 */
function onVideoTimeUpdate(): void {
  if (!videoPlaying.value && (videoEl.value?.currentTime ?? 0) > 0) onVideoPlaying();
}

/** Pronto para tocar: garante mudo + play() explícito (não depende do atributo autoplay). */
function onVideoCanPlay(): void {
  const video = videoEl.value;
  if (!video || videoPlaying.value || pageHidden.value) return;
  video.muted = true;
  void video.play().catch(() => {});
}

function onVideoFailed(reason: 'error' | 'timeout'): void {
  clearTimeout(startTimer);
  if (videoPlaying.value) return;
  reportVideoFailure(reason);
  failedSrc.value = videoSrc.value;
}

/**
 * Diagnóstico: a falha vai para o log de acesso da API (`/health?bgfail=…`)
 * — é o único jeito de ver o motivo numa TV sem console. Uma vez por vídeo.
 */
function reportVideoFailure(reason: string): void {
  const video = videoEl.value;
  try {
    const params = new URLSearchParams({
      bgfail: reason,
      code: String(video?.error?.code ?? 0),
      rs: String(video?.readyState ?? -1),
      ns: String(video?.networkState ?? -1),
      file: videoSrc.value.split('/').slice(-2).join('/'),
      ua: navigator.userAgent.slice(0, 160),
    });
    void fetch(`${apiBase}/api/v1/health?${params}`, { mode: 'no-cors', keepalive: true }).catch(() => {});
  } catch {
    // Diagnóstico é descartável.
  }
}

/**
 * Pôster que falhou tenta de novo (rede ocupada logo depois do player, TV
 * acordando): antes qualquer erro apagava a escolha e o fundo sumia de vez.
 * Só volta ao Padrão quando a API confirma 404 (wallpaper excluído no painel).
 */
const POSTER_RETRY_MS = [1500, 4000, 10_000];
const posterAttempt = ref(0);
let posterTimer: ReturnType<typeof setTimeout> | undefined;

const posterSrc = computed(() => {
  const url = wallpaper.value;
  if (!url || posterAttempt.value === 0) return url;
  return `${url}${url.includes('?') ? '&' : '?'}retry=${posterAttempt.value}`;
});

watch(wallpaper, () => {
  clearTimeout(posterTimer);
  posterAttempt.value = 0;
});

async function onPosterError(): Promise<void> {
  const url = wallpaper.value;
  if (!url || !selectedMedia.value) return;
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (res.status === 404 && wallpaper.value === url) {
      resetMissing();
      return;
    }
  } catch {
    // Sem rede: tenta de novo abaixo.
  }
  const delay = POSTER_RETRY_MS[posterAttempt.value];
  if (delay === undefined || wallpaper.value !== url) return;
  clearTimeout(posterTimer);
  posterTimer = setTimeout(() => {
    if (wallpaper.value === url) posterAttempt.value += 1;
  }, delay);
}

// Aba/app em segundo plano: pausa o loop (bateria/CPU) e retoma ao voltar.
function onVisibility(): void {
  pageHidden.value = document.visibilityState === 'hidden';
  const video = videoEl.value;
  if (!video) return;
  if (pageHidden.value) video.pause();
  else void video.play().catch(() => {});
}

onMounted(() => document.addEventListener('visibilitychange', onVisibility));
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility);
  releaseVideo(videoEl.value);
  clearTimeout(startTimer);
  clearTimeout(posterTimer);
});

/** `none` = "Padrão": composição da montanha em vez de imagem em tela cheia. */
const isDefault = computed(() => selectedId.value === 'none');
</script>

<style scoped>
.app-bg {
  transform: translateZ(0);
  backface-visibility: hidden;
}

.mountain__img {
  object-position: 62% 18%;
}

/* Escurece e puxa a foto (de dia) para o crepúsculo — só camadas de cor, sem
   filter/mix-blend (cada um forçava uma superfície extra na GPU). */
.mountain__tint {
  background:
    linear-gradient(180deg, rgba(2, 8, 23, 0.6) 0%, rgba(2, 8, 23, 0.2) 40%, rgba(2, 8, 23, 0.45) 100%),
    linear-gradient(135deg, rgba(6, 16, 50, 0.62) 0%, rgba(14, 8, 38, 0.5) 100%);
}

/* A montanha "emerge" do fundo: em vez de máscara (transparência), degradês da
   cor do fundo por cima — mesmo resultado sobre o fundo escuro, sem máscara. */
.mountain__fade {
  background:
    linear-gradient(180deg, transparent 52%, var(--color-bg) 100%),
    linear-gradient(90deg, var(--color-bg) 0%, rgba(2, 8, 23, 0) 42%);
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
