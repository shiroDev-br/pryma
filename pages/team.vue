<template>
  <div class="tv-safe pb-28 pt-24">
    <header class="mb-8 space-y-1.5">
      <p class="kicker">Meu time</p>
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <h1 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Time do coração
        </h1>
        <p class="text-sm text-ink-muted">Escudo no topo e próximo jogo na barra inferior</p>
      </div>
    </header>

    <!-- Time selecionado -->
    <section
      v-if="football.team"
      class="card-sheen mb-8 rounded-md border border-blue/30 bg-elevated/70 p-5"
    >
      <div class="flex flex-wrap items-center gap-4">
        <img
          :src="football.team.logo"
          :alt="football.team.name"
          width="64"
          height="64"
          class="h-16 w-16 shrink-0 object-contain"
        />

        <div class="min-w-0 flex-1">
          <p class="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-ink-muted">
            Seu time
          </p>
          <p class="truncate text-xl font-bold uppercase tracking-[0.06em] text-ink">
            {{ football.team.name }}
          </p>
          <p class="text-xs text-ink-muted">{{ teamMeta }}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <NuxtLink
            to="/"
            class="rounded-sm border border-line bg-surface px-4 py-2 text-sm text-ink transition-colors duration-fast hover:border-blue-dark hover:text-blue-light"
          >
            Tela inicial
          </NuxtLink>
          <button
            type="button"
            class="rounded-sm border border-line bg-surface px-4 py-2 text-sm text-ink transition-colors duration-fast hover:border-blue-dark hover:text-blue-light"
            @click="football.clearTeam()"
          >
            Trocar time
          </button>
        </div>
      </div>

      <div class="mt-5 border-t border-white/10 pt-4">
        <p class="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-ink-muted">
          Próximo jogo
        </p>

        <div v-if="fixture" class="mt-1.5">
          <p class="text-lg font-bold text-ink">{{ matchup }}</p>
          <p class="text-sm font-medium text-blue">
            {{ kickoff }}<span v-if="league"> · {{ league }}</span>
          </p>
          <p v-if="venue" class="mt-0.5 text-xs text-ink-muted">{{ venue }}</p>
        </div>

        <p v-else-if="football.isLoading" class="mt-1.5 text-sm text-ink-muted">
          Procurando o próximo jogo…
        </p>

        <div v-else-if="football.error" class="mt-1.5 flex flex-wrap items-center gap-3">
          <p class="text-sm text-ink-muted">{{ football.error }}</p>
          <button
            type="button"
            class="rounded-sm border border-line bg-surface px-3 py-1.5 text-xs text-ink transition-colors duration-fast hover:border-blue-dark hover:text-blue-light"
            @click="football.ensureFresh(true)"
          >
            Tentar novamente
          </button>
        </div>

        <p v-else class="mt-1.5 text-sm text-ink-muted">
          Nenhum jogo nas próximas 48 horas — o card é atualizado automaticamente à meia-noite.
        </p>
      </div>
    </section>

    <!-- Busca de times -->
    <section class="space-y-5">
      <div class="space-y-1.5">
        <p class="kicker">Buscar</p>
        <p class="text-sm text-ink-muted">
          {{ football.team ? 'Procurou outro time? É só selecionar para trocar.' : 'Encontre o seu time pelo nome — mínimo de 3 letras.' }}
        </p>
      </div>

      <div class="relative max-w-xl">
        <Icon
          name="material-symbols:search"
          class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          v-model="search.query"
          type="search"
          placeholder="Nome do time (ex.: Flamengo)…"
          aria-label="Buscar time"
          class="w-full rounded-sm border border-line bg-surface/80 py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted/70 transition-colors duration-fast focus:border-blue-dark focus:outline-none focus:shadow-focus"
          @keydown.enter="selectFirst"
        />
      </div>

      <LoadingState v-if="search.isSearching" message="Buscando times…" />

      <ErrorState
        v-else-if="search.error"
        title="Não foi possível buscar times"
        :message="search.error"
        :on-retry="search.refresh"
      />

      <div v-else-if="search.results.length > 0" class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="item in search.results"
          :key="item.id"
          type="button"
          class="flex items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors duration-fast"
          :class="
            isSelected(item)
              ? 'border-blue/60 bg-elevated'
              : 'border-line bg-surface/80 hover:border-blue-dark/60 hover:bg-elevated/60'
          "
          :aria-pressed="isSelected(item)"
          @click="select(item)"
        >
          <img
            :src="item.logo"
            alt=""
            aria-hidden="true"
            width="36"
            height="36"
            loading="lazy"
            class="h-9 w-9 shrink-0 object-contain"
          />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-bold uppercase tracking-[0.06em] text-ink">
              {{ item.name }}
            </span>
            <span class="block truncate text-xs text-ink-muted">{{ item.country }}</span>
          </span>
          <Icon
            v-if="isSelected(item)"
            name="material-symbols:check"
            class="h-5 w-5 shrink-0 text-blue"
            aria-hidden="true"
          />
        </button>
      </div>

      <EmptyState
        v-else-if="!search.isTooShort"
        title="Nenhum time encontrado"
        description="Tente outro nome — a busca começa a partir de 3 letras."
      />

      <p v-else class="text-sm text-ink-muted">
        Digite ao menos 3 letras para buscar. Exemplos: Flamengo, Palmeiras, Real Madrid.
      </p>
    </section>

    <BottomInfoBar
      title="Meu time"
      subtitle="O card de próximo jogo fica no canto direito"
      icon="material-symbols:sports-soccer"
      meta-label="Meu time"
      meta-hint="Atualizado à meia-noite"
    />
  </div>
</template>

<script setup lang="ts">
import { FOOTBALL_MIN_SEARCH_CHARS } from '~/constants';
import { formatKickoffLabel, formatMatchup, isFixtureOver } from '~/utils/format';
import type { FavoriteTeam } from '~/types';

useHead({ title: 'Pryma — Meu time' });

const football = useFavoriteTeam();
// `reactive` desembrulha os refs do composable — template sem `.value`.
const search = reactive(useTeamSearch());

const now = ref(new Date());

// Cache vencido pode trazer um jogo já encerrado — some da UI nesse caso.
const fixture = computed(() => {
  const value = football.fixture;
  if (!value || isFixtureOver(value.timestamp, now.value)) return null;
  return value;
});

const matchup = computed(() =>
  fixture.value ? formatMatchup(fixture.value.home, fixture.value.away) : '',
);

const kickoff = computed(() =>
  fixture.value ? formatKickoffLabel(fixture.value.timestamp, now.value) : '',
);

const league = computed(() => fixture.value?.league.name ?? '');

const venue = computed(() => {
  const value = fixture.value?.venue;
  if (!value?.name) return '';
  return [value.name, value.city].filter(Boolean).join(' · ');
});

const teamMeta = computed(() => {
  const team = football.team;
  if (!team) return '';
  return [team.country, team.code].filter(Boolean).join(' · ');
});

function isSelected(item: FavoriteTeam): boolean {
  return football.team?.id === item.id;
}

function select(item: FavoriteTeam): void {
  football.setTeam(item);
}

function selectFirst(): void {
  const first = search.results[0];
  if (!first || search.isSearching) return;
  if (search.query.trim().length < FOOTBALL_MIN_SEARCH_CHARS) return;
  select(first);
}

onMounted(() => {
  const timer = window.setInterval(() => {
    now.value = new Date();
  }, 60_000);
  onUnmounted(() => window.clearInterval(timer));
});
</script>
