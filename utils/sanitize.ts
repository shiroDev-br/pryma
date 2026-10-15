import { MAX_QUERY_LENGTH, MIN_SEARCH_CHARS } from '~/constants';

/**
 * Normalização canônica de texto — a MESMA que o backend aplica no índice de busca.
 * Garante que "Cão &AÇÃO" case com "cao &acao".
 */
export function normalizeText(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Query de busca pronta para ir ao servidor: normalizada e com tamanho limitado. */
export function sanitizeQuery(raw: string): string {
  return normalizeText(raw).slice(0, MAX_QUERY_LENGTH);
}

/** Consulta pronta para disparar request (respeita o mínimo de caracteres). */
export function isSearchableQuery(raw: string): boolean {
  return sanitizeQuery(raw).length >= MIN_SEARCH_CHARS;
}

/** Escapa metacaracteres de regex — usado em highlights de resultado. */
export function escapeRegExp(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Slugs seguros para URLs: "Globo News HD!" -> "globo-news-hd". */
export function sanitizeSlug(raw: string): string {
  return normalizeText(raw)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** E-mail normalizado (validação de formato é responsabilidade do backend). */
export function sanitizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
