import type { ApiError } from '~/types';

/** Cria um erro de API já normalizado (usado por mocks e pelo HTTP client). */
export function createApiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): ApiError {
  return { status, code, message, details };
}

export function isApiError(value: unknown): value is ApiError {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ApiError>;
  return (
    typeof candidate.status === 'number' &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string'
  );
}

/** Qualquer valor lançado vira um ApiError estável — nunca vaza erro cru ao app. */
export function toApiError(value: unknown): ApiError {
  if (isApiError(value)) return value;
  if (value instanceof Error) return createApiError(0, 'unknown_error', value.message);
  return createApiError(0, 'unknown_error', 'Erro inesperado.');
}

/**
 * Mensagem legível para o usuário, seja qual for a origem do erro:
 * proxy Nitro/h3 (`{ message }`), FastAPI (`{ detail }`) ou Error comum.
 */
export function readErrorMessage(value: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (!value || typeof value !== 'object') return fallback;

  const payload = (value as { data?: unknown }).data;

  if (payload && typeof payload === 'object') {
    const body = payload as { detail?: unknown; message?: unknown };

    if (typeof body.detail === 'string' && body.detail) return body.detail;
    if (body.detail && typeof body.detail === 'object') {
      const detail = body.detail as { message?: unknown };
      if (typeof detail.message === 'string' && detail.message) return detail.message;
    }
    if (typeof body.message === 'string' && body.message) return body.message;
  }

  if (value instanceof Error && value.message) return value.message;

  return fallback;
}
