<template>
  <div class="tv-safe pb-28 pt-24">
    <BrowseListHeader
      :back-to="`/browse/${section}`"
      :section-label="sectionDef.label"
      :heading="HEADING"
      :count="resultLabel"
    />

    <LoadingState v-if="recents.isLoading.value" message="Carregando recentes…" />

    <ErrorState
      v-else-if="recents.items.value.length === 0"
      title="Nada assistido ainda"
      description="Quando você assistir filmes ou séries, eles aparecem aqui."
    />

    <div
      v-else
      class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    >
      <MediaCard v-for="media in recents.items.value" :key="media.id" :media="media" />
    </div>

    <BottomInfoBar :title="HEADING" :subtitle="resultLabel" :icon="sectionDef.icon" />
  </div>
</template>

<script setup lang="ts">
import { SECTIONS, isSectionKey } from '~/constants';

/** Título fixo da lista — usada no cabeçalho, no rodapé e no document.title. */
const HEADING = 'Continuar assistindo';

const route = useRoute();

const sectionParam = String(route.params.section);
if (!isSectionKey(sectionParam)) {
  throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada', fatal: true });
}

const section = sectionParam;
const sectionDef = SECTIONS[section];

// Séries listam os episódios recentes; filmes listam títulos (TV não tem card
// próprio e só é alcançável por URL direta — segue os filmes, como antes).
const recents = useRecents(sectionDef.type === 'series' ? 'series' : 'vod');

const resultLabel = computed(() => {
  const total = recents.items.value.length;
  return `${total} ${total === 1 ? 'título' : 'títulos'}`;
});

useHead({ title: `Pryma — ${HEADING}` });
</script>
