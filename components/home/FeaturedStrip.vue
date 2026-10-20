<template>
  <section
    class="featured relative overflow-hidden rounded-2xl border border-white/[0.1]"
    aria-label="Meu time"
    @keydown="onKeydown"
    tabindex="0"
  >
    <div class="featured__scene pointer-events-none absolute inset-0" aria-hidden="true" />

    <div class="relative flex items-center justify-center px-6 py-0.5 lg:px-8">
      <div class="team-card w-full">
        <!-- Mobile/tablet: trilho horizontal com snap. Desktop (lg+): grade 4 colunas. -->
        <div class="rail-scroll flex snap-x gap-1.5 overflow-x-auto pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
          <!-- Próximo jogo -->
          <div
            ref="matchSection"
            class="match-section relative min-w-[11.5rem] shrink-0 snap-start rounded-xl border border-white/10 bg-elevated/50 p-1.5 lg:min-w-0 lg:p-2 transition-all duration-fast"
            :class="{
              'ring-2 ring-blue/50 shadow-[0_0_24px_rgba(22,136,255,0.3)]': activeCard === 0,
              'border-white/20': activeCard === 0,
            }"
          >
            <NextMatchBadge />
          </div>

          <!-- Time do coração -->
          <div
            ref="teamSection"
            class="team-section relative min-w-[11.5rem] shrink-0 snap-start rounded-xl border border-white/10 bg-elevated/50 p-1.5 lg:min-w-0 lg:p-2 transition-all duration-fast"
            :class="{
              'ring-2 ring-blue/50 shadow-[0_0_24px_rgba(22,136,255,0.3)]': activeCard === 1,
              'border-white/20': activeCard === 1,
            }"
          >
            <div
              v-if="football.team"
              ref="teamSelector"
              class="team-selector flex flex-col items-center justify-center gap-1.5 h-full cursor-pointer transition-colors duration-fast"
              :class="{
                'hover:bg-elevated/70 hover:border-blue/30': football.team,
                'bg-elevated/70 border-blue/30': activeCard === 1,
              }"
              @click="navigateToTeam"
              @keydown.enter="navigateToTeam"
              @keydown.space.prevent="navigateToTeam"
              tabindex="0"
              role="button"
              aria-label="Trocar time do coração"
            >
              <img
                :src="football.team.logo"
                :alt="football.team.name"
                width="40"
                height="40"
                class="h-10 w-10 shrink-0 object-contain filter drop-shadow-[0_0_8px_rgba(22,136,255,0.4)] transition-transform duration-fast hover:scale-105"
              />
              <p class="text-[0.55rem] font-semibold uppercase tracking-[0.24em] text-ink-muted text-center">
                seu time
              </p>
              <Icon
                name="material-symbols:arrow-forward-rounded"
                class="h-3 w-3 text-blue/70 transition-transform duration-fast hover:translate-x-1"
                aria-hidden="true"
              />
            </div>

            <div
              v-else
              ref="teamEmpty"
              class="team-empty flex flex-col items-center justify-center gap-1.5 h-full text-center text-ink-muted"
              :class="{ 'bg-elevated/70 border-blue/30': activeCard === 1 }"
            >
              <Icon name="material-symbols:sports-soccer" class="h-6 w-6 text-ink-muted/50" aria-hidden="true" />
              <p class="text-[0.55rem] font-semibold uppercase tracking-[0.24em]">Nenhum time selecionado</p>
              <p class="text-[0.5rem] max-w-[12ch]">Selecione seu time do coração</p>
              <button
                type="button"
                class="mt-1 rounded-sm border border-line bg-surface px-2 py-0.5 text-[0.5rem] text-ink transition-colors duration-fast hover:border-blue-dark hover:text-blue-light"
                @click="navigateToTeam"
              >
                Escolher time
              </button>
            </div>
          </div>

          <!-- Plano de fundo -->
          <div
            ref="bgSection"
            class="bg-section relative min-w-[11.5rem] shrink-0 snap-start rounded-xl border border-white/10 bg-elevated/50 p-1.5 lg:min-w-0 lg:p-2 transition-all duration-fast"
            :class="{
              'ring-2 ring-blue/50 shadow-[0_0_24px_rgba(22,136,255,0.3)]': activeCard === 2,
              'border-white/20': activeCard === 2,
            }"
          >
            <div
              ref="bgSelector"
              class="bg-selector flex flex-col items-center justify-center gap-1.5 h-full cursor-pointer transition-colors duration-fast"
              :class="{ 'bg-elevated/70 border-blue/30': activeCard === 2 }"
              @click="navigateToBackground"
              @keydown.enter="navigateToBackground"
              @keydown.space.prevent="navigateToBackground"
              tabindex="0"
              role="button"
              aria-label="Trocar plano de fundo"
            >
              <Icon name="material-symbols:wallpaper" class="h-8 w-8 text-blue/80 transition-transform duration-fast hover:scale-110" aria-hidden="true" />
              <p class="text-[0.55rem] font-semibold uppercase tracking-[0.24em] text-ink-muted text-center">
                plano de fundo
              </p>
              <Icon
                name="material-symbols:arrow-forward-rounded"
                class="h-3 w-3 text-blue/70 transition-transform duration-fast hover:translate-x-1"
                aria-hidden="true"
              />
            </div>
          </div>

          <!-- Jogos do dia -->
          <div
            ref="daySection"
            class="day-section relative min-w-[11.5rem] shrink-0 snap-start rounded-xl border border-white/10 bg-elevated/50 p-1.5 lg:min-w-0 lg:p-2 transition-all duration-fast"
            :class="{
              'ring-2 ring-blue/50 shadow-[0_0_24px_rgba(22,136,255,0.3)]': activeCard === 3,
              'border-white/20': activeCard === 3,
            }"
          >
            <div
              ref="daySelector"
              class="day-selector flex flex-col items-center justify-center gap-1.5 h-full cursor-pointer transition-colors duration-fast"
              :class="{ 'bg-elevated/70 border-blue/30': activeCard === 3 }"
              @click="openDayFixtures"
              @keydown.enter="openDayFixtures"
              @keydown.space.prevent="openDayFixtures"
              tabindex="0"
              role="button"
              aria-label="Ver jogos do dia"
            >
              <Icon name="material-symbols:calendar-month" class="h-8 w-8 text-blue/80 transition-transform duration-fast hover:scale-110" aria-hidden="true" />
              <p class="text-[0.55rem] font-semibold uppercase tracking-[0.24em] text-ink-muted text-center">
                jogos do dia
              </p>
              <Icon
                name="material-symbols:arrow-forward-rounded"
                class="h-3 w-3 text-blue/70 transition-transform duration-fast hover:translate-x-1"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <DayFixturesModal
      :is-open="showDayFixtures"
      @close="closeDayFixtures"
    />
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { computed, ref, onMounted, nextTick, watch } from 'vue';
import { useFavoriteTeam } from '~/composables/useFavoriteTeam';
import { useBackgrounds } from '~/composables/useBackgrounds';
import { useDayFixtures } from '~/composables/useDayFixtures';
import NextMatchBadge from '~/components/football/NextMatchBadge.vue';
import DayFixturesModal from '~/components/football/DayFixturesModal.vue';

const router = useRouter();
const football = useFavoriteTeam();
const backgrounds = useBackgrounds();
const dayFixtures = useDayFixtures();

// 0 = match, 1 = team, 2 = background, 3 = day fixtures
const activeCard = ref(0);
const showDayFixtures = ref(false);

const matchSection = ref<HTMLElement | null>(null);
const teamSection = ref<HTMLElement | null>(null);
const teamSelector = ref<HTMLElement | null>(null);
const teamEmpty = ref<HTMLButtonElement | null>(null);
const bgSection = ref<HTMLElement | null>(null);
const bgSelector = ref<HTMLElement | null>(null);
const daySection = ref<HTMLElement | null>(null);
const daySelector = ref<HTMLElement | null>(null);

const sections = computed(() => [matchSection, teamSection, bgSection, daySection]);
const focusables = computed(() => [null, teamSelector, bgSelector, daySelector]);

function focusCard(index: number): void {
  activeCard.value = index;
  const focusable = focusables.value[index];
  if (focusable?.value) {
    nextTick(() => {
      focusable.value?.focus({ preventScroll: true });
    });
  } else if (sections.value[index]?.value) {
    nextTick(() => {
      sections.value[index].value?.focus({ preventScroll: true });
    });
  }
}

function onKeydown(event: KeyboardEvent): void {
  const total = 4;
  let nextIndex = activeCard.value;

  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      nextIndex = (activeCard.value + 1) % total;
      focusCard(nextIndex);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      nextIndex = (activeCard.value - 1 + total) % total;
      focusCard(nextIndex);
      break;
    case 'ArrowDown':
    case 'ArrowUp':
      return;
  }
}

onMounted(() => {
  nextTick(() => {
    focusCard(0);
  });
});

function navigateToTeam(): void {
  router.push('/team');
}

function navigateToBackground(): void {
  router.push('/background');
}

function openDayFixtures(): void {
  showDayFixtures.value = true;
}

function closeDayFixtures(): void {
  showDayFixtures.value = false;
  focusCard(3);
}

watch(showDayFixtures, (open) => {
  if (!open) {
    // Garantir que o foco volte pro card quando fechar
    nextTick(() => {
      daySelector.value?.focus({ preventScroll: true });
    });
  }
});
</script>

<style scoped>
.featured {
  /* Fundo opaco — backdrop-filter + mix-blend em faixa da home repaintavam
     em chip fraco (celular/TV compat) sem ganho visual que compense. */
  background:
    linear-gradient(180deg, rgba(10, 24, 54, 0.94) 0%, rgba(3, 9, 24, 0.97) 100%);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
}

.featured__scene {
  background-image:
    linear-gradient(90deg, rgba(3, 9, 24, 0.96) 0%, rgba(3, 9, 24, 0.55) 55%, rgba(3, 9, 24, 0.2) 100%),
    url('/img/mountain.jpg');
  background-size: cover;
  background-position: 70% 28%;
  opacity: 0.45;
  filter: saturate(0.8) brightness(0.7);
}

.team-card {
  display: flex;
  flex-direction: column;
}

.match-section,
.team-section,
.bg-section,
.day-section {
  min-height: 28px;
}

.team-selector:focus-visible,
.bg-selector:focus-visible,
.day-selector:focus-visible,
.match-section:focus-visible,
.team-empty:focus-visible {
  outline: 2px solid #4da3ff;
  outline-offset: 2px;
  border-color: #4da3ff;
}

@media (max-width: 1023px) {
  .match-section,
  .team-section,
  .bg-section,
  .day-section {
    min-height: 48px;
  }
}
</style>