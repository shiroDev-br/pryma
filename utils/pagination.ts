import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '~/constants';

/** Garante um `limit` dentro dos limites do contrato [1, MAX_PAGE_SIZE]. */
export function clampLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_PAGE_SIZE);
}
