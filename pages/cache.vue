<template>
  <div class="tv-safe pb-28 pt-24">
    <header class="mb-8 space-y-6">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors duration-fast hover:text-ink"
      >
        <Icon name="material-symbols:arrow-back-rounded" class="h-4 w-4" aria-hidden="true" />
        Início
      </NuxtLink>

      <div class="space-y-1.5">
        <p class="kicker">Armazenamento</p>
        <div class="flex flex-wrap items-baseline justify-between gap-3">
          <h1 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Limpeza de cache
          </h1>
          <button
            type="button"
            class="rounded-sm border border-line bg-surface px-4 py-2 text-sm text-ink transition-colors duration-fast hover:border-blue-dark hover:text-blue-light"
            @click="toggleAll"
          >
            {{ allSelected ? 'Desmarcar tudo' : 'Selecionar tudo' }}
          </button>
        </div>
        <p class="max-w-2xl text-sm text-ink-muted">
          Escolha o que limpar — cada item mostra o que você perde e quanto espaço libera.
          Nada aqui afeta catálogo, canais ou reprodução.
        </p>
      </div>
    </header>

    <div
      v-if="isClearing"
      class="mb-4 flex items-center gap-3 rounded-md border border-blue/40 bg-elevated/60 px-4 py-3"
      role="status"
    >
      <Icon
        name="material-symbols:cleaning-services-outline"
        class="broom h-6 w-6 shrink-0 text-blue-light"
        aria-hidden="true"
      />
      <p class="text-sm text-ink">Limpando os dados selecionados…</p>
    </div>

    <ul class="space-y-3">
      <li v-for="(row, index) in rows" :key="row.key">
        <button
          type="button"
          class="relative flex w-full items-center gap-4 overflow-hidden rounded-md border px-4 py-3.5 text-left transition-colors duration-fast focus:outline-none focus-visible:shadow-focus"
          :class="[
            row.selected
              ? 'border-blue/50 bg-elevated/70'
              : 'border-line bg-surface/50 hover:border-blue-dark/40',
            row.selected && isClearing ? 'is-sweeping' : '',
          ]"
          :style="row.selected && isClearing ? { animationDelay: `${index * 0.14}s` } : undefined"
          :aria-pressed="row.selected"
          :disabled="isClearing"
          @click="row.selected = !row.selected"
        >
          <span
            class="grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors duration-fast"
            :class="row.selected ? 'border-blue bg-blue-dark text-white' : 'border-white/25 text-transparent'"
            aria-hidden="true"
          >
            <Icon name="material-symbols:check-rounded" class="h-4 w-4" />
          </span>

          <span class="min-w-0 flex-1">
            <span class="block font-semibold text-ink">{{ row.title }}</span>
            <span class="mt-0.5 block text-xs leading-snug text-ink-muted">{{ row.consequence }}</span>
          </span>

          <span
            class="shrink-0 text-sm tabular-nums"
            :class="row.size > 0 ? 'text-blue' : 'text-ink-muted/50'"
          >
            {{ formatBytes(row.size) }}
          </span>
        </button>
      </li>
    </ul>

    <section
      class="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-md border border-line bg-elevated/50 p-5"
    >
      <div>
        <p class="kicker">Seleção</p>
        <p class="text-xl font-bold tabular-nums text-ink">
          {{ formatBytes(selectedSize) }}
          <span class="text-sm font-normal text-ink-muted">a liberar</span>
        </p>
        <p v-if="lastFreed" class="mt-1 text-xs text-blue" role="status">
          {{ lastFreed }}
        </p>
      </div>

      <button
        type="button"
        class="rounded-sm border border-red-500/40 bg-red-500/15 px-5 py-2.5 text-sm font-semibold text-red-200 transition-colors duration-fast hover:border-red-400/70 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="isClearing || selectedSize === 0"
        @click="clearSelected"
      >
        {{ isClearing ? 'Limpando…' : 'Limpar seleção' }}
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { STORAGE_KEYS } from '~/constants';
import { usePreferencesStore } from '~/stores/preferences';
import { useFootballStore } from '~/stores/football';

useHead({ title: 'Pryma — Limpeza de cache' });

const preferences = usePreferencesStore();
const football = useFootballStore();

interface CacheRow {
  key: string;
  title: string;
  /** O que o usuário perde ao limpar. */
  consequence: string;
  size: number;
  selected: boolean;
  /** Sincroniza o estado em memória (Pinia) depois de remover a chave. */
  reset: () => void;
}

const rows = ref<CacheRow[]>([
  {
    key: STORAGE_KEYS.watchProgress,
    title: 'Continuar assistindo',
    consequence: 'Posições salvas dos vídeos — filmes e episódios recomeçam do zero.',
    size: 0,
    selected: true,
    reset: () => {},
  },
  {
    key: STORAGE_KEYS.seriesProgress,
    title: 'Progresso de séries',
    consequence: 'O marcador do último episódio assistido some das listagens.',
    size: 0,
    selected: true,
    reset: () => {},
  },
  {
    key: STORAGE_KEYS.favorites,
    title: 'Favoritos',
    consequence: 'Sua lista de favoritos é apagada.',
    size: 0,
    selected: true,
    reset: () => preferences.$patch({ favorites: [] }),
  },
  {
    key: STORAGE_KEYS.recentSearches,
    title: 'Buscas recentes',
    consequence: 'O histórico das últimas buscas é limpo.',
    size: 0,
    selected: true,
    reset: () => preferences.$patch({ recentSearches: [] }),
  },
  {
    key: STORAGE_KEYS.footballTeam,
    title: 'Time do coração',
    consequence: 'O time fixado é removido — o próximo jogo fixado some junto.',
    size: 0,
    selected: true,
    reset: () => football.clearTeam(),
  },
  {
    key: STORAGE_KEYS.footballFixture,
    title: 'Próximo jogo',
    consequence: 'O jogo do dia fixado some da tela inicial.',
    size: 0,
    selected: true,
    reset: () => football.clearFixture(),
  },
  {
    key: STORAGE_KEYS.background,
    title: 'Plano de fundo',
    consequence: 'O fundo escolhido volta ao padrão do app.',
    size: 0,
    selected: true,
    reset: () => preferences.$patch({ backgroundId: '' }),
  },
]);

const lastFreed = ref<string | null>(null);
const isClearing = ref(false);
let clearTimer: ReturnType<typeof setTimeout> | null = null;

/** Delay simulado — dá tempo da vassoura varrer as linhas antes de zerar. */
const CLEAR_DELAY_MS = 1600;

const selectedSize = computed(() =>
  rows.value.reduce((total, row) => (row.selected ? total + row.size : total), 0),
);

const allSelected = computed(() => rows.value.every((row) => row.selected));

function toggleAll(): void {
  const value = !allSelected.value;
  for (const row of rows.value) row.selected = value;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`;
}

function readSize(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Blob([raw]).size : 0;
  } catch {
    return 0;
  }
}

/** Recalcula tamanhos direto do storage — cobre efeitos colaterais (ex.: time leva o jogo junto). */
function refreshSizes(): void {
  for (const row of rows.value) row.size = readSize(row.key);
}

// Tamanhos só existem no cliente — SSR sai com 0 B e preenche no mount.
onMounted(refreshSizes);

function clearSelected(): void {
  if (isClearing.value || selectedSize.value === 0) return;

  const freed = selectedSize.value;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const delay = reduced ? 0 : CLEAR_DELAY_MS;

  isClearing.value = true;

  clearTimer = setTimeout(() => {
    for (const row of rows.value) {
      if (!row.selected) continue;

      try {
        localStorage.removeItem(row.key);
      } catch {
        /* storage indisponível — segue */
      }
      row.reset();
    }

    refreshSizes();
    lastFreed.value = freed > 0 ? `Liberado ${formatBytes(freed)}` : null;
    isClearing.value = false;
  }, delay);
}

onBeforeUnmount(() => {
  if (clearTimer !== null) clearTimeout(clearTimer);
});
</script>

<style scoped>
/* Vassoura esfregando (banner de status). */
.broom {
  animation: broom-scrub 0.35s ease-in-out infinite;
  transform-origin: 50% 80%;
}

@keyframes broom-scrub {
  0%,
  100% {
    transform: translateX(-4px) rotate(-14deg);
  }
  50% {
    transform: translateX(4px) rotate(-32deg);
  }
}

/* Faixa de "poeira" varrendo cada linha selecionada, com stagger. */
.is-sweeping::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 35%,
    rgb(255 255 255 / 0.14) 50%,
    transparent 65%
  );
  background-size: 220% 100%;
  animation: dust-sweep 0.55s ease-out both;
  /* herda o animation-delay inline da linha (stagger por índice). */
  animation-delay: inherit;
  pointer-events: none;
}

@keyframes dust-sweep {
  from {
    background-position: 130% 0;
    opacity: 1;
  }
  to {
    background-position: -30% 0;
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .broom,
  .is-sweeping::after {
    animation: none;
  }
}
</style>
