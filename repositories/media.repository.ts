import type { HttpClient } from '~/services/http';
import { ENDPOINTS, LIVE_ENDPOINTS } from '~/constants';
import type { MediaRepository } from '~/repositories/contracts';
import { tmdbSized, withListArt } from '~/utils/imageSize';
import type {
  Category,
  FixtureChannels,
  FixtureQuery,
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
/** Página de listagem com as artes já no tamanho de card (ver utils/imageSize). */
function listArt<T extends { items: MediaSummary[] }>(page: T): T {
  return { ...page, items: page.items.map(withListArt) };
}

export function createHttpMediaRepository(client: HttpClient): MediaRepository {
  return {
    listCategories: (options) =>
      client.get<{ items: Category[] }>(ENDPOINTS.categories, undefined, options),

    listMedia: (query: MediaQuery, options) =>
      client
        .get<Paginated<MediaSummary>>(
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
      )
        .then(listArt),

    // Detalhe: pôster médio (a tela de detalhe e o card de pausa); o backdrop
    // ocupa a tela inteira e fica como veio.
    getMedia: (id, options) =>
      client.get<MediaDetail>(ENDPOINTS.mediaById(id), undefined, options).then((media) => ({
        ...media,
        thumbnailUrl: tmdbSized(media.thumbnailUrl, 'w500'),
        logoUrl: tmdbSized(media.logoUrl, 'w500'),
      })),

    getPlayback: (id, options) =>
      client.get<PlaybackSession>(ENDPOINTS.playback(id), undefined, options),

    getNowNext: async (id, options) => {
      const raw = await client.get<RawNowNext>(LIVE_ENDPOINTS.nowNext(id), undefined, options);
      return {
        now: mapEpgProgram(raw.now, true),
        next: mapEpgProgram(raw.next, false),
      };
    },

    fixtureChannels: async (fixtures: FixtureQuery[], options) => {
      if (fixtures.length === 0) return [];
      const raw = await client.post<{
        matches: { fixtureId: number; program: RawEpgProgram; channels: MediaSummary[] }[];
      }>(LIVE_ENDPOINTS.fixtureChannels, { fixtures }, options);
      return raw.matches.map((match) => ({
        fixtureId: match.fixtureId,
        program: mapEpgProgram(match.program, false)!,
        channels: match.channels.map(withListArt),
      }));
    },

    search: (params: SearchParams, options) =>
      client.get<Paginated<MediaSummary>>(
        ENDPOINTS.search,
        { q: params.q, limit: params.limit, cursor: params.cursor, type: params.type },
        options,
      ).then(listArt),

    suggest: (q, options) =>
      client.get<{ items: Suggestion[] }>(ENDPOINTS.suggest, { q }, options).then((r) => r.items),
  };
}
