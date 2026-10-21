<template>
  <div class="absolute inset-0 z-20 select-none">
    <!-- Topo: sair + chips de qualidade/legendas/velocidade/fullscreen -->
    <header
      class="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 sm:px-8"
      :class="barGradient"
    >
      <button
        type="button"
        class="group inline-flex items-center gap-2 rounded-full py-1.5 pr-4 text-sm font-medium text-white/85 transition hover:text-white"
        :aria-label="isFullscreen ? 'Sair da tela cheia' : 'Voltar'"
        @click="handleBackClick"
      >
        <span
          class="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/75 transition group-hover:border-white/40 group-hover:bg-white/10"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </span>
        <span class="hidden sm:inline">{{ isFullscreen ? 'Sair da tela cheia' : 'Voltar' }}</span>
      </button>

      <div class="flex items-center gap-2">
        <span
          v-if="quality"
          class="rounded-md border border-white/20 bg-black/80 px-2.5 py-1.5 text-xs font-bold tracking-wide text-white/90"
        >
          {{ quality }}
        </span>

        <button
          v-if="hasCaptions"
          type="button"
          class="h-9 rounded-md border px-2.5 text-xs font-bold transition"
          :class="captionsOn ? 'border-blue/70 bg-blue/25 text-white' : 'border-white/20 bg-black/80 text-white/85 hover:border-white/40'"
          :aria-pressed="captionsOn"
          aria-label="Legendas"
          @click="$emit('toggle-captions')"
        >
          CC
        </button>

        <div ref="speedWrap" class="relative">
          <button
            type="button"
            class="h-9 min-w-11 rounded-md border border-white/20 bg-black/80 px-2.5 text-xs font-semibold text-white/85 transition hover:border-white/40"
            :aria-expanded="speedOpen"
            aria-label="Velocidade de reprodução"
            @click="speedOpen = !speedOpen"
          >
            {{ speed }}×
          </button>
          <ul
            v-if="speedOpen"
            class="absolute right-0 top-full z-10 mt-2 w-24 overflow-hidden rounded-lg border border-white/15 bg-[#06142d]/95 py-1 shadow-card"
            role="menu"
          >
            <li v-for="rate in SPEED_OPTIONS" :key="rate">
              <button
                type="button"
                class="flex w-full items-center justify-between px-3 py-2 text-sm text-white/85 transition hover:bg-white/10"
                :class="{ 'text-blue': rate === speed }"
                role="menuitem"
                @click="pickSpeed(rate)"
              >
                {{ rate }}×
                <svg v-if="rate === speed" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </button>
            </li>
          </ul>
        </div>

        <button
          type="button"
          class="grid h-9 w-9 place-items-center rounded-md border border-white/20 bg-black/80 text-white/85 transition hover:border-white/40"
          :aria-label="isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'"
          @click="$emit('toggle-fullscreen')"
        >
          <svg v-if="!isFullscreen" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Base: progresso + controles -->
    <footer class="absolute inset-x-0 bottom-0 px-5 pb-5 sm:px-8" :class="barGradient">
      <div class="mb-3 flex items-center gap-4">
        <span class="w-14 shrink-0 text-right text-xs tabular-nums text-white/80">{{ currentLabel }}</span>

        <div
          ref="track"
          class="group relative h-6 flex-1 cursor-pointer touch-none"
          role="slider"
          aria-label="Progresso da reprodução"
          :aria-valuemin="0"
          :aria-valuemax="Math.round(duration)"
          :aria-valuenow="Math.round(currentTime)"
          @pointerdown="startScrub"
          @pointermove="moveScrub"
          @pointerup="endScrub"
          @pointercancel="endScrub"
        >
          <div class="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/25 transition group-hover:h-2">
            <div class="absolute inset-y-0 left-0 rounded-full bg-white/35" :style="{ width: `${bufferedRatio * 100}%` }" />
          </div>
          <div
            class="absolute inset-y-0 left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-blue transition-[height] group-hover:h-2"
            :style="{ width: `${progressRatio * 100}%` }"
          />
          <div
            class="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue opacity-0 shadow-[0_0_10px_rgba(22,136,255,0.8)] transition-opacity group-hover:opacity-100"
            :style="{ left: `${progressRatio * 100}%` }"
          />
        </div>

        <span class="w-14 shrink-0 text-xs tabular-nums text-white/80">{{ durationLabel }}</span>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="grid h-14 w-14 place-items-center rounded-full border border-blue/60 bg-[#0b3a9c]/70 text-white shadow-[0_0_18px_rgba(22,136,255,0.45)] transition hover:border-blue hover:bg-[#0b3a9c]/90"
            :aria-label="playing ? 'Pausar' : 'Reproduzir'"
            @click="$emit('toggle-play')"
          >
            <svg v-if="playing" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 5.5A1.5 1.5 0 0 1 8.5 4h1A1.5 1.5 0 0 1 11 5.5v13A1.5 1.5 0 0 1 9.5 20h-1A1.5 1.5 0 0 1 7 18.5v-13Zm6 0A1.5 1.5 0 0 1 14.5 4h1A1.5 1.5 0 0 1 17 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-13Z" />
            </svg>
            <svg v-else class="ml-0.5 h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
            </svg>
          </button>

          <button
            type="button"
            class="relative grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/75 text-white/90 transition hover:border-white/45 hover:bg-white/10"
            aria-label="Voltar 10 segundos"
            @click="$emit('skip', -10)"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
            <span class="absolute text-[9px] font-bold leading-none">10</span>
          </button>

          <button
            type="button"
            class="relative grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/75 text-white/90 transition hover:border-white/45 hover:bg-white/10"
            aria-label="Avançar 10 segundos"
            @click="$emit('skip', 10)"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 4v5h-5" />
            </svg>
            <span class="absolute text-[9px] font-bold leading-none">10</span>
          </button>
        </div>

        <!-- Meio: variantes de qualidade da transmissão (FHD/HD/SD…) -->
        <div v-if="qualityOptions.length > 1" ref="qualityWrap" class="relative">
          <button
            type="button"
            class="flex h-10 min-w-14 items-center justify-center gap-1.5 rounded-md border border-white/20 bg-black/80 px-3 text-xs font-bold tracking-wide text-white/90 transition hover:border-white/40"
            :aria-expanded="qualityOpen"
            aria-label="Qualidade da transmissão"
            @click="qualityOpen = !qualityOpen"
          >
            {{ currentQualityLabel }}
            <svg
              class="h-3.5 w-3.5 transition-transform duration-200"
              :class="{ 'rotate-180': qualityOpen }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <ul
            v-if="qualityOpen"
            class="absolute bottom-full left-1/2 z-10 mb-2 w-28 -translate-x-1/2 overflow-hidden rounded-lg border border-white/15 bg-[#06142d]/95 py-1 shadow-card"
            role="menu"
            aria-label="Qualidades disponíveis"
          >
            <li v-for="option in qualityOptions" :key="option.slug">
              <button
                type="button"
                class="flex w-full items-center justify-between px-3 py-2 text-sm text-white/85 transition hover:bg-white/10"
                :class="{ 'text-blue': option.current }"
                role="menuitem"
                @click="pickQuality(option.slug)"
              >
                {{ option.label }}
                <svg v-if="option.current" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </button>
            </li>
          </ul>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="grid h-10 w-10 place-items-center rounded-full text-white/90 transition hover:bg-white/10"
            :aria-label="muted || volume === 0 ? 'Ativar som' : 'Silenciar'"
            @click="$emit('toggle-mute')"
          >
            <svg v-if="muted || volume === 0" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H2v6h4l5 4V5Z" />
              <path d="m22 9-6 6m0-6 6 6" />
            </svg>
            <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H2v6h4l5 4V5Z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
            </svg>
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="muted ? 0 : volume"
            class="h-1.5 w-24 cursor-pointer accent-blue"
            aria-label="Volume"
            @input="onVolumeInput"
          />

          <button
            v-if="hasCaptions"
            type="button"
            class="grid h-10 w-10 place-items-center rounded-full text-white/90 transition hover:bg-white/10"
            :class="{ 'text-blue': captionsOn }"
            aria-label="Legendas"
            @click="$emit('toggle-captions')"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2.5" />
              <path d="M10 10.5a2.5 2.5 0 1 0 0 3M17.5 10.5a2.5 2.5 0 1 0 0 3" />
            </svg>
          </button>

          <button
            type="button"
            class="grid h-10 w-10 place-items-center rounded-full text-white/90 transition hover:bg-white/10"
            :aria-label="isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'"
            @click="$emit('toggle-fullscreen')"
          >
            <svg v-if="!isFullscreen" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
            <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { formatDuration } from '~/utils/format';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export interface QualityOption {
  label: string;
  slug: string;
  current: boolean;
}

const emit = defineEmits<{
  back: [];
  'exit-fullscreen': [];
  'toggle-play': [];
  skip: [delta: number];
  'seek-ratio': [ratio: number];
  'set-volume': [volume: number];
  'toggle-mute': [];
  'set-speed': [rate: number];
  'toggle-captions': [];
  'toggle-fullscreen': [];
  'select-quality': [slug: string];
}>();

const props = withDefaults(
  defineProps<{
    playing: boolean;
    currentTime: number;
    duration: number;
    bufferedRatio: number;
    volume: number;
    muted: boolean;
    isFullscreen: boolean;
    speed: number;
    hasCaptions: boolean;
    captionsOn: boolean;
    quality: string | null;
    qualityOptions?: QualityOption[];
  }>(),
  { qualityOptions: () => [] },
);

const track = ref<HTMLElement | null>(null);
const speedWrap = ref<HTMLElement | null>(null);
const speedOpen = ref(false);
const qualityWrap = ref<HTMLElement | null>(null);
const qualityOpen = ref(false);
const scrubbing = ref(false);

const currentQualityLabel = computed(
  () => props.qualityOptions.find((option) => option.current)?.label ?? props.quality ?? 'SD',
);

const barGradient = 'bg-gradient-to-b from-black/70 via-black/25 to-transparent';

const progressRatio = computed(() => (props.duration > 0 ? Math.min(props.currentTime / props.duration, 1) : 0));
const currentLabel = computed(() => (props.currentTime > 0 ? formatDuration(props.currentTime) : '0:00'));
const durationLabel = computed(() => formatDuration(props.duration || null));

function ratioFromEvent(element: HTMLElement, event: PointerEvent): number {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0) return 0;
  return Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
}

function startScrub(event: PointerEvent): void {
  if (!track.value) return;
  scrubbing.value = true;
  track.value.setPointerCapture(event.pointerId);
  emitSeek(ratioFromEvent(track.value, event));
}

function moveScrub(event: PointerEvent): void {
  if (!scrubbing.value || !track.value) return;
  emitSeek(ratioFromEvent(track.value, event));
}

function endScrub(event: PointerEvent): void {
  if (!scrubbing.value) return;
  scrubbing.value = false;
  track.value?.releasePointerCapture(event.pointerId);
}

function emitSeek(ratio: number): void {
  emit('seek-ratio', ratio);
}

function handleBackClick(): void {
  if (props.isFullscreen) emit('exit-fullscreen');
  else emit('back');
}

function onVolumeInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value);
  if (props.muted && value > 0) emit('toggle-mute');
  emit('set-volume', value);
}

function pickSpeed(rate: number): void {
  emit('set-speed', rate);
  speedOpen.value = false;
}

function pickQuality(slug: string): void {
  qualityOpen.value = false;
  emit('select-quality', slug);
}

function onDocumentPointerDown(event: PointerEvent): void {
  const target = event.target as Node;
  if (speedOpen.value && speedWrap.value && !speedWrap.value.contains(target)) {
    speedOpen.value = false;
  }
  if (qualityOpen.value && qualityWrap.value && !qualityWrap.value.contains(target)) {
    qualityOpen.value = false;
  }
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown));
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown));
</script>
