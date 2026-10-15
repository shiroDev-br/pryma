import { ref, shallowRef } from 'vue';
import { getRepositories } from '~/repositories';
import type { GuideProgram, MediaSummary } from '~/types';
import type { DayFixture } from './useDayFixtures';

/** Resultado do match entre um jogo e um canal. */
export interface FixtureChannelMatch {
  fixtureId: number;
  channel: MediaSummary;
  program: GuideProgram;
}

/**
 * Cache de EPG por channelId — evita refazer request pra cada jogo.
 * null = ainda não carregou; [] = carregou e não tem programação.
 * TTL curto: o `now` de um canal muda a cada programa — cache eterno
 * faria o match falhar quando o jogo entra no ar depois da abertura.
 */
const EPG_TTL_MS = 10 * 60 * 1000;

interface EpgEntry {
  now: GuideProgram | null;
  next: GuideProgram | null;
  fetchedAt: number;
}

const epgCache = new Map<string, EpgEntry | null>();

/** Normaliza texto pra comparação (minúsculas, sem acentos, sem pontuação). */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Verifica se o título do programa contém os dois nomes de time. */
function programMatchesFixture(program: GuideProgram, fixture: DayFixture): boolean {
  const title = normalize(program.title);
  const home = normalize(fixture.home.name);
  const away = normalize(fixture.away.name);

  // Tenta match completo: "flamengo palmeiras" ou "flamengo x palmeiras"
  if (title.includes(home) && title.includes(away)) return true;

  // Fallback: match parcial (nomes de times podem ter variações)
  // Ex: "São Paulo" vs "SP FC"
  const homeWords = home.split(' ').filter((w) => w.length > 2);
  const awayWords = away.split(' ').filter((w) => w.length > 2);

  const homeMatch = homeWords.some((w) => title.includes(w));
  const awayMatch = awayWords.some((w) => title.includes(w));

  return homeMatch && awayMatch;
}

/** Jogo já encerrado/cancelado — não vale procurar canal. */
const DEAD_STATUSES = new Set(['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO']);

/** Roda `fn` sobre `items` com no máximo `limit` em paralelo. */
async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const size = Math.min(limit, items.length);
  const workers = Array.from({ length: size }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await fn(items[index]);
    }
  });
  await Promise.all(workers);
}

/**
 * Busca o canal que está transmitindo cada jogo da lista.
 * Consulta EPG (now-next) dos canais e faz match por nome de time.
 */
export function useFixtureChannels() {
  const isLoading = ref(false);
  const matches = shallowRef<Map<number, FixtureChannelMatch>>(new Map());

  async function findChannels(fixtures: DayFixture[], channels: MediaSummary[]): Promise<void> {
    if (fixtures.length === 0 || channels.length === 0) {
      matches.value = new Map();
      return;
    }

    isLoading.value = true;
    const found = new Map<number, FixtureChannelMatch>();

    try {
      const repository = getRepositories().media;

      // Carrega EPG dos canais (com cache + concorrência limitada).
      await mapPool(channels, 8, async (channel) => {
        const cached = epgCache.get(channel.id);
        if (cached !== undefined && cached !== null && Date.now() - cached.fetchedAt < EPG_TTL_MS) {
          return;
        }
        try {
          const nowNext = await repository.getNowNext(channel.id);
          epgCache.set(channel.id, {
            now: nowNext.now,
            next: nowNext.next,
            fetchedAt: Date.now(),
          });
        } catch {
          // Erro no EPG — marca como null pra não refazer imediatamente
          epgCache.set(channel.id, null);
        }
      });

      // Match fixtures x EPG — o EPG now/next é o filtro verdadeiro
      // (jogo ao vivo = now; jogo que vai ao ar em seguida = next).
      for (const fixture of fixtures) {
        if (DEAD_STATUSES.has(fixture.status.short)) continue;

        for (const channel of channels) {
          const epg = epgCache.get(channel.id);
          if (!epg) continue;

          // Checa programa atual
          if (epg.now && programMatchesFixture(epg.now, fixture)) {
            found.set(fixture.id, { fixtureId: fixture.id, channel, program: epg.now });
            break;
          }

          // Checa próximo programa (jogo agendado)
          if (epg.next && programMatchesFixture(epg.next, fixture)) {
            found.set(fixture.id, { fixtureId: fixture.id, channel, program: epg.next });
            break;
          }
        }
      }

      matches.value = found;
    } finally {
      isLoading.value = false;
    }
  }

  function clearCache(): void {
    epgCache.clear();
  }

  return { isLoading, matches, findChannels, clearCache };
}
