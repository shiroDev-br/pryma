<template>
  <div class="tv-safe pb-28 pt-24">
    <header class="mb-8 space-y-1.5">
      <p class="kicker">Aparência</p>
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <h1 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Plano de fundo
        </h1>
        <div class="flex flex-wrap items-center gap-2">
          <!-- Desligado = o animado fica parado no pôster (TV fraca, bateria). -->
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-sm border px-4 py-2 text-sm transition-colors duration-fast"
            :class="
              preferences.backgroundMotion
                ? 'border-blue/60 bg-blue-dark/20 text-ink'
                : 'border-line bg-surface text-ink-muted hover:border-blue-dark hover:text-ink'
            "
            :aria-pressed="preferences.backgroundMotion"
            @click="preferences.setBackgroundMotion(!preferences.backgroundMotion)"
          >
            <Icon
              :name="preferences.backgroundMotion ? 'material-symbols:motion-play-outline-rounded' : 'material-symbols:motion-photos-paused-outline-rounded'"
              class="h-4 w-4"
              aria-hidden="true"
            />
            Fundo animado: {{ preferences.backgroundMotion ? 'ligado' : 'desligado' }}
          </button>
          <NuxtLink
            to="/"
            class="rounded-sm border border-line bg-surface px-4 py-2 text-sm text-ink transition-colors duration-fast hover:border-blue-dark hover:text-blue-light"
          >
            Tela inicial
          </NuxtLink>
        </div>
      </div>
      <p class="text-sm text-ink-muted">
        Toque numa arte para aplicar — a prévia já aparece atrás desta tela e a escolha fica salva neste dispositivo.
      </p>
    </header>

    <section v-if="backgrounds.options.length" aria-labelledby="bg-fixed" class="mb-10">
      <h2 id="bg-fixed" class="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink-muted">Fixos</h2>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <button
          v-for="item in backgrounds.options"
          :key="item.id"
          type="button"
          class="group relative overflow-hidden rounded-md border text-left transition-colors duration-fast"
          :class="
            isSelected(item.id)
              ? 'border-blue/70 shadow-focus'
              : 'border-line hover:border-blue-dark/60'
          "
          :aria-pressed="isSelected(item.id)"
          :aria-label="`Plano de fundo ${item.label}`"
          @click="backgrounds.select(item.id)"
        >
          <div class="ratio-16x9 relative aspect-video w-full overflow-hidden bg-surface">
            <img
              v-if="item.url"
              :src="item.url"
              :alt="`Prévia — ${item.label}`"
              width="480"
              height="270"
              loading="lazy"
              decoding="async"
              class="absolute inset-0 h-full w-full object-cover transition-transform duration-normal group-hover:scale-[1.03]"
            />
            <!-- Opção sem imagem: mesma base ambiente usada no AppBackground. -->
            <div v-else class="bg-ambient absolute inset-0" aria-hidden="true" />
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent"
              aria-hidden="true"
            />
            <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
              <span class="min-w-0 truncate text-sm font-bold uppercase tracking-[0.06em] text-ink">
                {{ item.label }}
              </span>
              <Icon
                v-if="isSelected(item.id)"
                name="material-symbols:check-circle"
                class="h-5 w-5 shrink-0 text-blue"
                aria-hidden="true"
              />
            </div>
          </div>
        </button>
      </div>
    </section>

    <p v-else class="text-sm text-ink-muted">Nenhum plano de fundo disponível.</p>

    <!-- Animados (API): só aparece quando há algum — no mock/sem login fica oculto. -->
    <section v-if="showAnimated" aria-labelledby="bg-animated">
      <h2 id="bg-animated" class="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink-muted">Animados</h2>

      <div v-if="categories.length > 1" class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Categorias">
        <button
          v-for="chip in categoryChips"
          :key="chip.value ?? 'all'"
          type="button"
          class="inline-flex h-9 items-center rounded-full border px-4 text-[0.85rem] font-semibold transition-colors duration-fast"
          :class="
            category === chip.value
              ? 'border-transparent bg-blue-dark text-ink'
              : 'border-line bg-elevated/70 text-ink-muted hover:border-blue/50 hover:text-ink'
          "
          :aria-pressed="category === chip.value"
          @click="category = chip.value"
        >
          {{ chip.label }}
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <button
          v-for="item in animated.items.value"
          :key="item.id"
          type="button"
          class="group relative overflow-hidden rounded-md border text-left transition-colors duration-fast"
          :class="
            isSelected(item.id)
              ? 'border-blue/70 shadow-focus'
              : 'border-line hover:border-blue-dark/60'
          "
          :aria-pressed="isSelected(item.id)"
          :aria-label="`Plano de fundo animado ${item.title}`"
          @click="backgrounds.selectRemote(item)"
          @mouseenter="previewId = item.id"
          @mouseleave="previewId = null"
          @focus="previewId = item.id"
          @blur="previewId = null"
        >
          <div class="ratio-16x9 relative aspect-video w-full overflow-hidden bg-surface">
            <img
              :src="item.thumbUrl"
              :alt="`Prévia — ${item.title}`"
              width="480"
              height="270"
              loading="lazy"
              decoding="async"
              class="absolute inset-0 h-full w-full object-cover"
            />
            <!-- Clipe de 3 s só no item focado — um vídeo por vez na grade. -->
            <video
              v-if="previewId === item.id && motionAllowed"
              data-bg-clip
              :src="item.previewUrl"
              :poster="BLANK_POSTER"
              class="absolute inset-0 h-full w-full object-cover"
              muted
              loop
              autoplay
              playsinline
              disablepictureinpicture
              tabindex="-1"
              aria-hidden="true"
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent"
              aria-hidden="true"
            />
            <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
              <span class="min-w-0 truncate text-sm font-bold uppercase tracking-[0.06em] text-ink">
                {{ shortTitle(item.title) }}
              </span>
              <Icon
                v-if="isSelected(item.id)"
                name="material-symbols:check-circle"
                class="h-5 w-5 shrink-0 text-blue"
                aria-hidden="true"
              />
            </div>
          </div>
        </button>
      </div>

      <p v-if="animated.status.value === 'error'" class="mt-4 text-sm text-ink-muted">
        Não foi possível carregar os fundos animados.
      </p>
      <div v-if="animated.hasNext.value || animated.isLoading.value" class="mt-6 flex justify-center">
        <button
          type="button"
          class="rounded-sm border border-line bg-surface px-5 py-2.5 text-sm text-ink transition-colors duration-fast hover:border-blue-dark hover:text-blue-light disabled:opacity-60"
          :disabled="animated.isLoading.value"
          @click="animated.loadMore()"
        >
          {{ animated.isLoading.value ? 'Carregando…' : 'Mostrar mais' }}
        </button>
      </div>
    </section>

    <BottomInfoBar
      title="Plano de fundo"
      subtitle="Vale para todas as telas do app"
      icon="material-symbols:wallpaper"
      meta-label="Seleção"
      meta-hint="Salva neste dispositivo"
    />
  </div>
</template>

<script setup lang="ts">
import { BLANK_POSTER, WALLPAPERS_PAGE_SIZE } from '~/constants';
import { releaseVideo } from '~/utils/video';
import { getRepositories } from '~/repositories';
import { usePreferencesStore } from '~/stores/preferences';
import type { Wallpaper, WallpaperCategory } from '~/types';

useHead({ title: 'Pryma — Plano de fundo' });

const preferences = usePreferencesStore();
const backgrounds = useBackgrounds();

function isSelected(id: string): boolean {
  return backgrounds.selectedId.value === id;
}

// ── Animados ────────────────────────────────────────────────────────────────
const category = ref<string | null>(null);
const categories = ref<WallpaperCategory[]>([]);
const previewId = ref<string | null>(null);

/** Clipe do item que perdeu o foco: solta o decodificador antes do próximo abrir. */
function releaseClips(): void {
  document.querySelectorAll<HTMLVideoElement>('video[data-bg-clip]').forEach(releaseVideo);
}

watch(previewId, releaseClips, { flush: 'pre' });
onBeforeUnmount(releaseClips);
const reducedMotion = ref(false);

const animated = usePaginatedQuery<Wallpaper>(
  (cursor, signal) =>
    getRepositories().wallpapers.list(
      { category: category.value, limit: WALLPAPERS_PAGE_SIZE, cursor },
      { signal },
    ),
  // Só no cliente (onMounted): a lista exige login e o SSR não tem o token.
  { immediate: false },
);

watch(category, () => {
  animated.reset();
  void animated.refresh();
});

const showAnimated = computed(() => animated.items.value.length > 0 || category.value !== null);
const motionAllowed = computed(() => preferences.backgroundMotion && !reducedMotion.value);

const categoryChips = computed(() => [
  { value: null, label: 'Todos' },
  ...categories.value.map((item) => ({ value: item.name, label: item.name })),
]);

/** "Porsche 911 GT3 RS Live Wallpaper" → "Porsche 911 GT3 RS". */
function shortTitle(title: string): string {
  return title.replace(/\s*(4k\s*)?(live\s+)?wallpaper\s*$/i, '').trim() || title;
}

onMounted(() => {
  preferences.hydrateBackground();
  reducedMotion.value = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  void animated.refresh();
  getRepositories()
    .wallpapers.listCategories()
    .then((res) => {
      categories.value = res.items;
    })
    .catch(() => {});
});
</script>
