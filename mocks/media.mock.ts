import { clampLimit } from '~/utils/pagination';
import { createApiError } from '~/utils/errors';
import { isSearchableQuery, sanitizeQuery } from '~/utils/sanitize';
import { MAX_SUGGEST_LIMIT, MIN_SEARCH_CHARS, SUGGEST_LIMIT } from '~/constants';
import { simulateLatency } from './latency';
import {
  MOCK_CATALOG_SIZE,
  findMockCategoryBySlug,
  generateMediaDetail,
  generateMediaSummary,
  getMockCategories,
  getMockSearchIndex,
  mediaIdAt,
  mediaTypeAt,
  parseMediaIndex,
  seriesInfoAt,
} from './generator';
import type { MediaRepository } from '~/repositories/contracts';
import type { MediaSummary, MediaType, NowNext, Suggestion } from '~/types';

/**
 * Mocks do catálogo — implementam MediaRepository com dados determinísticos.
 * Limitações do modo dev: sort diferente de '-added' é ignorado (exceto coletânea
 * de séries, que já ordena por temporada/episódio); playback não valida sessão
 * (a validação real é do backend).
 */

function requireIndex(id: string): number {
  const index = parseMediaIndex(id);
  if (index === null) {
    throw createApiError(404, 'not_found', `Media "${id}" não encontrada.`);
  }
  return index;
}

function collectByCategory(
  startIndex: number,
  limit: number,
  categoryPosition: number | null,
): { items: MediaSummary[]; nextStart: number | null } {
  const step = categoryPosition === null ? 1 : getMockCategories().length;
  const first =
    categoryPosition === null
      ? startIndex
      : startIndex + ((categoryPosition - (startIndex % step) + step) % step);

  const items: MediaSummary[] = [];
  let cursor = first;

  while (cursor < MOCK_CATALOG_SIZE && items.length < limit) {
    items.push(generateMediaSummary(cursor));
    cursor += step;
  }

  return { items, nextStart: cursor < MOCK_CATALOG_SIZE ? cursor : null };
}

function collectMatches(
  haystack: string[],
  query: string,
  startIndex: number,
  limit: number,
  typeFilter?: MediaType,
): { items: MediaSummary[]; total: number; nextStart: number | null } {
  const items: MediaSummary[] = [];
  let total = 0;
  let nextStart: number | null = null;

  for (let i = 0; i < MOCK_CATALOG_SIZE; i += 1) {
    if (typeFilter && mediaTypeAt(i) !== typeFilter) continue;
    if (!haystack[i].includes(query)) continue;

    total += 1;
    if (i < startIndex) continue;
    if (items.length < limit) items.push(generateMediaSummary(i));
    else if (nextStart === null) nextStart = i;
  }

  return { items, total, nextStart };
}

/** Chave de ordenação de episódio — espelha `episode_key = season * 10000 + episode`. */
function episodeKey(index: number): number {
  const info = seriesInfoAt(index);
  return (info.season ?? 0) * 10_000 + (info.episode ?? 0);
}

/** Índices de uma coletânea mock, ordenados por temporada/episódio. */
function collectSeriesIndices(seriesId: string, season: number | null): number[] | null {
  const indices: number[] = [];
  const run = /^serie-(\d+)$/.exec(seriesId);

  if (run) {
    const base = Number(run[1]) * 100;
    for (let offset = 0; offset < 8; offset += 1) {
      const index = base + offset;
      if (index >= MOCK_CATALOG_SIZE) break;
      if (mediaTypeAt(index) !== 'series') continue;
      if (season !== null && seriesInfoAt(index).season !== season) continue;
      indices.push(index);
    }
  } else {
    const match = /^serie-s-(\d+)$/.exec(seriesId);
    if (!match) return null;

    const index = Number(match[1]);
    if (index >= MOCK_CATALOG_SIZE || mediaTypeAt(index) !== 'series') return null;
    if (season !== null && seriesInfoAt(index).season !== season) return null;
    indices.push(index);
  }

  if (indices.length === 0) return null;
  return indices.sort((a, b) => episodeKey(a) - episodeKey(b) || a - b);
}

function listSeriesEpisodes(
  seriesId: string,
  season: number | null,
  position: number,
  limit: number,
): { items: MediaSummary[]; nextCursor: string | null; total: number } {
  const indices = collectSeriesIndices(seriesId, season);
  if (!indices) {
    throw createApiError(404, 'not_found', `Série "${seriesId}" não existe.`);
  }

  const page = indices.slice(position, position + limit);
  return {
    items: page.map((index) => generateMediaSummary(index)),
    nextCursor: position + limit < indices.length ? String(position + limit) : null,
    total: indices.length,
  };
}

export const mockMediaRepository: MediaRepository = {
  async listCategories() {
    await simulateLatency();
    return { items: getMockCategories() };
  },

  async listMedia(query) {
    const limit = clampLimit(query.limit);
    const startIndex = query.cursor ? Number.parseInt(query.cursor, 10) || 0 : 0;

    if (query.season !== undefined) {
      if (!query.series) {
        throw createApiError(400, 'invalid_request', 'O filtro "season" exige "series".');
      }
      if (query.season < 1) {
        throw createApiError(400, 'invalid_request', 'O filtro "season" precisa ser >= 1.');
      }
    }

    await simulateLatency();

    // Coletânea de séries — episódios ordenados por temporada/episódio (SPEC §6.7).
    if (query.series) {
      return listSeriesEpisodes(query.series, query.season ?? null, startIndex, limit);
    }

    const category = query.category ? findMockCategoryBySlug(query.category) : null;
    if (query.category && !category) {
      throw createApiError(404, 'not_found', `Categoria "${query.category}" não existe.`);
    }

    const { items, nextStart } = collectByCategory(startIndex, limit, category?.position ?? null);

    return {
      items,
      nextCursor: nextStart === null ? null : String(nextStart),
      total: category ? category.itemCount : MOCK_CATALOG_SIZE,
    };
  },

  async getMedia(id) {
    await simulateLatency();
    return generateMediaDetail(requireIndex(id));
  },

  async getPlayback(id) {
    await simulateLatency();
    const index = requireIndex(id);

    return {
      mediaId: mediaIdAt(index),
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      protocol: 'hls',
      headers: null,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    };
  },

  async getNowNext(id) {
    await simulateLatency();
    requireIndex(id); // valida se existe

    // Mock: agora e próximo baseados no horário atual
    const now = new Date();
    const nowISO = now.toISOString();
    const in30min = new Date(now.getTime() + 30 * 60_000).toISOString();
    const in1hr = new Date(now.getTime() + 60 * 60_000).toISOString();
    const in2hr = new Date(now.getTime() + 2 * 60 * 60_000).toISOString();

    return {
      now: {
        title: 'Jornal Nacional',
        description: 'Edição das 20h com William Bonner e Renata Vasconcellos.',
        startsAt: nowISO,
        endsAt: in30min,
      },
      next: {
        title: 'Fantástico',
        description: 'O show da vida: reportagens, entrevistas e atrações musicais.',
        startsAt: in30min,
        endsAt: in1hr,
      },
    } satisfies NowNext;
  },

  async search(params) {
    const query = sanitizeQuery(params.q);
    if (!isSearchableQuery(query)) {
      throw createApiError(400, 'invalid_request', `A busca exige ao menos ${MIN_SEARCH_CHARS} caracteres.`);
    }

    const limit = clampLimit(params.limit);
    const startIndex = params.cursor ? Number.parseInt(params.cursor, 10) || 0 : 0;
    await simulateLatency();

    const haystack = await getMockSearchIndex();
    const { items, total, nextStart } = collectMatches(haystack, query, startIndex, limit, params.type);

    return {
      items,
      nextCursor: nextStart === null ? null : String(nextStart),
      total,
    };
  },

  async suggest(q) {
    const query = sanitizeQuery(q);
    if (!isSearchableQuery(query)) {
      throw createApiError(400, 'invalid_request', `Sugestões exigem ao menos ${MIN_SEARCH_CHARS} caracteres.`);
    }
    await simulateLatency();

    const suggestions: Suggestion[] = [];
    const seen = new Set<string>();

    for (const category of getMockCategories()) {
      if (suggestions.length >= SUGGEST_LIMIT) break;
      if (!category.slug.includes(query)) continue;
      seen.add(category.slug);
      suggestions.push({ value: category.name, type: 'category', count: category.itemCount });
    }

    const haystack = await getMockSearchIndex();
    const scanLimit = Math.min(MOCK_CATALOG_SIZE, 50_000);
    for (let i = 0; i < scanLimit && suggestions.length < MAX_SUGGEST_LIMIT; i += 1) {
      if (!haystack[i].includes(query)) continue;
      const title = generateMediaSummary(i).title;
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({ value: title, type: 'title', count: 0 });
    }

    return suggestions;
  },
};
