<template>
  <div class="tv-safe pb-28 pt-24">
    <header class="mb-8 space-y-1.5">
      <p class="kicker">Aparência</p>
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <h1 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Plano de fundo
        </h1>
        <NuxtLink
          to="/"
          class="rounded-sm border border-line bg-surface px-4 py-2 text-sm text-ink transition-colors duration-fast hover:border-blue-dark hover:text-blue-light"
        >
          Tela inicial
        </NuxtLink>
      </div>
      <p class="text-sm text-ink-muted">
        Toque numa arte para aplicar — a prévia já aparece atrás desta tela e a escolha fica salva neste dispositivo.
      </p>
    </header>

    <section v-if="backgrounds.options.length" aria-label="Planos de fundo disponíveis">
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
          <div class="relative aspect-video w-full overflow-hidden bg-surface">
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
import { usePreferencesStore } from '~/stores/preferences';

useHead({ title: 'Pryma — Plano de fundo' });

const preferences = usePreferencesStore();
const backgrounds = useBackgrounds();

onMounted(() => preferences.hydrateBackground());

function isSelected(id: string): boolean {
  return backgrounds.selectedId.value === id;
}
</script>
