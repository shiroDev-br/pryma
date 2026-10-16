import { useRuntimeConfig } from '#imports';
import { HTTP_TIMEOUT_MS, MAX_RETRIES } from '~/constants';
import { createApiError, toApiError } from '~/utils/errors';
import { getAccessToken } from '~/utils/tokenStorage';
import type { ApiError, ApiRequestOptions, QueryParams } from '~/types';

/**
 * Resolve contra a base pública da API (`runtimeConfig.public.apiBaseUrl`).
 * No APK não existe proxy Nitro — o browser fala direto com o FastAPI
 * (a origem do Capacitor é localhost, por isso a base é absoluta).
 */
function resolveUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;

  const base = String(useRuntimeConfig().public.apiBaseUrl || '').replace(/\/+$/, '');
  if (!base) return path;
  return base + path;
}

export interface HttpClient {
  get<T>(path: string, query?: QueryParams, options?: ApiRequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T>;
  patch<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T>;
  delete<T>(path: string, options?: ApiRequestOptions): Promise<void>;
}

export interface HttpClientOptions {
  /**
   * Chamado quando a API responde 401 `session_expired`.
   * Retorna `true` se a sessão foi renovada — a request original é repetida uma única vez.
   */
  onSessionExpired?: () => Promise<boolean>;
  maxRetries?: number;
  timeoutMs?: number;
}

/** Monta query string descartando vazios — fonte única do encoding. */
export function buildQueryString(query: QueryParams = {}): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

function resolveSignal(external: AbortSignal | undefined, timeoutMs: number) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = external ? AbortSignal.any([external, timeoutSignal]) : timeoutSignal;

  return { signal, timedOut: () => timeoutSignal.aborted };
}

function extractErrorDetail(payload: unknown): { code: string; message: string } {
  const detail = (payload as { detail?: unknown } | null)?.detail;

  if (typeof detail === 'string') return { code: 'unknown_error', message: detail };
  if (detail && typeof detail === 'object') {
    const { code, message } = detail as { code?: unknown; message?: unknown };
    return {
      code: typeof code === 'string' ? code : 'unknown_error',
      message: typeof message === 'string' ? message : 'Ocorreu um erro inesperado.',
    };
  }

  return { code: 'unknown_error', message: 'Ocorreu um erro inesperado.' };
}

async function parsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function isApiErrorLike(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as ApiError).status === 'number' &&
    typeof (error as ApiError).code === 'string'
  );
}

function shouldRetry(method: string, attempt: number, status: number): boolean {
  const isIdempotent = method === 'GET' || method === 'HEAD';
  if (!isIdempotent || attempt >= MAX_RETRIES) return false;
  return status === 0 || status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const timeoutMs = options.timeoutMs ?? HTTP_TIMEOUT_MS;
  const onSessionExpired = options.onSessionExpired;

  async function send<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: QueryParams,
    requestOptions?: ApiRequestOptions,
  ): Promise<T> {
    let attempt = 0;
    const allowRefresh = requestOptions?.allowRefresh ?? true;

    while (true) {
      const { signal, timedOut } = resolveSignal(requestOptions?.signal, timeoutMs);

      try {
        const token = getAccessToken();
        const response = await fetch(resolveUrl(path) + buildQueryString(query), {
          method,
          signal,
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        const payload = await parsePayload(response);

        if (response.ok) return payload as T;

        const { code, message } = extractErrorDetail(payload);
        const apiError = createApiError(response.status, code, message, payload);

        if (shouldRetry(method, attempt, response.status)) {
          attempt += 1;
          await delay(200 * attempt);
          continue;
        }

        throw apiError;
      } catch (error) {
        if (isApiErrorLike(error)) {
          const canRefresh = allowRefresh && onSessionExpired && error.status === 401 && error.code === 'session_expired';

          if (canRefresh) {
            const refreshed = await onSessionExpired().catch(() => false);
            if (refreshed) {
              // Retry único sem voltar a tentar refresh (evita loop se o retry de novo expirar).
              return send<T>(method, path, body, query, { ...requestOptions, allowRefresh: false });
            }
          }

          throw error;
        }

        const isTimeout = error instanceof Error && error.name === 'TimeoutError';
        const isAbort = error instanceof Error && error.name === 'AbortError';

        if (isAbort && !isTimeout) throw error;

        const retryStatus = isTimeout ? 503 : 0;
        if (shouldRetry(method, attempt, retryStatus)) {
          attempt += 1;
          await delay(200 * attempt);
          continue;
        }

        if (isTimeout) {
          throw createApiError(0, 'timeout', 'Tempo de resposta esgotado.');
        }

        throw toApiError(error);
      }
    }
  }

  return {
    get: <T>(path: string, query?: QueryParams, requestOptions?: ApiRequestOptions) =>
      send<T>('GET', path, undefined, query, requestOptions),
    post: <T>(path: string, body?: unknown, requestOptions?: ApiRequestOptions) =>
      send<T>('POST', path, body, undefined, requestOptions),
    patch: <T>(path: string, body?: unknown, requestOptions?: ApiRequestOptions) =>
      send<T>('PATCH', path, body, undefined, requestOptions),
    delete: <T>(path: string, requestOptions?: ApiRequestOptions) =>
      send<T>('DELETE', path, undefined, undefined, requestOptions),
  };
}
