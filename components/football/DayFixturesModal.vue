<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="close">
      <div class="day-fixtures-overlay absolute inset-0 bg-black/95" aria-hidden="true" />

      <div
        class="day-fixtures-modal relative w-full max-w-4xl max-h-[85%] overflow-hidden rounded-2xl border border-white/10 bg-elevated/95 shadow-[0_24px_60px_rgba(0,0,0,0.6)] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-fixtures-title"
      >
        <!-- Header -->
        <header class="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div class="flex items-center gap-3">
            <Icon name="material-symbols:calendar-month" class="h-6 w-6 text-blue" aria-hidden="true" />
            <h2 id="day-fixtures-title" class="text-lg font-bold text-ink">
              Jogos de {{ formattedDate }}
            </h2>
          </div>
          <button
            type="button"
            class="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-white/10 transition-colors"
            @click="close"
            aria-label="Fechar"
          >
            <Icon name="material-symbols:close" class="h-6 w-6" aria-hidden="true" />
          </button>
        </header>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4 lg:p-6">
          <LoadingState v-if="loading" message="Carregando jogos…" class="h-64 justify-center" />

          <ErrorState
            v-else-if="error"
            title="Erro ao carregar"
            :message="error"
            :on-retry="() => loadFixtures()"
          />

          <div v-else-if="fixtures.length === 0" class="text-center py-12 text-ink-muted">
            <Icon name="material-symbols:event-busy" class="h-12 w-12 mx-auto mb-3 text-ink-muted/50" aria-hidden="true" />
            <p class="text-sm">Nenhum jogo agendado para este dia.</p>
          </div>

          <div v-else class="space-y-3">
            <table class="w-full text-sm" role="table">
              <thead>
                <tr class="text-left text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-ink-muted border-b border-white/10">
                  <th class="pb-2 pr-3 w-[10%]">Hora</th>
                  <th class="pb-2 pr-3 w-[40%]">Partida</th>
                  <th class="pb-2 pr-3 w-[25%]">Campeonato</th>
                  <th class="pb-2 w-[25%]">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="fixture in fixtures"
                  :key="fixture.id"
                  class="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td class="py-3 pr-3 text-[0.7rem] font-medium tabular-nums text-ink">{{ formatTime(fixture.timestamp) }}</td>
                  <td class="py-3 pr-3">
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2 min-w-0 flex-1">
                        <img :src="fixture.home.logo" :alt="fixture.home.name" class="h-5 w-5 shrink-0 object-contain" loading="lazy" />
                        <span class="truncate font-medium text-ink">{{ fixture.home.name }}</span>
                      </div>
                      <span class="text-ink-muted/50 px-1.5">vs</span>
                      <div class="flex items-center gap-2 min-w-0 flex-1 text-right">
                        <span class="truncate font-medium text-ink">{{ fixture.away.name }}</span>
                        <img :src="fixture.away.logo" :alt="fixture.away.name" class="h-5 w-5 shrink-0 object-contain" loading="lazy" />
                      </div>
                    </div>
                  </td>
                  <td class="py-3 pr-3 text-[0.65rem] text-ink-muted truncate max-w-[12ch]">
                    <div class="flex items-center gap-1.5">
                      <img :src="fixture.league.logo" :alt="fixture.league.name" class="h-4 w-4 shrink-0 object-contain" loading="lazy" />
                      <span>{{ fixture.league.name }}</span>
                    </div>
                  </td>
                  <td class="py-3">
                    <div class="flex items-center gap-2">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.55rem] font-semibold uppercase tracking-[0.1em]"
                        :class="statusClass(fixture.status.short)"
                      >
                        {{ statusLabel(fixture.status.short) }}
                      </span>

                      <!-- Botão assistir quando tem canal com transmissão -->
                      <NuxtLink
                        v-if="getMatch(fixture.id)"
                        :to="`/medias/${getMatch(fixture.id)!.channel.slug}`"
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue/20 text-blue text-[0.6rem] font-semibold hover:bg-blue/30 transition-colors"
                        @click="close"
                      >
                        <Icon name="material-symbols:play-arrow-rounded" class="h-3.5 w-3.5" aria-hidden="true" />
                        Assistir
                      </NuxtLink>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { useDayFixtures } from '~/composables/useDayFixtures';
import { useFixtureChannels } from '~/composables/useFixtureChannels';
import { getRepositories } from '~/repositories';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MediaSummary } from '~/types';

interface Props {
  isOpen: boolean;
  /** Data YYYY-MM-DD opcional — sem ela o servidor usa "hoje" no fuso do futebol. */
  date?: string;
  onClose: () => void;
}

const props = defineProps<Props>();

const emit = defineEmits<{ close: [] }>();

const { isLoading, error, data, fetchFixtures } = useDayFixtures();
const { matches, findChannels } = useFixtureChannels();

/** Categorias onde os canais que transmitem jogos costumam estar. */
const SPORT_CATEGORIES = ['premieres', 'esportes', 'futebol-ppv', 'globos'] as const;

const sportsChannels = shallowRef<MediaSummary[]>([]);

const loading = computed(() => isLoading.value);
const fixtures = computed(() => data.value?.fixtures ?? []);

function getMatch(fixtureId: number) {
  return matches.value.get(fixtureId) ?? null;
}

const formattedDate = computed(() => {
  // Prioriza a data concreta que o servidor resolveu (fuso America/Sao_Paulo);
  // props.date é o fallback quando ainda não há resposta.
  const iso = data.value?.date ?? props.date;
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
});

watch(
  () => props.isOpen,
  (open) => {
    if (open) loadFixtures();
  },
  { immediate: true }
);

watch(
  () => props.date,
  () => {
    if (props.isOpen) loadFixtures();
  }
);

/** Carrega os canais das categorias de esporte (uma vez por sessão). */
async function loadSportsChannels(): Promise<void> {
  if (sportsChannels.value.length > 0) return;
  const repository = getRepositories().media;
  const pages = await Promise.all(
    SPORT_CATEGORIES.map((category) =>
      repository.listMedia({ type: 'live', category, limit: 100 }),
    ),
  );
  const byId = new Map<string, MediaSummary>();
  for (const page of pages) {
    for (const item of page.items) byId.set(item.id, item);
  }
  sportsChannels.value = [...byId.values()];
}

async function loadFixtures(): Promise<void> {
  // Canais e jogos em paralelo — depois cruza EPG x fixtures.
  const [result] = await Promise.all([
    fetchFixtures(props.date),
    loadSportsChannels().catch(() => undefined),
  ]);

  if (result?.fixtures?.length && sportsChannels.value.length) {
    await findChannels(result.fixtures, sportsChannels.value);
  }
}

function close(): void {
  emit('close');
}

function formatTime(timestamp: number): string {
  return format(new Date(timestamp * 1000), 'HH:mm', { locale: ptBR });
}

function statusClass(short: string): string {
  switch (short) {
    case 'NS':
    case 'TBD':
      return 'bg-blue/20 text-blue';
    case '1H':
    case 'HT':
    case '2H':
    case 'ET':
    case 'BT':
    case 'P':
    case 'LIVE':
      return 'bg-green/20 text-green animate-pulse';
    case 'FT':
    case 'AET':
    case 'PEN':
      return 'bg-gray/20 text-gray';
    case 'PST':
    case 'CANC':
    case 'ABD':
    case 'AWD':
    case 'WO':
      return 'bg-red/20 text-red';
    default:
      return 'bg-white/10 text-ink-muted';
  }
}

function statusLabel(short: string): string {
  switch (short) {
    case 'NS':
    case 'TBD':
      return 'Agendado';
    case '1H':
      return '1º Tempo';
    case 'HT':
      return 'Intervalo';
    case '2H':
      return '2º Tempo';
    case 'ET':
      return 'Prorrogação';
    case 'BT':
      return 'Intervalo Prorrog.';
    case 'P':
      return 'Pênaltis';
    case 'LIVE':
      return 'Ao Vivo';
    case 'FT':
      return 'Encerrado';
    case 'AET':
      return 'Encerrado (Prorr.)';
    case 'PEN':
      return 'Pênaltis';
    case 'PST':
      return 'Adiado';
    case 'CANC':
      return 'Cancelado';
    case 'ABD':
      return 'Abandonado';
    case 'AWD':
      return 'WO';
    case 'WO':
      return 'WO';
    default:
      return short;
  }
}
</script>

<style scoped>
.day-fixtures-modal {
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.day-fixtures-overlay {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>