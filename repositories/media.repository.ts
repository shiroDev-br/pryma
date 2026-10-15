import type { HttpClient } from '~/services/http';
import { ENDPOINTS, LIVE_ENDPOINTS } from '~/constants';
import type { MediaRepository } from '~/repositories/contracts';
import type {
  Category,
  GuideProgram,
  MediaDetail,
  MediaQuery,
  MediaSummary,
  NowNext,
  Paginated,
  PlaybackSession,
  SearchParams,
  Suggestion,
} from '~/types';

/** Resposta crua da API — SPEC usa start/end em vez de startsAt/endsAt. */
interface RawEpgProgram {
  title: string;
  description: string | null;
  start: string;
  end: string;
}

interface RawNowNext {
  now: RawEpgProgram | null;
  next: RawEpgProgram | null;
}

/** Converte programa bruto da API para o formato interno. */
function mapEpgProgram(raw: RawEpgProgram | null, isNow: boolean): GuideProgram | null {
  if (!raw) return null;
  return {
    title: raw.title,
    description: raw.description,
    startsAt: raw.start,
    endsAt: raw.end,
    isNow,
  };
}

/** Implementação HTTP do contrato — consome o proxy Nitro em /api/v1*. */
export function createHttpMediaRepository(client: HttpClient): MediaRepository {
  return {
    listCategories: (options) =>
      client.get<{ items: Category[] }>(ENDPOINTS.categories, undefined, options),

    listMedia: (query: MediaQuery, options) =>
      client.get<Paginated<MediaSummary>>(
        ENDPOINTS.media,
        {
          limit: query.limit,
          cursor: query.cursor,
          category: query.category,
          type: query.type,
          sort: query.sort,
          series: query.series,
          season: query.season,
        },
        options,
      ),

    getMedia: (id, options) => client.get<MediaDetail>(ENDPOINTS.mediaById(id), undefined, options),

    getPlayback: (id, options) =>
      client.get<PlaybackSession>(ENDPOINTS.playback(id), undefined, options),

    getNowNext: async (id, options) => {
      const raw = await client.get<RawNowNext>(LIVE_ENDPOINTS.nowNext(id), undefined, options);
      return {
        now: mapEpgProgram(raw.now, true),
        next: mapEpgProgram(raw.next, false),
      };
    },

    search: (params: SearchParams, options) =>
      client.get<Paginated<MediaSummary>>(
        ENDPOINTS.search,
        { q: params.q, limit: params.limit, cursor: params.cursor, type: params.type },
        options,
      ),

    suggest: (q, options) =>
      client.get<{ items: Suggestion[] }>(ENDPOINTS.suggest, { q }, options).then((r) => r.items),
  };
}
