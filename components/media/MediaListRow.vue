<template>
  <NuxtLink
    :ref="setRoot"
    :to="mediaHref(media)"
    class="media-row group relative flex w-full items-center gap-3 rounded-md border p-1.5 text-left transition-colors duration-fast focus:outline-none focus-visible:shadow-focus sm:gap-4"
    :class="
      selected
        ? 'border-transparent bg-[#081a42]/85'
        : 'media-row--idle border-line/70 bg-surface/70'
    "
    :aria-label="displayTitle"
    :aria-current="selected ? 'true' : undefined"
    @mouseenter="onPointerEnter"
    @focus="emit('preview', media)"
  >
    <!-- Borda em gradiente (azul elétrico → violeta) + halo — igual ao card ativo da home. -->
    <span v-if="selected" class="row-ring pointer-events-none absolute" aria-hidden="true" />
    <span v-if="selected" class="row-glow pointer-events-none absolute" aria-hidden="true" />

    <!-- Pôster em pé com tamanho fixo (não aspect-ratio): a TV antiga ignora a
         propriedade e a linha assumia a altura do pôster inteiro. Pequeno de
         propósito — cabem ~5 títulos na coluna antes de rolar. -->
    <div class="relative h-[3.4rem] w-[2.3rem] shrink-0 overflow-hidden rounded bg-elevated">
      <img
        v-if="!imageFailed && media.thumbnailUrl"
        :src="tmdbSized(media.thumbnailUrl, 'w342')"
        :alt="media.title"
        loading="lazy"
        decoding="async"
        class="media-row__poster h-full w-full object-cover transition-transform duration-normal"
        @error="imageFailed = true"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center text-blue-dark"
        aria-hidden="true"
      >
        <Icon name="material-symbols:theaters" class="h-6 w-6" />
      </div>

      <div class="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/25" aria-hidden="true" />

      <span
        v-if="media.quality"
        class="absolute inset-x-0 bottom-0 bg-black/85 py-px text-center text-[0.5rem] font-semibold tracking-wide text-blue"
      >
        {{ media.quality }}
      </span>
    </div>

    <div class="min-w-0 flex-1 py-0.5">
      <p class="truncate text-[1.02rem] font-semibold leading-snug text-ink">
        {{ displayTitle }}
      </p>
      <p v-if="metaLabel" class="mt-1 truncate text-[0.78rem] transition-colors duration-fast" :class="selected ? 'text-blue' : 'text-ink-muted'">{{ metaLabel }}</p>
      <!-- Sinopse só no celular (<640) — lá não existe painel de detalhe. Em
           TV compat (760) e desktops/TVs grandes o `hidden` evita a linha de
           3 linhas que virava "card gigante" na listagem (o painel lateral
           mostra a descrição quando existe). -->
      <p v-if="synopsis" class="mt-1.5 line-clamp-3 text-[0.82rem] leading-relaxed text-ink-muted sm:hidden">
        {{ synopsis }}
      </p>
    </div>

    <div class="flex shrink-0 items-center gap-1.5 self-center pr-0.5">
      <span
        v-if="selected"
        class="hidden h-9 w-9 items-center justify-center rounded-full border border-[#4d9dff]/70 bg-[#0b3a9c]/60 text-ink shadow-[0_0_16px_rgba(22,136,255,0.45)] media-row__play transition-colors duration-fast sm:flex"
        aria-hidden="true"
      >
        <Icon name="material-symbols:play-arrow-rounded" class="h-5 w-5" />
      </span>
      <Icon
        name="material-symbols:chevron-right-rounded"
        class="h-5 w-5 transition-colors duration-fast"
        :class="selected ? 'text-blue-light' : 'media-row__chevron text-ink-muted'"
        aria-hidden="true"
      />
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { tmdbSized } from '~/utils/imageSize';
import { formatRuntime, stripEpisodeToken } from '~/utils/format';
import { mediaHref } from '~/utils/media';
import { useMediaDetailsStore } from '~/stores/mediaDetails';
import type { MediaSummary } from '~/types';

const props = defineProps<{
  media: MediaSummary;
  selected: boolean;
}>();

const emit = defineEmits<{
  preview: [media: MediaSummary];
}>();

const imageFailed = ref(false);

/**
 * Ponteiro só move a prévia fora do modo D-pad: na TV o ponteiro fica parado
 * sobre a lista e, quando ela rola sob ele, o `mouseenter` selecionava outra
 * linha — dois títulos "marcados" (um pelo cursor 2D, outro pelo hover).
 */
function onPointerEnter(): void {
  if (document.body.classList.contains('dpad-mode')) return;
  emit('preview', props.media);
}

const store = useMediaDetailsStore();
const detail = computed(() => store.find(props.media.id));

/** Detalhe (sinopse/gêneros) só é buscado quando a linha se aproxima da viewport. */
const root = ref<HTMLElement | null>(null);

/** NuxtLink expõe a instância do componente — o alvo do observer é o `<a>` raiz. */
function setRoot(element: unknown): void {
  const target =
    (element as { $el?: Element } | null)?.$el ?? (element as Element | null) ?? null;
  root.value = target instanceof HTMLElement ? target : null;
}

useIntersectionObserver(
  root,
  (isIntersecting) => {
    if (isIntersecting) store.ensure(props.media.id);
  },
  { rootMargin: '200px' },
);

const synopsis = computed(() => detail.value?.description ?? null);

/** Série na listagem é a coletânea — sem o token de episódio (SxxEyy). */
const displayTitle = computed(() =>
  props.media.type === 'series' ? stripEpisodeToken(props.media.title) : props.media.title,
);

/** Qual episódio essa linha representa (T2 E9) — a navegação vai pra escolha de episódio. */
const episodeCode = computed(() => {
  const media = props.media;
  if (media.type !== 'series' || media.season == null) return null;
  return media.episode != null ? `T${media.season} E${media.episode}` : `T${media.season}`;
});

const metaLabel = computed(() => {
  const parts: string[] = [];

  if (episodeCode.value) parts.push(episodeCode.value);

  const genres = detail.value?.genres ?? [];

  if (genres.length) parts.push(...genres.slice(0, 2));
  else if (props.media.categoryName) parts.push(props.media.categoryName);

  if (props.media.year) parts.push(String(props.media.year));

  const runtime = formatRuntime(props.media.durationSec);
  if (runtime) parts.push(runtime);

  return parts.join(' • ');
});
</script>

<style scoped>
/* Borda em gradiente (azul elétrico → violeta) — máscara recorta só o contorno. */
.row-ring {
  inset: -2px;
  padding: 2.5px;
  border-radius: calc(var(--radius-md) + 2px);
  background: linear-gradient(135deg, #4aa3ff 0%, #1b5cff 52%, #b06bff 100%);
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box exclude,
    linear-gradient(#000 0 0);
}

/* Hover só fora do modo D-pad (mesmo motivo do `onPointerEnter`). */
body:not(.dpad-mode) .media-row--idle:hover {
  border-color: rgba(11, 92, 255, 0.6);
  background-color: var(--color-surface);
}

body:not(.dpad-mode) .media-row:hover .media-row__poster {
  transform: scale(1.04);
}

body:not(.dpad-mode) .media-row:hover .media-row__play {
  background-color: rgba(11, 92, 255, 0.7);
}

body:not(.dpad-mode) .media-row:hover .media-row__chevron {
  color: var(--color-blue-light);
}

/* Linhas fora da viewport não são pintadas (Chrome 85+; WebViews antigas
   ignoram) — listas longas de VOD/séries/busca rodam mais leves. */
.media-row {
  content-visibility: auto;
  contain-intrinsic-size: auto 4.25rem;
}

/* Halo azul difuso atrás da linha — luz fixa (box-shadow animado em loop
   repintava a lista inteira em chip fraco). */
.row-glow {
  inset: 0;
  border-radius: var(--radius-md);
  box-shadow:
    0 0 26px rgba(22, 136, 255, 0.55),
    0 0 70px rgba(11, 92, 255, 0.3);
}
</style>
