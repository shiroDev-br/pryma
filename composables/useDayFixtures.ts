import { ref } from 'vue';

export interface DayFixture {
  id: number;
  timestamp: number;
  date: string;
  status: { short: string; long: string };
  home: { id: number; name: string; logo: string };
  away: { id: number; name: string; logo: string };
  league: { id: number; name: string; country: string; logo: string; round: string };
  venue: { name: string | null; city: string | null } | null;
}

export interface DayFixturesResponse {
  date: string;
  fixtures: DayFixture[];
  checkedAt: string;
}

const cache = new Map<string, { data: DayFixturesResponse; expiresAt: number }>();

const CACHE_TTL_MS = 60 * 60 * 1000;

export function useDayFixtures() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const data = ref<DayFixturesResponse | null>(null);

  async function fetchFixtures(date?: string): Promise<DayFixturesResponse | null> {
    // Sem `date` o servidor calcula "hoje" no fuso do futebol (America/Sao_Paulo).
    // Nunca mandar `new Date().toISOString()` — isso é UTC e depois das 18h
    // (21h UTC) já é o dia seguinte, mostrando os jogos de amanhã.
    const cacheKey = `fixtures:${date ?? 'today'}`;

    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      data.value = cached.data;
      return cached.data;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await $fetch<DayFixturesResponse>(`/api/football/day`, {
        query: date ? { date } : {},
      });

      const entry = { data: response, expiresAt: Date.now() + CACHE_TTL_MS };
      cache.set(cacheKey, entry);
      // Guarda também pela data concreta que o servidor resolveu — se o
      // chamador reabrir com a data retornada, bate no mesmo cache.
      if (response.date) cache.set(`fixtures:${response.date}`, entry);
      data.value = response;
      return response;
    } catch (err: any) {
      error.value = err.data?.message || 'Não foi possível carregar os jogos do dia.';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  return { isLoading, error, data, fetchFixtures };
}