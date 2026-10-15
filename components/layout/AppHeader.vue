<template>
  <header
    class="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-black/70 via-black/30 to-transparent"
  >
    <div class="tv-safe flex h-20 items-center justify-between gap-6">
      <!-- Identidade — à esquerda do header. -->
      <NuxtLink
        to="/"
        class="group flex shrink-0 items-center gap-3"
        aria-label="Prysma — início"
      >
        <img
          src="/prysma-mark.svg"
          alt=""
          width="40"
          height="40"
          aria-hidden="true"
          class="h-9 w-9 shrink-0 transition-transform duration-fast group-hover:scale-105 sm:h-10 sm:w-10"
        />
        <span class="leading-none">
          <span class="block text-[0.95rem] font-semibold tracking-[0.3em] text-ink">
            PRYMA
          </span>
          <span class="mt-1.5 block text-[0.5rem] font-medium tracking-[0.55em] text-ink-muted">
            Sua experiência em outro nível.
          </span>
        </span>
      </NuxtLink>

      <!-- Time do coração — centro exato do header (escudo + nome). -->
      <div
        v-if="football.isReady && football.team"
        class="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 sm:flex"
      >
        <NuxtLink
          to="/team"
          class="group flex items-center gap-2.5 rounded-sm px-3 py-1.5 transition-colors duration-fast hover:bg-white/5"
          :aria-label="`Time do coração: ${football.team.name}. Trocar time`"
        >
          <img
            :src="football.team.logo"
            alt=""
            width="28"
            height="28"
            aria-hidden="true"
            class="h-7 w-7 shrink-0 object-contain"
          />
          <span
            class="max-w-[13rem] truncate text-[0.82rem] font-bold uppercase tracking-[0.2em] text-ink transition-colors duration-fast group-hover:text-blue-light"
          >
            {{ football.team.name }}
          </span>
        </NuxtLink>
      </div>

      <!-- Hora/data + ações — à direita, na ordem da referência. -->
      <div class="ml-auto flex shrink-0 items-center gap-4 sm:gap-5">
        <div class="flex flex-col items-end text-right">
          <time
            v-if="clock"
            class="text-[1.6rem] font-semibold leading-none tabular-nums tracking-wide text-ink"
            :datetime="clockIso"
          >
            {{ clock }}
          </time>
          <p class="mt-1.5 text-[0.62rem] font-medium uppercase tracking-[0.2em] text-ink-muted">
            {{ dateLabel }}
          </p>
        </div>

        <div class="flex items-center gap-2.5">
          <!-- Notificações — ainda sem fonte de dados; o botão já ocupa o lugar da referência. -->
          <button type="button" class="header-btn" aria-label="Notificações" title="Notificações">
            <Icon
              name="material-symbols:notifications-outline-rounded"
              class="h-5 w-5"
              aria-hidden="true"
            />
          </button>

          <!-- Menu do usuário — plano de fundo e atalhos de conta. -->
          <div class="relative">
            <button
              type="button"
              class="header-btn"
              aria-label="Menu do usuário"
              title="Usuário"
              :aria-expanded="menuOpen"
              @click="menuOpen = !menuOpen"
            >
              <Icon name="material-symbols:person-outline-rounded" class="h-5 w-5" aria-hidden="true" />
            </button>

            <template v-if="menuOpen">
              <button
                type="button"
                class="fixed inset-0 -z-10 cursor-default"
                aria-label="Fechar menu"
                @click="menuOpen = false"
              />
              <div
                class="absolute right-0 top-full mt-2 w-52 rounded-md border border-line bg-[#06142d]/95 p-1.5 shadow-stage backdrop-blur-md"
              >
                <NuxtLink
                  to="/background"
                  class="flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm text-ink-muted transition-colors duration-fast hover:bg-white/5 hover:text-ink"
                  @click="menuOpen = false"
                >
                  <Icon name="material-symbols:wallpaper" class="h-4 w-4" aria-hidden="true" />
                  Plano de fundo
                </NuxtLink>
                <NuxtLink
                  to="/team"
                  class="flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm text-ink-muted transition-colors duration-fast hover:bg-white/5 hover:text-ink"
                  @click="menuOpen = false"
                >
                  <Icon name="material-symbols:sports-soccer" class="h-4 w-4" aria-hidden="true" />
                  Meu time
                </NuxtLink>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const football = useFavoriteTeam();

const menuOpen = ref(false);

const clock = ref('');
const clockIso = ref('');
const dateLabel = ref('');

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;
const MONTHS = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
] as const;

function updateClock(): void {
  const now = new Date();
  clock.value = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
  clockIso.value = now.toISOString();
  // Estilo "SEG · 12 OUT" — dia da semana, número e mês abreviado.
  dateLabel.value = `${WEEKDAYS[now.getDay()]} · ${now.getDate()} ${MONTHS[now.getMonth()]}`;
}

onMounted(() => {
  updateClock();
  const timer = window.setInterval(updateClock, 30_000);
  onUnmounted(() => window.clearInterval(timer));
});
</script>

<style scoped>
/* Botões circulares do header (busca, notificações, usuário). */
.header-btn {
  display: flex;
  height: 2.6rem;
  width: 2.6rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(3, 9, 24, 0.45);
  color: var(--color-text-muted);
  backdrop-filter: blur(8px);
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.header-btn:hover {
  border-color: var(--color-blue-dark);
  color: var(--color-blue-light);
}
</style>
