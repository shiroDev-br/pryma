<template>
  <!-- Só no cliente: a decisão (já tocou nesta abertura?) depende do sessionStorage.
       Até montar, a capa do `html.intro-pending` (main.css) segura a tela. -->
  <Transition name="app-intro">
    <div
      v-if="visible"
      class="app-intro fixed inset-0 z-[200] bg-[#020817]"
      aria-hidden="true"
      @click="onPress"
    >
      <video
        ref="videoEl"
        :src="INTRO_SRC"
        :poster="BLANK_POSTER"
        class="h-full w-full object-cover transition-opacity duration-200"
        :class="started ? 'opacity-100' : 'opacity-0'"
        @playing="started = true"
        playsinline
        preload="auto"
        disablepictureinpicture
        @ended="finish"
        @error="finish"
      />

      <!-- Navegador bloqueou o som (sem toque prévio no site): 1º toque liga o som. -->
      <Transition name="app-intro">
        <div
          v-if="soundBlocked"
          class="pointer-events-none absolute bottom-[8%] left-1/2 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/20 bg-black/70 px-5 py-2.5 text-sm font-semibold text-white/90"
        >
          <Icon name="material-symbols:volume-up-rounded" class="h-5 w-5" />
          Aperte OK para ativar o som
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { BLANK_POSTER, STORAGE_KEYS } from '~/constants';
import { releaseVideo } from '~/utils/video';
import { useSuspendBackgroundMotion } from '~/composables/useBackgroundMotion';

/** Vinheta PRYMA (5 s, 1080p + áudio) — fonte em /Users/shiro/orca/pryma-intro (Remotion). */
const INTRO_SRC = '/intro/pryma-intro.mp4';
/** Rede lenta / vídeo que não toca: nunca prende o usuário na abertura. */
const MAX_MS = 8000;

const visible = ref(false);
/** Só mostra o <video> com quadro rodando — antes disso, o fundo escuro do overlay. */
const started = ref(false);
/** Autoplay com som foi recusado e a vinheta está tocando muda. */
const soundBlocked = ref(false);
const videoEl = ref<HTMLVideoElement | null>(null);
let guard: ReturnType<typeof setTimeout> | undefined;

// O fundo animado não decodifica junto com a vinheta (TV fraca).
useSuspendBackgroundMotion(() => visible.value);

function releaseCover(): void {
  document.documentElement.classList.remove('intro-pending');
}

function finish(): void {
  if (!visible.value) return;
  clearTimeout(guard);
  window.removeEventListener('keydown', onKey, true);
  // Solta o decodificador antes do fade: a home já vai abrir o fundo animado.
  releaseVideo(videoEl.value);
  visible.value = false;
  releaseCover();
}

/** Tocando mudo: o toque recomeça com som (é o gesto que o navegador exige). Senão, pula. */
function onPress(): void {
  const video = videoEl.value;
  if (soundBlocked.value && video) {
    soundBlocked.value = false;
    clearTimeout(guard);
    guard = setTimeout(finish, MAX_MS);
    video.currentTime = 0;
    video.muted = false;
    void video.play().catch(finish);
    return;
  }
  finish();
}

/** Qualquer tecla (OK, voltar, setas) age na vinheta — e não chega na navegação do app. */
function onKey(event: KeyboardEvent): void {
  event.preventDefault();
  event.stopImmediatePropagation();
  onPress();
}

async function play(): Promise<void> {
  const video = videoEl.value;
  if (!video) return;
  video.muted = false;
  try {
    await video.play();
  } catch {
    // Navegador bloqueou som sem gesto: toca mudo (o APK libera o som no MainActivity).
    video.muted = true;
    soundBlocked.value = true;
    await video.play().catch(finish);
  }
}

onMounted(async () => {
  let shown = false;
  try {
    shown = sessionStorage.getItem(STORAGE_KEYS.introShown) === '1';
    sessionStorage.setItem(STORAGE_KEYS.introShown, '1');
  } catch {
    /* storage bloqueado: toca mesmo assim */
  }
  const isAdmin = window.location.pathname.startsWith('/admin');
  if (shown || isAdmin) {
    releaseCover();
    return;
  }

  visible.value = true;
  window.addEventListener('keydown', onKey, true);
  guard = setTimeout(finish, MAX_MS);
  await nextTick();
  // A capa do html sai só quando o overlay já está na tela (sem piscar a página).
  releaseCover();
  await play();
});

onBeforeUnmount(() => {
  clearTimeout(guard);
  window.removeEventListener('keydown', onKey, true);
});
</script>

<style scoped>
.app-intro-leave-active {
  transition: opacity 0.35s ease;
}

.app-intro-leave-to {
  opacity: 0;
}
</style>
