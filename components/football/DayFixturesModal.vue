<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="close">
      <div class="day-fixtures-overlay absolute inset-0 bg-black/95" aria-hidden="true" />

      <div
        class="day-fixtures-modal relative w-full max-w-4xl max-h-[85%] overflow-hidden rounded-2xl border border-white/10 bg-elevated/95 shadow-[0_24px_60px_rgba(0,0,0,0.6)] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-fixtures-title"
        @keydown="onKeydown"
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

        <!-- Content — min-h-0: sem ele, na WebView antiga o filho flex cresce com
             a lista em vez de rolar, e o fim dos jogos fica cortado. -->
        <div ref="listEl" class="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
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
                <!-- Linha focável: o D-pad anda jogo a jogo (antes só os "Assistir"
                     recebiam foco e a lista não rolava). OK abre a transmissão. -->
                <tr
                  v-for="fixture in fixtures"
                  :key="fixture.id"
                  tabindex="0"
                  data-fixture-row
                  class="fixture-row border-b border-white/5 hover:bg-white/[0.02] transition-colors focus:outline-none"
                  :class="{ 'fixture-row--playable': getMatch(fixture.id) }"
                  @keydown.enter.self="openMatch(fixture.id)"
                  @click="openMatch(fixture.id)"
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

                      <!-- Canal que transmite (EPG): OK na linha abre direto o primeiro. -->
                      <span
                        v-if="getMatch(fixture.id)"
                        class="inline-flex min-w-0 items-center gap-1 px-2 py-1 rounded-md bg-blue/20 text-blue text-[0.6rem] font-semibold"
                        :title="channelNames(fixture.id)"
                      >
                        <Icon name="material-symbols:play-arrow-rounded" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span class="truncate">{{ channelNames(fixture.id) }}</span>
                      </span>
                      <span v-else-if="channelsLoading" class="text-[0.6rem] text-ink-muted">Procurando canal…</span>
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
import { computed, nextTick, ref, watch } from 'vue';
import { useDayFixtures } from '~/composables/useDayFixtures';
import { useFixtureChannels } from '~/composables/useFixtureChannels';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  isOpen: boolean;
  /** Data YYYY-MM-DD opcional — sem ela o servidor usa "hoje" no fuso do futebol. */
  date?: string;
  onClose: () => void;
}

const props = defineProps<Props>();

const emit = defineEmits<{ close: [] }>();

const { isLoading, error, data, fetchFixtures } = useDayFixtures();
const { matches, findChannels, isLoading: channelsLoading } = useFixtureChannels();

const loading = computed(() => isLoading.value);
const fixtures = computed(() => data.value?.fixtures ?? []);

function getMatch(fixtureId: number) {
  return matches.value.get(fixtureId) ?? null;
}

/** "SporTV · Premiere Clubes" — nomes curtos dos canais que passam o jogo. */
function channelNames(fixtureId: number): string {
  const match = getMatch(fixtureId);
  if (!match) return '';
  return match.channels
    .map((channel) => channel.title.replace(/\s+(FHD|HD|SD|4K|UHD|H\.?265|HEVC)\b.*$/i, '').trim())
    .join(' · ');
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

async function loadFixtures(): Promise<void> {
  const result = await fetchFixtures(props.date);
  // A tabela aparece já; os canais chegam em seguida (a API cruza com o EPG).
  if (result?.fixtures?.length) await findChannels(result.fixtures);
}

function close(): void {
  emit('close');
}

/* ---------- D-pad: jogo a jogo, rolagem junto ---------- */

const listEl = ref<HTMLElement | null>(null);
/** Quem abriu o modal — recebe o foco de volta ao fechar. */
let opener: HTMLElement | null = null;

function rows(): HTMLElement[] {
  return Array.from(listEl.value?.querySelectorAll<HTMLElement>('[data-fixture-row]') ?? []);
}

function focusRow(row: HTMLElement | undefined): void {
  if (!row) return;
  row.focus({ preventScroll: true });
  row.scrollIntoView({ block: 'nearest', behavior: 'auto' });
}

/** ↑/↓ entre linhas (o motor global não sabe rolar a lista), Esc/Voltar fecha. */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' || event.key === 'Backspace' || event.key === 'GoBack') {
    event.preventDefault();
    // Não deixa chegar no listener global de "voltar" (app.vue): na home ele
    // contaria como 1º toque do "voltar 2x pra sair".
    event.stopPropagation();
    close();
    return;
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const list = rows();
  if (list.length === 0) return;
  event.preventDefault();
  const index = list.indexOf(document.activeElement as HTMLElement);
  if (index < 0) {
    focusRow(list[0]);
    return;
  }
  const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
  if (next < 0) {
    // Topo da lista: sobe pro "Fechar".
    listEl.value?.scrollTo({ top: 0 });
    (listEl.value?.parentElement?.querySelector<HTMLElement>('header button'))?.focus();
    return;
  }
  focusRow(list[Math.min(next, list.length - 1)]);
}

/** OK/clique numa linha com transmissão abre direto o melhor canal do jogo. */
function openMatch(fixtureId: number): void {
  const match = getMatch(fixtureId);
  if (!match) return;
  close();
  void navigateTo(`/medias/${match.channel.slug}`);
}

// Abriu: guarda quem abriu e, quando os jogos chegam, foca o primeiro.
// Fechou: devolve o foco (sem isso o D-pad ficava "perdido" na home).
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      // Jogos já em cache (reabriu): o watch de `fixtures` não dispara.
      // Sem jogos ainda (carregando/vazio): foco no "Fechar", nunca atrás do modal.
      void nextTick(() => {
        const first = rows()[0];
        if (first) focusRow(first);
        else listEl.value?.parentElement?.querySelector<HTMLElement>('header button')?.focus();
      });
      return;
    }
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  },
);

watch(fixtures, async (list) => {
  if (!props.isOpen || list.length === 0) return;
  await nextTick();
  focusRow(rows()[0]);
});

// Canais chegaram (a API cruza com o EPG depois da tabela): se o foco ainda está
// no 1º jogo e ele não tem transmissão, pula pro 1º jogo que tem — OK já abre.
watch(matches, async (found) => {
  if (!props.isOpen || found.size === 0) return;
  await nextTick();
  const list = rows();
  if (document.activeElement !== list[0] || getMatch(fixtures.value[0]?.id ?? -1)) return;
  const index = fixtures.value.findIndex((fixture) => found.has(fixture.id));
  if (index >= 0) focusRow(list[index]);
});

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

.fixture-row--playable {
  cursor: pointer;
}

/* Linha em foco — anel visível no D-pad (o tr não tem :focus-visible confiável na TV). */
.fixture-row:focus {
  background: rgba(22, 136, 255, 0.14);
  box-shadow: inset 9px 0 0 #1688ff;
}

.day-fixtures-overlay {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>