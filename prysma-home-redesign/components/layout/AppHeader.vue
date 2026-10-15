<template>
  <header class="app-header fixed inset-x-0 top-0 z-40">
    <div class="tv-safe flex h-[5.5rem] items-center justify-between gap-6">
      <NuxtLink to="/" class="app-brand group flex items-center gap-3" aria-label="Prysma — início">
        <img src="/prysma-mark.svg" alt="" class="h-10 w-10 shrink-0" aria-hidden="true" />
        <div class="hidden sm:block">
          <p class="app-brand__name">Prysma</p>
          <p class="app-brand__sub">ENTERTAINMENT</p>
        </div>
      </NuxtLink>

      <NuxtLink
        v-if="football.isReady && football.team"
        to="/team"
        class="app-team hidden items-center gap-2.5 rounded-full px-3 py-1.5 sm:flex"
        :aria-label="`Time do coração: ${football.team.name}. Trocar time`"
      >
        <img :src="football.team.logo" alt="" width="30" height="30" class="h-7 w-7 object-contain" aria-hidden="true" />
        <span>{{ football.team.name }}</span>
      </NuxtLink>

      <div class="flex items-center gap-2 sm:gap-3">
        <NuxtLink to="/medias" class="app-action" aria-label="Pesquisar catálogo" title="Pesquisar">
          <Icon name="material-symbols:search" class="h-5 w-5" aria-hidden="true" />
        </NuxtLink>
        <NuxtLink to="/background" class="app-action" aria-label="Mudar plano de fundo" title="Plano de fundo">
          <Icon name="material-symbols:wallpaper" class="h-5 w-5" aria-hidden="true" />
        </NuxtLink>
        <NuxtLink to="/team" class="app-action hidden sm:inline-flex" aria-label="Meu time">
          <Icon name="material-symbols:person" class="h-5 w-5" aria-hidden="true" />
        </NuxtLink>

        <div class="app-clock ml-1 sm:ml-3">
          <time v-if="clock" :datetime="clockIso">{{ clock }}</time>
          <p>{{ dateLabel }}</p>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const football = useFavoriteTeam();
const clock = ref('');
const clockIso = ref('');
const dateLabel = ref('');

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'] as const;

function updateClock(): void {
  const now = new Date();
  clock.value = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(now);
  clockIso.value = now.toISOString();
  dateLabel.value = `${WEEKDAYS[now.getDay()]} · ${now.getDate()} ${MONTHS[now.getMonth()]}`;
}

onMounted(() => {
  updateClock();
  const timer = window.setInterval(updateClock, 30_000);
  onUnmounted(() => window.clearInterval(timer));
});
</script>

<style scoped>
.app-header {
  background: linear-gradient(180deg, rgba(1, 5, 13, .92), rgba(1, 5, 13, .46), transparent);
}

.app-brand__name {
  color: white;
  font-size: .98rem;
  font-weight: 700;
  letter-spacing: .3em;
  text-transform: uppercase;
}

.app-brand__sub {
  margin-top: .1rem;
  color: rgba(119, 170, 232, .58);
  font-size: .48rem;
  font-weight: 700;
  letter-spacing: .48em;
}

.app-team {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(235, 244, 255, .9);
  font-size: .75rem;
  font-weight: 800;
  letter-spacing: .2em;
  text-transform: uppercase;
}

.app-action {
  display: inline-flex;
  width: 2.8rem;
  height: 2.8rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(124, 158, 208, .2);
  border-radius: 999px;
  background: rgba(4, 11, 24, .52);
  color: rgba(210, 226, 249, .82);
  backdrop-filter: blur(10px);
  transition: border-color 180ms ease, color 180ms ease, background 180ms ease;
}

.app-action:hover,
.app-action:focus-visible {
  border-color: rgba(48, 144, 255, .7);
  background: rgba(14, 76, 151, .25);
  color: white;
}

.app-clock {
  min-width: 5.4rem;
  text-align: right;
}

.app-clock time {
  display: block;
  color: white;
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: .02em;
  font-variant-numeric: tabular-nums;
}

.app-clock p {
  margin-top: .3rem;
  color: #8bbcff;
  font-size: .58rem;
  font-weight: 800;
  letter-spacing: .2em;
}
</style>
