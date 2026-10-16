import { loadWatchPositions } from './watchProgress';
import { loadSeriesProgressMap } from './seriesProgress';
import type { MediaType } from '~/types';

/** Slug da rota "Continuar assistindo" — categoria sintética do trilho de browse. */
export const RECENTS_SLUG = 'recents';

/** Teto de itens exibidos nos recentes. */
const RECENTS_MAX = 30;

/** Tipos com progresso local — `live` não tem "continuar assistindo". */
export type RecentsType = Exclude<MediaType, 'live'>;

interface RecentEntry {
  id: string;
  updatedAt: number;
}

/**
 * Entradas brutas de progresso de um tipo, do mais recente pro mais antigo.
 *
 * - **Séries** vêm de `seriesProgress` — uma por série, apontando pro último
 *   episódio assistido.
 * - **Filmes** vêm de `watchProgress`; entradas sem `type` foram gravadas por
 *   versões antigas e contam como filme.
 */
function recentEntries(type: RecentsType): RecentEntry[] {
  if (type === 'series') {
    return Object.values(loadSeriesProgressMap()).map((entry) => ({
      id: entry.mediaId,
      updatedAt: entry.updatedAt,
    }));
  }

  return Object.entries(loadWatchPositions())
    .filter(([, progress]) => (progress.type ?? 'vod') === 'vod')
    .map(([id, progress]) => ({ id, updatedAt: progress.updatedAt }));
}

/**
 * Ids a resolver via API — ordenados por recência, sem repetir e limitados a
 * `RECENTS_MAX`, para buscar no máximo essa quantidade de detalhes.
 */
export function getRecentMediaIds(type: RecentsType): string[] {
  const seen = new Set<string>();

  return recentEntries(type)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, RECENTS_MAX)
    .map((entry) => entry.id)
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

/** Existe progresso local (filme ou série) pra exibir o card "Continuar assistindo". */
export function hasRecentProgress(): boolean {
  return (
    Object.keys(loadWatchPositions()).length > 0 ||
    Object.keys(loadSeriesProgressMap()).length > 0
  );
}
