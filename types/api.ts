/** Shape de erro retornado pela API (FastAPI HTTPException.detail). */
export interface ApiErrorBody {
  detail:
    | string
    | {
        code?: string;
        message?: string;
        details?: unknown;
      };
}

/** Erro normalizado usado em TODO o app. Nunca vaza um fetch cru. */
export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

/** Página única retornada pela API — paginação por cursor/keyset. */
export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}

export type RequestStatus = 'idle' | 'pending' | 'success' | 'error';

/** Valores aceitos em query string. `null`/`undefined` são descartados. */
export type QueryValue = string | number | boolean | null | undefined;

export type QueryParams = Record<string, QueryValue>;

export interface ApiRequestOptions {
  signal?: AbortSignal;
  /**
   * Se `false`, um `401 session_expired` NÃO dispara o refresh automático —
   * usado pelo próprio `POST /auth/refresh` para não tentar se renovar
   * recursivamente (evita deadlock quando o refresh token também está morto).
   */
  allowRefresh?: boolean;
}
