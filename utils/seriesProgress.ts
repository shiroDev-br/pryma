import { STORAGE_KEYS, SERIES_PROGRESS_MAX } from '~/constants';

/** Último episódio assistido de uma série — marca "continuar/último" nas listagens. */
export interface SeriesProgressEntry {
  mediaId: string;
  slug: string;
  title: string;
  season: number | null;
  episode: number | null;
  positionSec: number;
  durationSec: number;
  updatedAt: number;
}

export type SeriesProgressMap = Record<string, SeriesProgressEntry>;

function readMap(): SeriesProgressMap {
  if (import.meta.server) return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.seriesProgress);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SeriesProgressMap;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: SeriesProgressMap): void {
  if (import.meta.server) return;

  try {
    localStorage.setItem(STORAGE_KEYS.seriesProgress, JSON.stringify(map));
  } catch {
    /* storage cheio/indisponível — segue sem marcador */
  }
}

/** Mapa inteiro (uma leitura) — cards de série marcam o último assistido. */
export function loadSeriesProgressMap(): SeriesProgressMap {
  return readMap();
}

export function loadSeriesProgress(seriesId: string): SeriesProgressEntry | null {
  return readMap()[seriesId] ?? null;
}

/** Grava o episódio mais recente da série (LRU por updatedAt, cap em SERIES_PROGRESS_MAX). */
export function saveSeriesProgress(
  seriesId: string,
  entry: Omit<SeriesProgressEntry, 'updatedAt'>,
): void {
  if (!seriesId) return;

  const map = readMap();
  map[seriesId] = { ...entry, updatedAt: Date.now() };

  const keys = Object.keys(map);
  if (keys.length > SERIES_PROGRESS_MAX) {
    keys.sort((a, b) => map[b].updatedAt - map[a].updatedAt);
    for (const key of keys.slice(SERIES_PROGRESS_MAX)) delete map[key];
  }

  writeMap(map);
}
