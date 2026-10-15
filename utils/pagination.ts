import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '~/constants';

/** Garante um `limit` dentro dos limites do contrato [1, MAX_PAGE_SIZE]. */
export function clampLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_PAGE_SIZE);
}

/** Páginas vizinhas para a barra de paginação numerada (fase 2). */
export function buildPageWindow(current: number, total: number, span = 5): number[] {
  if (total <= 0) return [];

  const half = Math.floor(span / 2);
  const start = Math.max(1, Math.min(current - half, total - span + 1));
  const end = Math.min(total, start + span - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
