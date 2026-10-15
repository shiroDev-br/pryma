# Resumo — o que está pronto para consumir a API

> Visão geral do que já existe no front para consumir a API, o formato de resposta que ela precisa dar e o que ela precisa fornecer.
> Fonte autorativa do contrato: [`docs/SPEC.md`](./SPEC.md).

## Stack e contexto

- **Nuxt 3** (Vue 3, SSR) + Nitro, TypeScript, Pinia, Tailwind.
- Camada de dados nova e funcional: `types/`, `constants/`, `services/`, `repositories/`, `mocks/`, `composables/`.
- **Modo atual:** `DATA_MODE=mock` (`.env`), `API_BASE_URL=http://localhost:8000`.
- Backend esperado: **FastAPI** — ainda não existe no repo (só os proxies Nitro).

## O que já está pronto

- **HTTP client** (`services/http.ts`): GET/POST/PATCH/DELETE tipados, timeout 15s, retry idempotente (backoff), auto-refresh em `401 session_expired` (1x + retry, com dedupe), erros normalizados em `ApiError {status, code, message, details}`.
- **Repositórios com contrato** (`repositories/contracts.ts`):
  - `MediaRepository`: `listCategories`, `listMedia`, `getMedia`, `getPlayback`, `search`, `suggest`
  - `AuthRepository`: `login`, `logout`, `refresh`, `me`, `updateProfile`
- **Factory mock|live** em um ponto só (`repositories/index.ts`): `DATA_MODE !== 'live'` ⇒ mock; os composables nunca sabem qual está ativo.
- **Mock completo** (`mocks/`): catálogo determinístico de 302.417 itens, auth demo (`demo@iptv.dev` / `password`), latência fake 60–220ms — implementa os mesmos contratos da API real.
- **Proxy Nitro** `server/api/v1/[....].ts`: repassa cookie httpOnly, `Cache-Control`, `Retry-After`; devolve `503 catalog_unavailable` se o backend cair.
- **Smoke test** na página `/dev` validando a camada ponta a ponta.
- **Futebol já com upstream real**: `/api/football/teams` e `/api/football/next` (Nitro → API-Football v3, cache + cota diária).

## Formato de resposta que a API precisa dar

### Sucesso

- Objeto puro, **sem envelope `{data}`**, status `200` (ou `201`/`204`).

### Erro

```json
{ "detail": { "code": "invalid_credentials", "message": "..." } }
```

(`detail` também pode ser string simples.) Códigos tratados pelo front:

| HTTP | `code` | Uso no front |
|---|---|---|
| 400 | `invalid_request` | busca < 2 chars, sort/limit inválido |
| 401 | `invalid_credentials` | login errado |
| 401 | `session_expired` | **dispara refresh 1x + retry** |
| 403 | `forbidden` | senha atual errada no profile |
| 404 | `not_found` | detalhe inexistente → 404 da rota |
| 422 | `validation_error` | Pydantic |
| 429 | `rate_limited` + `Retry-After` | login/search/suggest/heartbeat |
| 500 | `internal_error` | — |
| 503 | `catalog_unavailable` | backend caído (gerado pelo proxy) |

### Paginação

```ts
interface Paginated<T> { items: T[]; nextCursor: string | null; total: number }
```

- Cursor **opaco** (keyset, nunca OFFSET); `nextCursor === null` = fim.
- `limit` default **48**, máximo **100**.

### Cache-Control

| Recurso | Header |
|---|---|
| `/categories` | `public, max-age=300` |
| `/media`, `/search` | `private, max-age=15` |
| playback, auth | `no-store` |

## O que a API precisa fornecer — 12 endpoints

Base: `/api/v1` atrás do proxy Nitro (mesmo path), sessão em cookie `iptv_session` httpOnly.

| # | Endpoint | Método / Query | Resposta |
|---|---|---|---|
| 1 | `/auth/login` | POST `{email, password}` | `{ user }` + set cookie |
| 2 | `/auth/refresh` | POST | `{ user }` + novo cookie |
| 3 | `/auth/logout` | POST | `204` + limpa cookie (idempotente) |
| 4 | `/auth/me` | GET | `User` |
| 5 | `/auth/me` | PATCH | `User` |
| 6 | `/categories` | GET | `{ items: Category[] }` ordenado por `itemCount` desc, sem paginação |
| 7 | `/media` | GET `limit, cursor, category, type, sort` | `Paginated<MediaSummary>` |
| 8 | `/media/{id}` | GET | `MediaDetail` |
| 9 | `/media/{id}/playback` | GET | `PlaybackSession` (exige sessão) |
| 10 | `/search` | GET `q, limit, cursor, type` | `Paginated<MediaSummary>` por relevância |
| 11 | `/search/suggest` | GET `q, limit` | `{ items: Suggestion[] }` |
| 12 | `/playback/heartbeat` | POST `{mediaId, sessionId, positionSec}` | `204` sem corpo (a cada 30s via `sendBeacon`) |

### Shapes principais (espelhados em `types/`)

```ts
// types/media.ts
MediaSummary {
  id, title, slug, type: 'live'|'vod'|'series',
  categoryId|null, categoryName|null,
  logoUrl|null, thumbnailUrl|null, year|null,
  quality: '4K'|'1080p'|'720p'|'480p'|null,
  durationSec|null, isLive: boolean
}
MediaDetail = MediaSummary + { description|null, genres[], actors[], addedAt, streamCount }
Category    { id, name, slug, itemCount }
PlaybackSession { mediaId, url, protocol: 'hls'|'dash'|'file', headers|null, expiresAt }
Suggestion  { value, type: 'title'|'category'|'genre'|'actor', count }

// types/auth.ts
User { id, email, displayName, role: 'user'|'admin', createdAt }
AuthResponse { user: User }   // sem token no corpo
```

- **DTO de lista leve** (<500 B/item): sem descrição/atores/gênero em `/media` e `/search`.
- **Token nunca** no corpo nem em JS — só cookie httpOnly (TTL access ~15min + refresh próprio).

### Identidade de item (crítico)

- `id` estável no formato **`m<base36>`**.
- `slug = slugify(title) + '-' + id` — a rota `/medias/[...slug]` deriva o id do slug com regex `/^m[0-9a-z]+$/`; outro formato quebra o player com 404.

### Busca

- FTS sobre texto normalizado **igual ao `normalizeText` do front** (NFD sem diacríticos + lowercase + colapso de espaços) — "ção" deve casar com "cao".
- `q` mínimo 2 chars normalizados, máximo 100 chars.

### Requisitos de performance não-negociáveis (`SPEC.md`)

- Cursor keyset (sem OFFSET), `total` com cache, thumbnails ~300px, nenhum endpoint devolve catálogo inteiro sem `limit`.

## Mapa contrato → front

| Composable / serviço | Endpoint |
|---|---|
| `useMediaList` | `GET /media` |
| `useSearchResults` | `GET /search` |
| `useCategories` | `GET /categories` |
| `useMediaDetail` | `GET /media/{id}` |
| `useAuth` | `login` / `logout` / `me` |
| `mediaService.getPlayback` | `GET /media/{id}/playback` |
| `playerService.sendHeartbeat` | `POST /playback/heartbeat` |

Endpoints de futebol (Nitro, não FastAPI): `GET /api/football/teams?search=<q>` → `{ items: FavoriteTeam[] }`; `GET /api/football/next?team=<id>` → `NextFixtureResponse`.

## Pendências

1. Backend FastAPI não existe no repo (só proxies); caminho `live` nunca exercitado contra backend real.
2. `GET /auth/me` no boot não está ligado ao app shell (sem UI de conta no header).
3. `suggest()` implementado mas sem componente de autocomplete na UI.
4. Heartbeat no modo mock cai no proxy e retorna 503 (fire-and-forget, sem impacto visual).
5. `docs/PLAN.md:41` diz `{ suggestions: [] }`, mas o código e `SPEC.md` usam `{ items: [] }` — **SPEC vence**.
6. `OMDB_API_KEY` configurado e nunca usado (resíduo do template).
7. `plugins/socket.client.ts` é placeholder (socket.io hardcoded, sem uso).
8. Favoritos/ficam só em `localStorage` — não há endpoint de favoritos no contrato.
