
<template>
  <aside class="pv rail-scroll min-h-0 flex-col gap-4 overflow-y-auto" aria-label="Canal selecionado">
    <template v-if="media">
      <!-- Prévia ao vivo — OK expande ESTE vídeo para a tela toda (mesma conexão,
           sem recarregar o stream). Vive em `?full=1`: o Voltar do controle fecha.
           <div role="button"> e não <button>: em tela cheia ele contém os botões do HUD. -->
      <div
        role="button"
        tabindex="0"
        class="pv-card pv-thumb group relative block aspect-video min-h-[6rem] w-full shrink overflow-hidden text-left focus:outline-none focus-visible:shadow-focus"
        :class="{ 'pv-thumb--full': expanded, 'pv-thumb--fill': expanded && fillScreen }"
        :aria-label="`Assistir ${media.title} em tela cheia`"
        data-nav="preview"
        @click="expand"
        @keydown.enter.prevent="expand"
        @pointermove.passive="expanded && pokeHud()"
      >
        <!-- v-show: os botões continuam no DOM quando o HUD some — o índice do foco sobrevive. -->
        <LiveFullscreenHud
          v-if="expanded"
          v-show="hudVisible"
          ref="fullHud"
          :media="media"
          :program-title="guide.current.value?.title ?? null"
          :variants="variants"
          :active-variant-id="activeVariantId"
          :fill-screen="fillScreen"
          :favorite="favorite"
          @back="collapse"
          @pick-variant="pickVariant"
          @toggle-fill="toggleFill"
          @toggle-favorite="toggleFavorite"
        />

        <!-- Carregamento enquanto não há vídeo -->
        <div
          v-if="!livePlaying"
          class="absolute inset-0 flex flex-col items-center justify-center gap-3"
          role="status"
          aria-live="polite"
        >
          <span
            v-if="liveState !== 'failed'"
            class="h-9 w-9 animate-spin rounded-full border-[3px] border-white/15 border-t-blue"
            aria-hidden="true"
          />
          <Icon
            v-else
            name="material-symbols:signal-disconnected-rounded"
            class="h-9 w-9 text-ink-muted"
            aria-hidden="true"
          />
          <!-- Failover: "Reconectando…" / "Trocando de fonte (2/4)…" no lugar do carregando. -->
          <span class="text-sm font-medium text-ink-muted">
            {{ liveState === 'failed' ? 'Sem sinal no momento' : (liveNotice ?? 'Carregando...') }}
          </span>
        </div>

        <!-- Prévia do canal -->
        <video
          ref="videoEl"
          :poster="BLANK_POSTER"
          class="pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-slow"
          :class="livePlaying ? 'opacity-100' : 'opacity-0'"
          muted
          playsinline
          disablepictureinpicture
          tabindex="-1"
          aria-hidden="true"
          @playing="onLivePlaying"
          @timeupdate="onLiveTimeUpdate"
          @error="onLiveError"
        />

        <!-- Diagnóstico apenas em desenvolvimento -->
        <span
          v-if="isDev"
          class="absolute left-3 top-3 z-10 rounded bg-black/80 px-2 py-1 text-[0.65rem] text-ink-muted"
        >
          prévia: {{ liveState }}{{ liveReason ? ` — ${liveReason}` : '' }}
        </span>

        <!-- Selo ao vivo -->
        <span
          v-if="media.isLive && !expanded"
          class="absolute bottom-3 left-3 z-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/85 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-wide text-ink"
        >
          <span
            class="live-dot h-2 w-2 rounded-full bg-[#ff4d4d]"
            aria-hidden="true"
          />
          Ao vivo
        </span>

        <!-- Qualidade do canal -->
        <span
          v-if="badge && !expanded"
          class="absolute bottom-3 right-3 z-10 rounded-md border border-white/15 bg-black/85 px-2.5 py-1 text-[0.72rem] font-semibold tracking-wide text-ink"
        >
          {{ badge }}
        </span>
      </div>

      <!-- Versões do canal (FHD/HD/SD/H265): trocam a prévia; OK na prévia abre a escolhida. -->
      <div
        v-if="variants.length"
        class="flex shrink-0 flex-wrap gap-2"
        role="group"
        aria-label="Qualidade da transmissão"
      >
        <button
          v-for="variant in variants"
          :key="variant.media.id"
          type="button"
          class="quality-chip inline-flex h-10 min-w-[4.5rem] items-center justify-center rounded-full border px-4 text-[0.85rem] font-semibold tracking-wide transition-colors duration-fast focus:outline-none focus-visible:shadow-focus"
          :class="
            variant.media.id === activeVariantId
              ? 'border-transparent bg-blue-dark text-ink shadow-[0_0_14px_rgba(22,136,255,0.45)]'
              : 'border-line bg-elevated/70 text-ink-muted hover:border-blue/50 hover:text-ink'
          "
          :aria-pressed="variant.media.id === activeVariantId"
          data-nav="quality"
          @click="pickVariant(variant.media)"
        >
          {{ variant.label }}
        </button>
      </div>

      <!-- Canal + programa atual -->
      <section class="pv-card pv-info shrink-0 p-4 lg:p-5">
        <div class="flex items-center gap-4">
          <span
            class="hidden h-12 w-[4.5rem] shrink-0 items-center justify-center lg:flex"
            aria-hidden="true"
          >
            <img
              v-if="media.logoUrl && !logoFailed"
              :src="media.logoUrl"
              alt=""
              class="max-h-full max-w-full object-contain"
              @error="logoFailed = true"
            />
            <span v-else class="text-xl font-bold text-ink">
              {{ initials }}
            </span>
          </span>

          <span
            class="hidden h-9 w-px shrink-0 bg-white/12 lg:block"
            aria-hidden="true"
          />

          <div class="min-w-0">
            <p
              class="truncate text-[1.05rem] font-semibold uppercase leading-tight text-ink lg:text-[1.15rem]"
            >
              {{ media.title }}
            </p>
            <p class="mt-0.5 truncate text-[0.9rem] text-ink-muted">
              {{ media.categoryName ?? 'Ao vivo' }}
            </p>
          </div>
        </div>

        <!-- Programa atual -->
        <template v-if="guide.current.value">
          <div class="mt-4 flex items-center gap-4">
            <div
              class="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
              aria-hidden="true"
            >
              <div
                class="h-full rounded-full bg-gradient-to-r from-[#4d6bff] to-[#7c5cff]"
                :style="{
                  width: `${Math.round(guide.progress.value * 100)}%`
                }"
              />
            </div>

            <div class="shrink-0 text-right leading-tight">
              <p class="text-[0.82rem] tabular-nums text-ink">
                {{ formatHourMinute(guide.current.value.start) }}
                —
                {{ formatHourMinute(guide.current.value.end) }}
              </p>
              <p class="text-[0.72rem] text-ink-muted">
                {{ guide.remainingMinutes.value }} min restantes
              </p>
            </div>
          </div>

          <p class="mt-3 text-[1.05rem] font-semibold text-ink">
            {{ guide.current.value.title }}
          </p>

          <p
            v-if="guide.current.value.description"
            class="mt-1 line-clamp-2 text-[0.9rem] leading-relaxed text-ink-muted"
          >
            {{ guide.current.value.description }}
          </p>
        </template>

        <!-- Ações -->
        <div class="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            class="inline-flex h-11 items-center gap-2 rounded-full bg-blue-dark px-3 text-sm font-semibold text-ink shadow-[0_0_18px_rgba(22,136,255,0.45)] transition-colors duration-fast hover:bg-blue focus:outline-none focus-visible:shadow-focus lg:px-6"
            data-nav="preview"
            @click="expand"
          >
            <Icon
              name="material-symbols:play-arrow-rounded"
              class="h-5 w-5"
              aria-hidden="true"
            />
            Assistir agora
          </button>

          <button
            type="button"
            class="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-elevated/70 px-5 text-sm font-medium text-ink transition-colors duration-fast hover:border-blue/50 hover:text-blue-light focus:outline-none focus-visible:shadow-focus"
            :aria-pressed="favorite"
            data-nav="preview"
            @click="toggleFavorite"
          >
            <Icon
              :name="
                favorite
                  ? 'material-symbols:star-rounded'
                  : 'material-symbols:star-outline-rounded'
              "
              class="h-5 w-5"
              :class="favorite ? 'text-[#ffc94d]' : ''"
              aria-hidden="true"
            />
            {{ favorite ? 'Nos favoritos' : 'Favoritar' }}
          </button>
        </div>
      </section>

      <!-- Programação -->
      <section
        class="pv-card pv-guide flex min-h-[8rem] flex-1 shrink-0 flex-col p-4 focus:outline-none focus-visible:shadow-focus lg:p-5"
        aria-labelledby="live-guide-heading"
        tabindex="0"
        data-nav="preview"
        @keydown="onGuideKey"
      >
        <div class="flex shrink-0 items-center gap-3">
          <Icon
            name="material-symbols:calendar-month-outline-rounded"
            class="h-6 w-6 text-ink-muted"
            aria-hidden="true"
          />

          <h2
            id="live-guide-heading"
            class="flex-1 text-[1.05rem] font-medium text-ink"
          >
            Programação
          </h2>

          <Icon
            name="material-symbols:chevron-right-rounded"
            class="h-6 w-6 text-ink-muted"
            aria-hidden="true"
          />
        </div>

        <ul
          v-if="guide.schedule.value.length"
          ref="guideList"
          class="rail-scroll mt-3 min-h-0 flex-1 overflow-y-auto"
        >
          <li
            v-for="(program, position) in guide.schedule.value"
            :key="`${program.start}-${program.title}`"
            class="flex items-center gap-4 rounded-lg px-3 py-3 text-[0.95rem]"
            :class="
              position === 0 && guide.current.value
                ? 'bg-gradient-to-r from-[#1c3fb8]/70 to-[#2b3fd0]/55 text-ink'
                : 'border-t border-white/8 text-ink first:border-t-0'
            "
          >
            <span
              class="w-12 shrink-0 tabular-nums"
              :class="
                position === 0 && guide.current.value
                  ? 'text-ink'
                  : 'text-ink-muted'
              "
            >
              {{ formatHourMinute(program.start) }}
            </span>

            <span class="min-w-0 flex-1 truncate font-medium">
              {{ program.title }}
            </span>

            <span
              v-if="position === 0 && guide.current.value"
              class="inline-flex shrink-0 items-center gap-1.5 text-[0.72rem] font-medium uppercase tracking-wide"
            >
              <span
                class="live-dot h-1.5 w-1.5 rounded-full bg-[#ff4d4d]"
                aria-hidden="true"
              />
              Ao vivo
            </span>
          </li>
        </ul>

        <p
          v-else
          class="mt-4 text-[0.9rem] leading-relaxed text-ink-muted"
        >
          A programação deste canal ainda não está disponível.
        </p>
      </section>
    </template>

    <!-- Nenhum canal escolhido: mesma estrutura, vazia (nada focável, nada carrega). -->
    <LivePreviewPlaceholder v-else />
  </aside>
</template>

<script setup lang="ts">
import { BLANK_POSTER } from '~/constants';
import { directionOf, isBackKey, isOkKey } from '~/utils/remoteKeys';
import { useChannelGuide } from '~/composables/useChannelGuide';
import { useLivePreview } from '~/composables/useLivePreview';
import { usePreferencesStore } from '~/stores/preferences';
import {
  channelInitials,
  formatHourMinute,
  qualityBadge,
} from '~/utils/live';
import type { MediaSummary } from '~/types';

const props = defineProps<{
  media: MediaSummary | null;
  /** Slug da categoria do canal. */
  categorySlug?: string | null;
  /** Pausa a prévia para evitar duas conexões simultâneas. */
  paused?: boolean;
}>();

const emit = defineEmits<{
  /** Escolheu outra versão (FHD/HD/SD…) do canal — o pai troca a seleção. */
  variant: [media: MediaSummary];
  /** Tela cheia: ↑/↓ pedem o canal de cima/de baixo da lista. */
  zap: [direction: 1 | -1];
  /** Saiu da tela cheia — o pai devolve o foco à linha do canal. */
  closed: [];
}>();

const preferences = usePreferencesStore();

// Versões do mesmo canal — busca com atraso: navegar a lista troca de canal a cada passo.
const { variants, groupItems } = useLiveQualityVariants(() => props.media, { delay: 350 });

/** Versão escolhida à mão nos chips — essa vale mais que a fonte lembrada. */
const pickedId = ref<string | null>(null);

function pickVariant(variant: MediaSummary): void {
  pickedId.value = variant.id;
  emit('variant', variant);
}

const guide = useChannelGuide(
  () => props.media?.id ?? null,
);

// Elemento de vídeo
const videoEl = ref<HTMLVideoElement | null>(null);

/* ── Tela cheia: a própria prévia ocupa a tela (sem abrir o player nem reconectar) ── */

const route = useRoute();
const router = useRouter();

const expanded = computed(() => route.query.full === '1' && props.media !== null);

function expand(): void {
  if (!props.media || expanded.value) return;
  void router.push({ query: { ...route.query, full: '1' } });
}

function collapse(): void {
  if (!expanded.value) return;
  if (window.history.state?.back) router.back();
  else void router.replace({ query: { ...route.query, full: undefined } });
}

defineExpose({ expand });

// Recarregou com `?full=1`: abre a tela normal (a tela cheia só abre por ação).
onMounted(() => {
  if (route.query.full === '1') void router.replace({ query: { ...route.query, full: undefined } });
});

const { hudVisible, pokeHud } = useAutoHideHud(() => true);

/* ── HUD da tela cheia ── */

const fullHud = ref<{ $el: HTMLElement } | null>(null);
/** Botão do HUD em foco (índice entre os `[data-full-ctl]`) — sobrevive ao HUD sumir. */
const hudIndex = ref(1);

function hudControls(): HTMLElement[] {
  return Array.from(fullHud.value?.$el.querySelectorAll<HTMLElement>('[data-full-ctl]') ?? []);
}

function focusControl(index: number): void {
  const controls = hudControls();
  if (controls.length === 0) return;
  hudIndex.value = Math.min(Math.max(index, 0), controls.length - 1);
  controls[hudIndex.value].focus({ preventScroll: true });
}

const { fillScreen, toggleFill } = usePlayerFill();

/**
 * Tela cheia (captura, antes da lista por trás e do motor espacial):
 *  - Voltar/Esc fecha;
 *  - ↑/↓ trocam para o canal de cima/de baixo da lista;
 *  - com o HUD escondido, a 1ª tecla só mostra o HUD;
 *  - ←/→ andam entre os botões do HUD e OK aciona o botão em foco.
 */
function onFullKey(event: KeyboardEvent): void {
  if (!expanded.value) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  if (isBackKey(event)) {
    collapse();
    return;
  }

  const hidden = !hudVisible.value;
  pokeHud();

  const direction = directionOf(event);
  if (direction === 'up' || direction === 'down') {
    emit('zap', direction === 'up' ? -1 : 1);
    return;
  }

  void nextTick(() => {
    if (hidden) focusControl(hudIndex.value);
    else if (direction === 'left') focusControl(hudIndex.value - 1);
    else if (direction === 'right') focusControl(hudIndex.value + 1);
    else if (isOkKey(event)) hudControls()[hudIndex.value]?.click();
  });
}

watch(expanded, async (value) => {
  // Som só em tela cheia; a prévia na coluna continua muda.
  const video = videoEl.value;
  if (video) {
    video.muted = !value;
    if (value) void video.play().catch(() => undefined);
  }
  if (value) {
    pokeHud();
    window.addEventListener('keydown', onFullKey, true);
    await nextTick();
    // Começa no 1º botão depois do "Voltar" (OK sem querer não fecha a tela cheia).
    focusControl(1);
  } else {
    window.removeEventListener('keydown', onFullKey, true);
    emit('closed');
  }
});

onBeforeUnmount(() => window.removeEventListener('keydown', onFullKey, true));

// Diagnóstico
const isDev = import.meta.dev;

// Prévia ao vivo
const {
  playing: livePlaying,
  state: liveState,
  reason: liveReason,
  onPlaying: onLivePlaying,
  onTimeUpdate: onLiveTimeUpdate,
  onVideoError: onLiveError,
  notice: liveNotice,
  current: liveSource,
} = useLivePreview({
  videoEl,
  media: () => props.media,
  alternatives: groupItems,
  useRemembered: () => props.media?.id !== pickedId.value,
  enabled: () => !props.paused,
  muted: () => !expanded.value,
});

/** Chip aceso = versão tocando de fato (o failover pode ter trocado de versão). */
const activeVariantId = computed(() => liveSource.value?.mediaId ?? props.media?.id ?? null);

// Fundo animado parado enquanto a prévia toca — TV costuma ter um decodificador só.
useSuspendBackgroundMotion(() => !props.paused && props.media !== null);

// Lista da programação: ↑↓ rolam a lista antes de sair do card
const guideList = ref<HTMLElement | null>(null);

function onGuideKey(event: KeyboardEvent): void {
  const list = guideList.value;
  if (!list || event.target !== event.currentTarget) return;
  const down = event.key === 'ArrowDown';
  if (!down && event.key !== 'ArrowUp') return;
  const room = down
    ? list.scrollTop + list.clientHeight < list.scrollHeight - 1
    : list.scrollTop > 0;
  if (!room) return;
  event.preventDefault();
  event.stopPropagation();
  list.scrollBy({ top: down ? 60 : -60 });
}

// Logo do canal
const logoFailed = ref(false);

// Reseta o estado ao trocar de canal
watch(
  () => props.media?.id,
  () => {
    logoFailed.value = false;
  },
);

// Iniciais do canal
const initials = computed(() =>
  channelInitials(props.media?.title ?? ''),
);

// Qualidade
const badge = computed(() =>
  qualityBadge(props.media?.quality),
);

// Favoritos
const favorite = computed(() =>
  props.media
    ? preferences.isFavorite(props.media.id)
    : false,
);

function toggleFavorite(): void {
  if (props.media) {
    preferences.toggleFavorite(props.media.id, props.media);
  }
}
</script>

<style scoped>
.pv-guide:focus-visible {
  border-color: rgba(124, 154, 255, 0.7);
}

.pv-thumb video {
  object-fit: cover;
}

/* Prévia expandida: cobre a tela inteira (acima do header) com o mesmo <video>. */
.pv-thumb--full {
  position: fixed;
  inset: 0;
  z-index: 150;
  width: 100vw;
  height: 100%;
  min-height: 0;
  aspect-ratio: auto;
  padding-top: 0;
  border: 0;
  border-radius: 0;
  background: #000;
  cursor: default;
}

.pv-thumb--full video {
  object-fit: contain;
}

.pv-thumb--fill video {
  object-fit: fill;
}

.pv-thumb--full:focus-visible {
  box-shadow: none;
}

.pv-thumb:focus-visible {
  border-radius: var(--radius-lg);
}
</style>
