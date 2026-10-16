import { STORAGE_KEYS, RESUME_MIN_SECONDS, RESUME_MAX_RATIO } from '~/constants';
import type { MediaType } from '~/types';

interface WatchProgress {
  positionSec: number;
  durationSec: number;
  updatedAt: number;
  /** Tipo da mídia ('vod' | 'series') — distingue filmes de séries nos recentes. */
  type?: MediaType;
}

type ProgressMap = Record<string, WatchProgress>;

function readMap(): ProgressMap {
  if (import.meta.server) return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.watchProgress);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressMap;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/** Mapa inteiro (uma leitura só) — para marcar listas de episódios sem N roundtrips. */
export function loadWatchPositions(): ProgressMap {
  return readMap();
}

function writeMap(map: ProgressMap): void {
  if (import.meta.server) return;

  try {
    localStorage.setItem(STORAGE_KEYS.watchProgress, JSON.stringify(map));
  } catch {
    /* storage cheio/indisponível — segue sem resume */
  }
}

/** Posição salva que vale a pena retomar, ou null (começa do zero). */
export function loadWatchPosition(mediaId: string, durationSec: number | null | undefined): number | null {
  const entry = readMap()[mediaId];
  if (!entry) return null;

  const duration = durationSec ?? entry.durationSec;
  if (!duration) return null;

  if (entry.positionSec < RESUME_MIN_SECONDS) return null;
  if (entry.positionSec >= duration * RESUME_MAX_RATIO) return null;

  return Math.floor(entry.positionSec);
}

/** Grava a posição atual. Conclusão (≥95%) apaga o registro. */
export function saveWatchPosition(
  mediaId: string,
  positionSec: number,
  durationSec: number,
  type?: MediaType,
): void {
  if (!mediaId || !durationSec) return;

  const map = readMap();

  if (positionSec >= durationSec * RESUME_MAX_RATIO) {
    if (mediaId in map) {
      delete map[mediaId];
      writeMap(map);
    }
    return;
  }

  map[mediaId] = {
    positionSec: Math.floor(positionSec),
    durationSec,
    updatedAt: Date.now(),
    // `type: undefined` some no JSON.stringify — entradas legadas ficam sem o campo.
    type,
  };
  writeMap(map);
}
