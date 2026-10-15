# SPEC — API IPTV (FastAPI) · Contrato v1

> Fonte única da verdade do contrato entre o frontend (Nuxt) e o backend (FastAPI).
> Este documento é **autoritativo**: o backend será implementado seguindo-o e o frontend consome exatamente o que está aqui descrito.
> Idioma: PT-BR. Nomes de endpoints, campos e tipos permanecem em inglês.

---

## 1. Visão geral

- Backend: **FastAPI** servindo um catálogo M3U com **300k+ itens** (live, VOD, séries).
- Frontend: **Nuxt 3**, acessa o backend exclusivamente via **proxy do Nitro** em `/api/v1/*` (mesmos caminhos — o proxy é transparente).
- Autenticação: **cookie httpOnly** (`iptv_session`). O token **nunca** aparece em corpo de resposta nem em JavaScript.
- Base URL (interna, server-side only): `API_BASE_URL` (ex.: `http://fastapi:8000`).
- Versão: path prefix `/api/v1`.

## 2. Requisitos funcionais

| # | Requisito | Endpoints |
|---|-----------|-----------|
| R1 | Login/logout/sessão dentro da conta | `auth/*` |
| R2 | Listar catálogo paginado (sem carregar 300k) | `GET /media` |
| R3 | Buscar por texto (título, ator, gênero, categoria) | `GET /search`, `GET /search/suggest` |
| R4 | Listar categorias (group-title do M3U) | `GET /categories` |
| R5 | Detalhe de um item | `GET /media/{id}` |
| R6 | Obter sessão de playback (URL assinada) | `GET /media/{id}/playback` |
| R7 | Reportar heartbeat de reprodução | `POST /playback/heartbeat` |
| R8 | Editar perfil | `PATCH /auth/me` |

## 3. Regras de performance (obrigatórias no backend)

1. **Paginação por cursor/keyset** — nunca `OFFSET` profundo. Cursor é opaco (base64 de `(sort_value, id)`).
2. **DTO de lista leve** (`MediaSummary`): sem descrição, atores ou gênero. Payload alvo < 500 B/item.
3. **Busca indexada** (FTS) sobre texto **normalizado** (lowercase + NFD sem diacríticos) — mesma normalização do frontend (`normalizeText`).
4. **`total`** calculado com cache (ex.: 30s) ou aproximado em listas gigantes; exato apenas na primeira página quando barato.
5. **Thumbnails** servidos pré-redimensionados (~300px de largura).
6. **Índices**: `(category_slug, sort_key, id)`, FTS sobre `title/actors/genres/category_name`.
7. **Rate limit** por IP/sessão (ver §7).
8. Nenhum endpoint retorna o catálogo completo sem `limit`.

## 4. Convenções

### 4.1 Sucesso
Resposta `200` (ou `201`/`204` quando aplicável) com o **objeto puro** (sem envelope `{data}`):

```json
{ "items": [...], "nextCursor": "eyJ...", "total": 302411 }
```

### 4.2 Erro
FastAPI padroniza `HTTPException` com `detail` **objeto**:

```json
{
  "detail": {
    "code": "invalid_credentials",
    "message": "E-mail ou senha inválidos."
  }
}
```

Códigos de erro padronizados:

| HTTP | `code` | Quando |
|------|--------|--------|
| 400 | `invalid_request` | Query/body malformado |
| 401 | `invalid_credentials` | Login com credenciais erradas |
| 401 | `session_expired` | Cookie inválido/expirado |
| 403 | `forbidden` | Autenticado mas sem permissão |
| 404 | `not_found` | Recurso inexistente |
| 422 | `validation_error` | Pydantic falhou (`details.errors` opcional) |
| 429 | `rate_limited` | Rate limit (header `Retry-After`) |
| 500 | `internal_error` | Erro inesperado |
| 503 | `catalog_unavailable` | Catálogo/M3U fora do ar |

O frontend **normaliza** qualquer erro em `ApiError { status, code, message, details }`.

### 4.3 Paginação (cursor)

Request aceita `limit` (default **48**, máx **100**) e `cursor` (string opaca).
Resposta:

```ts
{ items: T[]; nextCursor: string | null; total: number }
```

`nextCursor === null` → fim da lista. `total` é o total **do filtro atual**, não do catálogo inteiro.

### 4.4 Autenticação

- Cookie: `iptv_session` — `HttpOnly`, `SameSite=Lax`, `Secure` (produção), `Path=/`, TTL access curto (15 min) + refresh via rota própria.
- O corpo das respostas de auth **não** contém token — apenas `User`.
- 401 com `session_expired` → o client tenta `POST /auth/refresh` **uma vez** e repete a request; se falhar, logout.

### 4.5 Headers de cache

| Recurso | `Cache-Control` |
|---------|-----------------|
| `/categories` | `public, max-age=300` |
| `/media`, `/search` | `private, max-age=15` |
| `/media/{id}/playback` | `no-store` |
| `auth/*` | `no-store` |

---

## 5. Schemas (espelho TypeScript — Pydantic no backend)

```ts
type MediaType = 'live' | 'vod' | 'series';
type MediaQuality = '4K' | '1080p' | '720p' | '480p';
type MediaSort = 'title' | '-title' | 'added' | '-added' | 'year' | '-year';

/** Item leve de listagem — NUNCA incluir descrição/atores/gênero. */
interface MediaSummary {
  id: string;                  // id estável (hash do stream id do M3U)
  title: string;
  slug: string;
  type: MediaType;
  categoryId: string | null;
  categoryName: string | null; // group-title original do M3U
  logoUrl: string | null;
  thumbnailUrl: string | null;
  year: number | null;
  quality: MediaQuality | null;
  durationSec: number | null;  // null para live
  isLive: boolean;
}

interface MediaDetail extends MediaSummary {
  description: string | null;
  genres: string[];
  actors: string[];
  addedAt: string;             // ISO 8601
  streamCount: number;         // fontes alternativas disponíveis
}

interface Category {
  id: string;
  name: string;
  slug: string;
  itemCount: number;
}

interface PlaybackSession {
  mediaId: string;
  url: string;                 // URL assinada/proxied do stream
  protocol: 'hls' | 'dash' | 'file';
  headers: Record<string, string> | null; // headers exigidos pelo CDN
  expiresAt: string;           // ISO 8601
}

interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  createdAt: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface UpdateProfilePayload {
  displayName?: string;
  currentPassword?: string;    // exigido apenas se newPassword presente
  newPassword?: string;
}

interface HeartbeatPayload {
  mediaId: string;
  sessionId: string;           // uuid gerado no client por sessão de play
  positionSec: number;
}

interface Suggestion {
  value: string;
  type: 'title' | 'category' | 'genre' | 'actor';
  count: number;
}

interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}

interface MediaQuery {
  limit?: number;              // default 48, máx 100
  cursor?: string | null;
  category?: string;           // slug da categoria
  type?: MediaType;
  sort?: MediaSort;            // default '-added'
}

interface SearchParams {
  q: string;                   // já normalizado pelo client (min 2 chars)
  limit?: number;
  cursor?: string | null;
  type?: MediaType;
}
```

---

## 6. Endpoints

Base: `/api/v1`. Todas as respostas de erro seguem §4.2.

### 6.1 `POST /auth/login`

Body: `LoginPayload`
Sucesso `200`:
```json
{ "user": { "id": "...", "email": "...", "displayName": "...", "role": "user", "createdAt": "..." } }
```
Efeito colateral: define cookie `iptv_session`.
Erros: `401 invalid_credentials`, `422 validation_error`, `429 rate_limited`.

### 6.2 `POST /auth/refresh`

Sem body (usa o cookie atual).
Sucesso `200`: `{ "user": User }` + novo cookie.
Erros: `401 session_expired`.

### 6.3 `POST /auth/logout`

Sucesso `204` + limpa o cookie.
Erros: nenhuma relevante (idempotente).

### 6.4 `GET /auth/me`

Sucesso `200`: `User`.
Erros: `401 session_expired`.

### 6.5 `PATCH /auth/me`

Body: `UpdateProfilePayload`
Sucesso `200`: `User` atualizado.
Erros: `401 session_expired`, `403 forbidden` (senha atual errada → `invalid_credentials`), `422 validation_error`.

### 6.6 `GET /categories`

Query: nenhuma.
Sucesso `200`:
```json
{ "items": [ { "id": "...", "name": "Globosat", "slug": "globosat", "itemCount": 1842 } ] }
```
Ordenado por `itemCount` desc. Sem paginação (dezenas de categorias, não 300k).

### 6.7 `GET /media`

Query: `MediaQuery` (`limit`, `cursor`, `category`, `type`, `sort`).
Sucesso `200`: `Paginated<MediaSummary>`.
Erros: `400 invalid_request` (sort/limit inválidos), `404 not_found` (categoria slug inexistente).

### 6.8 `GET /media/{id}`

Sucesso `200`: `MediaDetail`.
Erros: `404 not_found`.

### 6.9 `GET /media/{id}/playback`

Exige sessão válida.
Sucesso `200`: `PlaybackSession`.
Erros: `401 session_expired`, `404 not_found`, `503 catalog_unavailable`.

### 6.10 `GET /search`

Query: `SearchParams` (`q`, `limit`, `cursor`, `type`).
Sucesso `200`: `Paginated<MediaSummary>` — ordenado por relevância.
Erros: `400 invalid_request` (`q` vazio ou < 2 chars normalizados), `429 rate_limited`.

### 6.11 `GET /search/suggest`

Query: `q` (min 2 chars), `limit` (default 8, máx 20).
Sucesso `200`: `{ "items": Suggestion[] }`.
Erros: `400`, `429`.

### 6.12 `POST /playback/heartbeat`

Body: `HeartbeatPayload`
Sucesso `204` (sem corpo). Cliente envia a cada **30s** durante a reprodução, via `navigator.sendBeacon`.
Erros: silenciosas no client (fire-and-forget).

---

## 7. Rate limit

| Rota | Limite |
|------|--------|
| `POST /auth/login` | 5/min por IP |
| `GET /search` | 60/min por sessão |
| `GET /search/suggest` | 30/min por sessão |
| `POST /playback/heartbeat` | 4/min por sessão |

Ao estourar: `429` + header `Retry-After` (segundos).

## 8. Fluxo de sessão

```
login  → server set cookie iptv_session (HttpOnly)
request autenticada → browser manda cookie automaticamente → Nitro repassa p/ FastAPI
401 session_expired → client: POST /auth/refresh (1x) → retry da request original → se falhar: logout
logout → server limpa cookie
SSR   → useRequestForward repassa cookie da request incoming; estado inicial via /auth/me
```

## 9. Notas de implementação FastAPI

- **Cursor keyset**: `cursor = base64({ sortValue, id })`; query usa `(sort_col, id) > (sortValue, id)` com o `ORDER BY` correspondente. Trocar o `sort` invalida o cursor (aceitar e retornar `400`).
- **Normalização de busca**: aplicar `lowercase + NFD removendo combining chars` na indexação e na query — idêntico ao `normalizeText` do frontend, para "ção" casar com "cao".
- **FTS**: SQLite FTS5 ou Postgres `tsvector` + `pg_trgm` para suggestions (prefix match).
- **Cursor de busca**: ordenar por relevância exige ranking estável — usar `(score, id)` no cursor.
- **Slug**: `slugify(title)` com fallback para `id` em colisão.
- **M3U**: reindexação incremental por hash; `itemCount` das categorias recalculado no sync.

## 10. Proxy Nitro (regras)

- Rota catch-all `/server/api/v1/[...].ts` repassa: método, path, query string, body e o header `Cookie` para `${API_BASE_URL}/api/v1/...`.
- Headers de resposta repassados: `Set-Cookie`, `Cache-Control`, `Retry-After`.
- Em `DATA_MODE=mock`, o proxy **não é usado** (o repository intercepta no browser antes do fetch).
- Timeout de 15s; erro de rede → `503 catalog_unavailable`.

## 11. Mapa contrato → frontend

| Composable (fase 1) | Endpoint |
|---|---|
| `useMediaList` | `GET /media` |
| `useSearchResults` | `GET /search` |
| `useCategories` | `GET /categories` |
| `useMediaDetail` | `GET /media/{id}` |
| `useAuth().login/logout/hydrate` | `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` |
| `usePlayer().sendHeartbeat` | `POST /playback/heartbeat` |
| `mediaService.getPlayback` | `GET /media/{id}/playback` |
