import {
  appendResponseHeader,
  getMethod,
  getRequestHeader,
  readRawBody,
  setResponseHeader,
  setResponseStatus,
} from 'h3';
import type { H3Event } from 'h3';

const FORWARDED_RESPONSE_HEADERS = ['content-type', 'cache-control', 'retry-after'] as const;

/**
 * Proxy transparente: browser fala /api/v1/*, Nitro repassa para o FastAPI
 * mantendo cookie httpOnly fora do JavaScript. Só o que é seguro/e necessário atravessa.
 */
export async function proxyToFastapi(event: H3Event): Promise<string | undefined> {
  const { apiBaseUrl } = useRuntimeConfig(event);
  const method = getMethod(event);
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readRawBody(event).catch(() => undefined);

  let response: Response;

  try {
    response = await fetch(apiBaseUrl + event.path, {
      method,
      headers: buildForwardHeaders(event),
      body: body as BodyInit | undefined,
      redirect: 'manual',
    });
  } catch {
    // Falha de rede com o backend — mantém o shape de erro do contrato (SPEC §4.2).
    setResponseStatus(event, 503);
    setResponseHeader(event, 'content-type', 'application/json');
    return JSON.stringify({
      detail: { code: 'catalog_unavailable', message: 'Catálogo indisponível. Tente novamente.' },
    });
  }

  setResponseStatus(event, response.status);
  forwardResponseHeaders(event, response);

  const text = await response.text();
  return text || undefined;
}

function buildForwardHeaders(event: H3Event): Headers {
  const headers = new Headers({ accept: 'application/json' });

  const cookie = getRequestHeader(event, 'cookie');
  if (cookie) headers.set('cookie', cookie);

  const contentType = getRequestHeader(event, 'content-type');
  if (contentType) headers.set('content-type', contentType);

  return headers;
}

function forwardResponseHeaders(event: H3Event, response: Response): void {
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(name);
    if (value) setResponseHeader(event, name, value);
  }

  // Set-Cookie pode ser repetido — repassa todos (refresh/login definem cookie novo).
  for (const cookie of response.headers.getSetCookie()) {
    appendResponseHeader(event, 'set-cookie', cookie);
  }
}
