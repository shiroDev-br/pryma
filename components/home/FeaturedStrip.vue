<template>
  <section class="featured" aria-label="Destaques" @keydown="onKeydown">
    <!-- 1 · Próximo jogo -->
    <button
      ref="matchSection"
      type="button"
      class="featured__col"
      aria-label="Próximo jogo — ver time"
      @focus="activeCard = 0"
      @click="navigateToTeam"
    >
      <NextMatchBadge class="featured__match w-full" />
      <span class="featured__hint">OK para ver o time</span>
    </button>

    <!-- 2 · Jogos do dia -->
    <button
      ref="daySection"
      type="button"
      class="featured__col"
      aria-label="Jogos do dia — abrir"
      @focus="activeCard = 1"
      @click="openDayFixtures"
    >
      <span class="featured__label">Jogos do dia</span>
      <span class="featured__value">Veja quem joga hoje</span>
      <span class="featured__hint">OK para abrir</span>
    </button>

    <!-- 3 · Time do coração -->
    <button
      ref="teamSection"
      type="button"
      class="featured__col"
      aria-label="Time do coração — trocar"
      @focus="activeCard = 2"
      @click="navigateToTeam"
    >
      <span class="featured__label">Time do coração</span>
      <template v-if="football.team">
        <img
          :src="football.team.logo"
          :alt="football.team.name"
          width="40"
          height="40"
          class="featured__logo"
        />
        <span class="featured__value">{{ football.team.name }}</span>
        <span class="featured__hint">OK para trocar</span>
      </template>

      <template v-else>
        <Icon name="material-symbols:sports-soccer" class="featured__icon" aria-hidden="true" />
        <span class="featured__value">Nenhum time</span>
        <span class="featured__hint">OK para escolher</span>
      </template>
    </button>

    <DayFixturesModal
      :is-open="showDayFixtures"
      @close="closeDayFixtures"
    />
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref, onMounted, nextTick } from 'vue';
import { useFavoriteTeam } from '~/composables/useFavoriteTeam';
import NextMatchBadge from '~/components/football/NextMatchBadge.vue';
import DayFixturesModal from '~/components/football/DayFixturesModal.vue';

const router = useRouter();
const football = useFavoriteTeam();

const activeCard = ref(0);
const showDayFixtures = ref(false);

const matchSection = ref<HTMLButtonElement | null>(null);
const daySection = ref<HTMLButtonElement | null>(null);
const teamSection = ref<HTMLButtonElement | null>(null);

const sections = [matchSection, daySection, teamSection];

function focusCard(index: number): void {
  const total = sections.length;
  const next = ((index % total) + total) % total;
  activeCard.value = next;
  nextTick(() => sections[next]?.value?.focus({ preventScroll: true }));
}

function onKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      focusCard(activeCard.value + 1);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      focusCard(activeCard.value - 1);
      break;
    case 'ArrowDown':
    case 'ArrowUp':
      return;
  }
}

onMounted(() => {
  nextTick(() => focusCard(0));
});

function navigateToTeam(): void {
  router.push('/team');
}

function openDayFixtures(): void {
  showDayFixtures.value = true;
}

function closeDayFixtures(): void {
  showDayFixtures.value = false;
  focusCard(1);
}
</script>

<style scoped>
/* Barra chapada de 3 colunas — sem card, imagem de fundo, rounded ou sombra. */
.featured {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: 100%;
  height: 100%;
  background: rgba(2, 8, 23, 0.55);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.featured__col {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-width: 0;
  padding: 0.4rem 0.9rem;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: center;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.featured__col + .featured__col {
  border-left: 1px solid rgba(255, 255, 255, 0.12);
}

.featured__col:focus {
  background: rgba(22, 136, 255, 0.14);
}

.featured__match {
  text-align: center;
}

.featured__match :deep(p) {
  max-width: 100%;
}

.featured__icon {
  height: 1.6rem;
  width: 1.6rem;
  color: var(--color-blue-light);
}

.featured__logo {
  height: 1.9rem;
  width: 1.9rem;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(22, 136, 255, 0.45));
}

.featured__label {
  font-size: 0.55rem;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.featured__value {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text);
}

.featured__hint {
  display: block;
  font-size: 0.52rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

/* TV grande: um degrau de leitura do sofá. */
@media (min-width: 1600px) {
  .featured__value {
    font-size: 0.9rem;
  }

  .featured__hint {
    font-size: 0.56rem;
  }

  .featured__icon,
  .featured__logo {
    height: 2.1rem;
    width: 2.1rem;
  }
}

/* 720p / TV baixa: a barra tem 11vh — comprime o conteúdo para caber. */
@media (max-height: 800px) {
  .featured__col {
    gap: 0.12rem;
    padding: 0.25rem 0.6rem;
  }

  .featured__icon,
  .featured__logo {
    height: 1.35rem;
    width: 1.35rem;
  }

  .featured__label {
    font-size: 0.5rem;
  }

  .featured__value {
    font-size: 0.72rem;
  }

  .featured__hint {
    font-size: 0.48rem;
  }
}

/* Telas baixas: mantém 3 linhas dentro dos 4.5rem da barra. */
@media (max-height: 500px) {
  .featured__col {
    gap: 0.1rem;
    padding: 0.2rem 0.6rem;
  }

  .featured__icon,
  .featured__logo {
    height: 1.1rem;
    width: 1.1rem;
  }

  .featured__value {
    font-size: 0.66rem;
  }

  .featured__hint {
    font-size: 0.46rem;
  }
}
</style>
