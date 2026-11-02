import type { HttpClient } from '~/services/http';
import { ENDPOINTS } from '~/constants';
import type { WallpaperRepository } from '~/repositories/contracts';
import type { Paginated, Wallpaper, WallpaperCategory } from '~/types';

/** GET /wallpapers (cursor) e /wallpapers/categories — só fundos prontos e visíveis. */
export function createHttpWallpaperRepository(client: HttpClient): WallpaperRepository {
  return {
    list: (params, options) =>
      client.get<Paginated<Wallpaper>>(
        ENDPOINTS.wallpapers,
        { category: params.category, limit: params.limit, cursor: params.cursor },
        options,
      ),

    listCategories: (options) =>
      client.get<{ items: WallpaperCategory[] }>(ENDPOINTS.wallpaperCategories, undefined, options),
  };
}

/** Modo mock: sem fundos animados — a tela mostra só os fundos locais. */
export const emptyWallpaperRepository: WallpaperRepository = {
  list: async () => ({ items: [], nextCursor: null, total: 0 }),
  listCategories: async () => ({ items: [] }),
};
