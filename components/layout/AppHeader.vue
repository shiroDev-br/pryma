<template>
  <header
    class="app-header fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-black/70 via-black/30 to-transparent"
  >
    <!-- Sem flex gap: WebView antiga (<84) não o resolve e os itens do
         header ficam encostados. Espaçamento via margem nos filhos. -->
    <div class="tv-safe flex h-20 items-center justify-between">
      <!-- Identidade — à esquerda do header. -->
      <NuxtLink
        to="/"
        class="group flex shrink-0 items-center"
        aria-label="Pryma — início"
      >
        <img
          src="/prysma-mark.svg"
          alt=""
          width="40"
          height="40"
          aria-hidden="true"
          class="mr-2.5 h-9 w-9 shrink-0 transition-transform duration-fast group-hover:scale-105 sm:mr-3 sm:h-10 sm:w-10"
        />
        <span class="leading-none">
          <span class="block text-[0.95rem] font-semibold tracking-[0.3em] text-ink">
            PRYMA
          </span>
          <!-- Tagline só a partir de sm — no celular ela estoura o header. -->
          <span class="mt-1.5 hidden text-[0.5rem] font-medium tracking-[0.55em] text-ink-muted sm:block">
            Sua experiência em outro nível.
          </span>
        </span>
      </NuxtLink>

      <!-- Time do coração — centro exato do header (escudo + nome). -->
      <div
        v-if="football.isReady && football.team"
        class="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:flex"
      >
        <NuxtLink
          to="/team"
          class="group flex items-center rounded-sm px-3 py-1.5 transition-colors duration-fast hover:bg-white/5"
          :aria-label="`Time do coração: ${football.team.name}. Trocar time`"
        >
          <img
            :src="football.team.logo"
            alt=""
            width="28"
            height="28"
            aria-hidden="true"
            class="mr-2.5 h-7 w-7 shrink-0 object-contain"
          />
          <span
            class="max-w-[13rem] truncate text-[0.82rem] font-bold uppercase tracking-[0.2em] text-ink transition-colors duration-fast group-hover:text-blue-light"
          >
            {{ football.team.name }}
          </span>
        </NuxtLink>
      </div>

      <!-- Hora/data + ações — à direita, na ordem da referência. -->
      <div class="ml-auto flex shrink-0 items-center">
        <div class="mr-2 flex flex-col items-end text-right sm:mr-5">
          <time
            v-if="clock"
            class="text-[1.15rem] font-semibold leading-none tabular-nums tracking-wide text-ink sm:text-[1.6rem]"
            :datetime="clockIso"
          >
            {{ clock }}
          </time>
          <p class="mt-1.5 text-[0.55rem] font-medium uppercase tracking-[0.15em] text-ink-muted sm:text-[0.62rem] sm:tracking-[0.2em]">
            {{ dateLabel }}
          </p>
        </div>

        <div class="flex items-center">
          <!-- Notificações — ainda sem fonte de dados; o botão já ocupa o lugar da referência. -->
          <button
            type="button"
            class="header-btn mr-1.5 sm:mr-2.5"
            aria-label="Notificações"
            title="Notificações"
          >
            <Icon
              name="material-symbols:notifications-outline-rounded"
              class="h-5 w-5"
              aria-hidden="true"
            />
          </button>

          <!-- Menu do usuário — plano de fundo e atalhos de conta. -->
          <div class="relative">
            <button
              ref="triggerRef"
              type="button"
              class="header-btn"
              aria-label="Menu do usuário"
              title="Usuário"
              :aria-expanded="menuOpen"
              @click="toggleMenu"
            >
              <Icon name="material-symbols:person-outline-rounded" class="h-5 w-5" aria-hidden="true" />
            </button>

            <template v-if="menuOpen">
              <!-- tabindex=-1: o spatial engine ignora o backdrop, senão o foco
                   some para um botão invisível cobrindo a tela toda. -->
              <button
                type="button"
                class="fixed inset-0 -z-10 cursor-default"
                tabindex="-1"
                aria-label="Fechar menu"
                @click="closeMenu(false)"
              />
              <div
                ref="menuRef"
                class="absolute right-0 top-full mt-2 w-52 rounded-md border border-line bg-[#06142d]/95 p-1.5 shadow-stage backdrop-blur-md"
                @keydown="onMenuKeydown"
              >
                <NuxtLink
                  to="/background"
                  class="flex items-center rounded-sm px-3 py-2.5 text-sm text-ink-muted transition-colors duration-fast hover:bg-white/5 hover:text-ink"
                  @click="menuOpen = false"
                >
                  <Icon name="material-symbols:wallpaper" class="mr-2.5 h-4 w-4" aria-hidden="true" />
                  Plano de fundo
                </NuxtLink>
                <NuxtLink
                  to="/team"
                  class="flex items-center rounded-sm px-3 py-2.5 text-sm text-ink-muted transition-colors duration-fast hover:bg-white/5 hover:text-ink"
                  @click="menuOpen = false"
                >
                  <Icon name="material-symbols:sports-soccer" class="mr-2.5 h-4 w-4" aria-hidden="true" />
                  Meu time
                </NuxtLink>
                <button
                  type="button"
                  class="flex w-full items-center rounded-sm px-3 py-2.5 text-sm text-ink-muted transition-colors duration-fast hover:bg-white/5 hover:text-ink"
                  @click="onLogout"
                >
                  <Icon name="material-symbols:logout-rounded" class="mr-2.5 h-4 w-4" aria-hidden="true" />
                  Sair
                </button>
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
const auth = useAuth();

const menuOpen = ref(false);
const triggerRef = ref<HTMLButtonElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);

function menuItems(): HTMLElement[] {
  return Array.from(menuRef.value?.querySelectorAll<HTMLElement>('a[href], button') ?? []);
}

function closeMenu(refocusTrigger = true): void {
  menuOpen.value = false;
  if (refocusTrigger) {
    nextTick(() => triggerRef.value?.focus());
  }
}

function toggleMenu(): void {
  if (menuOpen.value) {
    closeMenu();
    return;
  }
  menuOpen.value = true;
  // Foco no 1º item — senão o D-pad começa fora do menu e nada navega dentro.
  nextTick(() => menuItems()[0]?.focus());
}

// Armadilha do menu: setas circulam entre os itens e fecham no ←/→/Esc.
// preventDefault faz o spatial engine (window, bubble) ignorar a tecla.
function onMenuKeydown(event: KeyboardEvent): void {
  const items = menuItems();
  if (items.length === 0) return;

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    items[(current + delta + items.length) % items.length]?.focus();
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Escape') {
    event.preventDefault();
    closeMenu();
  }
}

async function onLogout(): Promise<void> {
  menuOpen.value = false;
  await auth.logout();
  await navigateTo('/login');
}

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
  /* Sem backdrop-filter: o header fixo repintava o blur a cada frame da
     rolagem/lista atrás — em chip fraco (celular/TV compat) derrubava o fps. */
  background: rgba(3, 9, 24, 0.82);
  color: var(--color-text-muted);
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.header-btn:hover {
  border-color: var(--color-blue-dark);
  color: var(--color-blue-light);
}

/* Celular deitado — header compacto pra não roubar altura da home. */
@media (max-height: 500px) {
  .app-header .tv-safe {
    height: 3.5rem;
  }
}
</style>
