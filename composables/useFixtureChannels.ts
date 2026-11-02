import { ref, shallowRef } from 'vue';
import { getRepositories } from '~/repositories';
import type { FixtureChannels, FixtureQuery, GuideProgram, MediaSummary } from '~/types';
import type { DayFixture } from './useDayFixtures';

/** Canais que transmitem um jogo — `channel` é o melhor (destino do OK). */
export interface FixtureChannelMatch {
  fixtureId: number;
  channel: MediaSummary;
  channels: MediaSummary[];
  program: GuideProgram;
}

/** Jogo já encerrado/cancelado — não vale procurar canal. */
const DEAD_STATUSES = new Set(['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO', 'PST']);

/**
 * Resultado por conjunto de jogos (o modal da home e o grupo "Jogos do dia" da
 * TV ao vivo pedem os mesmos jogos): uma ida à API por sessão a cada 10 min.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; result: Promise<FixtureChannels[]> }>();

function toQuery(fixture: DayFixture): FixtureQuery {
  return {
    id: fixture.id,
    home: fixture.home.name,
    away: fixture.away.name,
    kickoff: new Date(fixture.timestamp * 1000).toISOString(),
  };
}

/**
 * Canal de cada jogo do dia. O cruzamento é na API: ela compara os times e o
 * horário de cada jogo com a programação XMLTV do dia inteiro (não só o
 * "agora/a seguir"), descarta reprises e devolve os canais DA LISTA DO USUÁRIO
 * que passam o jogo ao vivo — sem depender de nomes fixos de categoria.
 */
export function useFixtureChannels() {
  const isLoading = ref(false);
  const matches = shallowRef<Map<number, FixtureChannelMatch>>(new Map());

  async function findChannels(fixtures: DayFixture[]): Promise<void> {
    const live = fixtures.filter((fixture) => !DEAD_STATUSES.has(fixture.status.short));
    if (live.length === 0) {
      matches.value = new Map();
      return;
    }

    const queries = live.map(toQuery);
    const key = queries.map((q) => `${q.id}@${q.kickoff}`).join(',');
    let entry = cache.get(key);
    if (!entry || Date.now() - entry.at > CACHE_TTL_MS) {
      const result = getRepositories().media.fixtureChannels(queries);
      entry = { at: Date.now(), result };
      cache.set(key, entry);
      // Falhou: não guarda o erro (a próxima abertura tenta de novo).
      result.catch(() => cache.delete(key));
    }

    isLoading.value = true;
    try {
      const found = new Map<number, FixtureChannelMatch>();
      for (const match of await entry.result) {
        const [channel] = match.channels;
        if (channel) found.set(match.fixtureId, { ...match, channel });
      }
      matches.value = found;
    } catch {
      matches.value = new Map();
    } finally {
      isLoading.value = false;
    }
  }

  return { isLoading, matches, findChannels };
}
