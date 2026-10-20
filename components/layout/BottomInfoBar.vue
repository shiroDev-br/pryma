<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-black"
    :class="compact ? 'pb-3' : 'pb-4 sm:pb-5'"
  >
    <div class="tv-safe">
      <div
        class="pointer-events-auto grid grid-cols-1 gap-0 border-t border-white/10 bg-gradient-to-t from-black/90 via-black/55 to-transparent sm:grid-cols-3"
      >
        <!-- Coluna 1: item em foco -->
        <div class="flex items-center gap-2 px-1 py-2 sm:px-3">
          <span
            v-if="icon"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-blue/35 bg-black/40 text-blue"
            aria-hidden="true"
          >
            <Icon :name="icon" class="h-4 w-4" />
          </span>

          <div v-if="title" class="min-w-0">
            <p class="text-[0.55rem] font-semibold uppercase tracking-[0.24em] text-ink-muted">
              Em foco
            </p>
            <p class="truncate text-[0.78rem] font-bold uppercase tracking-[0.08em] text-ink">
              {{ title }}
            </p>
            <p class="text-[0.55rem] tracking-wide text-blue/85">OK para abrir</p>
          </div>

          <slot name="context" />
        </div>

        <!-- Coluna 2: meta / descrição -->
        <div
          class="info-bar__meta hidden flex-col justify-center border-x border-white/10 px-4 py-2 sm:flex"
        >
          <template v-if="subtitle">
            <p class="text-[0.55rem] font-semibold uppercase tracking-[0.24em] text-ink-muted">
              {{ metaLabel }}
            </p>
            <p class="truncate text-[0.78rem] font-bold uppercase tracking-[0.06em] text-ink">
              {{ subtitle }}
            </p>
            <p class="text-[0.55rem] tracking-wide text-ink-muted">{{ metaHint }}</p>
          </template>
        </div>

        <!-- Coluna 3: próximo jogo do time do coração + atalhos de navegação -->
        <div class="info-bar__nav hidden flex-col justify-center px-1 py-2 sm:flex sm:items-end sm:px-3 sm:text-right">
          <NextMatchBadge v-if="football.isReady" class="mb-1" />

          <p
            v-if="!football.isReady"
            class="text-[0.55rem] font-semibold uppercase tracking-[0.24em] text-ink-muted"
          >
            Navegação
          </p>
          <div class="mt-0.5 flex items-center justify-end gap-3">
            <span
              v-for="hint in hints"
              :key="hint.keys"
              class="flex items-center gap-1"
            >
              <kbd
                class="rounded-sm border border-blue/30 bg-black/40 px-1 py-0.5 font-sans text-[0.58rem] font-medium text-blue-light"
              >
                {{ hint.keys }}
              </kbd>
              <span class="text-[0.62rem] tracking-wide text-ink-muted">{{ hint.label }}</span>
            </span>
          </div>
          <p
            v-if="!football.isReady"
            class="text-[0.55rem] tracking-wide text-blue/85"
          >
            Enter para selecionar
          </p>

          <slot name="extra" />
        </div>

        <!-- Extra em telas pequenas (substitui colunas ocultas). -->
        <div class="sm:hidden">
          <slot name="extra" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const football = useFavoriteTeam();

withDefaults(
  defineProps<{
    /** Título do item/seção em foco. */
    title?: string | null;
    /** Contexto secundário — descrição, contagem etc. */
    subtitle?: string | null;
    /** Ícone estratégico ao lado do texto. */
    icon?: string | null;
    /** Rótulo da coluna do meio. */
    metaLabel?: string;
    /** Dica da coluna do meio. */
    metaHint?: string;
    /** Espaçamento inferior menor (telas com player/rolagem). */
    compact?: boolean;
  }>(),
  {
    title: null,
    subtitle: null,
    icon: null,
    metaLabel: 'Detalhe',
    metaHint: 'OK para mais',
    compact: false,
  },
);

const hints = [
  { keys: '← →', label: 'Navegar' },
  { keys: 'Enter', label: 'Abrir' },
] as const;
</script>

<style scoped>
/* Celular deitado — barra compacta: só "Em foco", sem dicas de teclado. */
@media (max-height: 500px) {
  .info-bar__meta,
  .info-bar__nav {
    display: none;
  }
}
</style>
