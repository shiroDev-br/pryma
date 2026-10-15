<template>
  <div v-if="store.isReady" class="w-full">
    <template v-if="fixture">
      <p
        class="text-[0.62rem] font-semibold uppercase tracking-[0.24em]"
        :class="live ? 'text-blue' : 'text-ink-muted'"
      >
        <span
          v-if="live"
          class="live-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue align-middle"
          aria-hidden="true"
        />
        {{ live ? 'Ao vivo' : 'Próximo jogo' }}
      </p>
      <p class="mt-0.5 truncate text-[0.95rem] font-bold uppercase tracking-[0.06em] text-ink">
        {{ matchup }}
      </p>
      <p class="mt-0.5 truncate text-[0.62rem] tracking-wide text-blue/85">
        {{ when }}<span v-if="league"> · {{ league }}</span>
      </p>
    </template>

    <template v-else-if="!store.isLoading && !store.error">
      <p class="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-ink-muted">
        Próximo jogo
      </p>
      <p class="mt-0.5 text-[0.62rem] tracking-wide text-ink-muted">
        Sem jogo nas próximas 48h
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useFavoriteTeam } from '~/composables/useFavoriteTeam';
import { formatKickoffLabel, formatMatchup, isFixtureLive, isFixtureOver } from '~/utils/format';

const store = useFavoriteTeam();

const now = ref(new Date());

// Cache vencido pode trazer um jogo já encerrado — some da UI nesse caso.
const fixture = computed(() => {
  const value = store.fixture;
  if (!value || isFixtureOver(value.timestamp, now.value)) return null;
  return value;
});
const matchup = computed(() =>
  fixture.value ? formatMatchup(fixture.value.home, fixture.value.away) : '',
);
const when = computed(() =>
  fixture.value ? formatKickoffLabel(fixture.value.timestamp, now.value) : '',
);
const league = computed(() => fixture.value?.league.name ?? '');
const live = computed(() =>
  fixture.value ? isFixtureLive(fixture.value.timestamp, now.value) : false,
);

onMounted(() => {
  const timer = window.setInterval(() => {
    now.value = new Date();
  }, 30_000);
  onUnmounted(() => window.clearInterval(timer));
});
</script>
