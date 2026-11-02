import type { HttpClient } from '~/services/http';
import { ENDPOINTS } from '~/constants';
import type { YoutubeRepository } from '~/repositories/contracts';
import type { Paginated, YoutubeVideo } from '~/types';

interface FeedPage {
  items?: Partial<YoutubeVideo>[];
  nextPageToken?: string | null;
}

function mapVideo(raw: Partial<YoutubeVideo>): YoutubeVideo | null {
  if (!raw.videoId) return null;
  return {
    videoId: raw.videoId,
    title: raw.title ?? '',
    channelTitle: raw.channelTitle ?? '',
    thumbnailUrl: raw.thumbnailUrl || `https://i.ytimg.com/vi/${raw.videoId}/hqdefault.jpg`,
    durationSec: raw.durationSec ?? null,
    viewCount: raw.viewCount ?? null,
    publishedAt: raw.publishedAt ?? null,
  };
}

/** O YouTube pagina por `pageToken` — vira o `nextCursor` do app. Sem total conhecido. */
function toPaginated(page: FeedPage): Paginated<YoutubeVideo> {
  const items = (page.items ?? []).map(mapVideo).filter((v): v is YoutubeVideo => v !== null);
  return { items, nextCursor: page.nextPageToken ?? null, total: 0 };
}

export function createHttpYoutubeRepository(client: HttpClient): YoutubeRepository {
  return {
    async trending(params, options) {
      const page = await client.get<FeedPage>(
        ENDPOINTS.youtubeTrending,
        { category: params.category ?? undefined, pageToken: params.cursor ?? undefined },
        options,
      );
      return toPaginated(page);
    },

    async search(params, options) {
      const page = await client.get<FeedPage>(
        ENDPOINTS.youtubeSearch,
        { q: params.q, category: params.category ?? undefined, pageToken: params.cursor ?? undefined },
        options,
      );
      return toPaginated(page);
    },
  };
}
