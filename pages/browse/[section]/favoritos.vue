<template>
  <div class="tv-safe pb-28 pt-24">
    <BrowseListHeader
      :back-to="`/browse/${section}`"
      :section-label="sectionDef.label"
      :heading="HEADING"
      :count="resultLabel"
    />

    <EmptyState
      v-if="items.length === 0"
      title="Nenhum favorito ainda"
      :description="`Abra um título e use “Favoritar” — ele aparece aqui.`"
    />

    <div
      v-else
      class="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6"
      data-media-grid
      @keydown="onGridKeydown"
    >
      <MediaCard v-for="media in items" :key="media.id" :media="media" />
    </div>

    <BottomInfoBar :title="HEADING" :subtitle="resultLabel" :icon="sectionDef.icon" />
  </div>
</template>

<script setup lang="ts">
import { usePreferencesStore } from '~/stores/preferences';
import type { MediaSummary } from '~/types';

const { onGridKeydown } = useGridNav();

/** Título fixo da lista — usada no cabeçalho, no rodapé e no document.title. */
const HEADING = 'Favoritos';

const { section, sectionDef } = useBrowseSection();

/** Favoritos desta seção (filmes → vod, séries → series), do mais recente pro mais antigo. */
const preferences = usePreferencesStore();
const items = computed<MediaSummary[]>(() =>
  [...preferences.favorites]
    .reverse()
    .map((id) => preferences.favoriteItems[id])
    .filter((item): item is MediaSummary => !!item && item.type === sectionDef.type),
);

const resultLabel = computed(() => {
  const total = items.value.length;
  return `${total} ${total === 1 ? 'título' : 'títulos'}`;
});

// Foco no primeiro card — o D-pad segue pela grade. Carregando a página direto,
// os favoritos chegam do localStorage logo depois da montagem: espera os cards.
let focusedOnce = false;
function focusFirstCard(): void {
  const card = document.querySelector<HTMLElement>('[data-media-grid] [data-media-card]');
  if (!card || focusedOnce) return;
  focusedOnce = true;
  card.focus({ preventScroll: true });
}
onMounted(focusFirstCard);
watch(() => items.value.length, () => void nextTick(focusFirstCard));

useHead({ title: `Pryma — ${HEADING}` });
</script>
