# Plano — Fase 1: Contratos, camada de dados e mocks (IPTV × FastAPI)

## Contexto

O repo atual é um template Nuxt 3 (IPTV) que usa **Nuxt Content** com 8 JSONs de mídia e OMDB. O objetivo é transformá-lo no frontend de um app IPTV real que consome uma API **FastAPI** servindo uma playlist M3U com **300k+ conteúdos**. O gargalo clássico aqui é: buscar/rankear/filtrar 300k itens. Por isso toda a filosofia é **servidor pagina, cliente nunca itera catálogo inteiro**.

**Fase 1 (este plano):** criar o arquivo de especificação (contrato REST + requisitos) e toda a camada de dados independente — tipos, utils, services, mocks, repositórios, composables e stores — com **DRY, responsabilidades divididas e zero aninhamento profundo**. Nada do layout/UI atual quebra.

**Fase 2 (fase futura, fora deste plano):** refatorar layout/páginas, remover Nuxt Content + OMDB, grid virtualizado, player HLS, middleware de auth.

## Decisões fechadas (com você)

| Tema | Decisão |
|---|---|
| Contrato REST | Eu defino do zero; FastAPI seguirá o doc |
| Auth | Proxy Nitro (`/server/api/*`) → FastAPI; sessão em cookie **httpOnly**, sem CORS, SSR herda cookie |
| Renderização gigante | `@tanstack/vue-virtual` |
| Nuxt Content atual | Mantido até a fase de layout |
| Arquivo de contrato | `docs/SPEC.md` em **Português (BR)** (código/funções em inglês) |
| Package manager | npm (já há `package-lock.json` e `node_modules` instalados via npm) |

## 1. Arquivo de contrato — `docs/SPEC.md` (PT-BR)

Conteúdo:

- **Requisitos do produto**: login/conta, catálogo (live/VOD), busca, categorias, player (play/pause/seek/volume), favoritos/recentes.
- **Regras de performance** (doutrina anti-gargalo): paginação server-side por **cursor/keyset** (nunca OFFSET profundo), DTO de lista "leve" (<~500 B/item, sem descrição/atores), debounce + cancelamento de busca, DOM constante via virtualização, imagens lazy com aspect fixo, cache de categorias, sem `filter` client-side sobre o catálogo.
- **Contrato REST v1** (sucesso = objeto puro FastAPI-idiomático; erro = `{ detail }` normalizado no client em `ApiError`):

```
POST   /api/v1/auth/login          -> { access_token?, session }   (cookie httpOnly)
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me             -> User
PATCH  /api/v1/auth/me             -> User
GET    /api/v1/categories          -> { items: Category[] }
GET    /api/v1/media               -> Paginated<MediaSummary>   (?limit&cursor&category&type&sort&q)
GET    /api/v1/media/{id}          -> MediaDetail
GET    /api/v1/media/{id}/playback -> PlaybackSession (url, protocol, headers, expiresAt)
GET    /api/v1/search              -> Paginated<MediaSummary>   (?q&limit&cursor)
GET    /api/v1/search/suggest      -> { suggestions: Suggestion[] }  (?q&limit=8)
POST   /api/v1/playback/heartbeat  -> 204 (fire-and-forget via sendBeacon)
```

- **Tipos públicos** documentados: `MediaSummary`, `MediaDetail`, `Category`, `PlaybackSession`, `Paginated<T>`, `User`, `ApiError`, `MediaQuery`, `SearchParams`.
- **Fluxo de auth**: cookie `iptv_session` httpOnly; 401 → 1× `refresh` silencioso → retry único → logout; SSR usa `useRequestFetch` para repassar cookie.

## 2. Estrutura nova (arquivos a criar)

```
docs/SPEC.md
types/                      # fonte única da verdade de dados
  api.ts        Paginated<T>, ApiError, RequestStatus, ApiRequestOptions
  media.ts      MediaSummary, MediaDetail, Category, PlaybackSession,
                MediaQuery, SearchParams, Suggestion
  auth.ts       User, LoginPayload, UpdateProfilePayload
  index.ts      re-exports (import de um único lugar no código)
constants/index.ts          # ENDPOINTS, DEFAULT_PAGE_SIZE=48, MAX_PAGE_SIZE=100,
                            # DEBOUNCE_MS=300, MIN_SEARCH_CHARS=2, MAX_QUERY_LENGTH=100
utils/sanitize.ts           # normalizeText, sanitizeQuery, sanitizeEmail, sanitizeSlug, escapeRegExp
utils/pagination.ts         # clampLimit, buildPageWindow
utils/format.ts             # formatDuration, formatNumber
services/http.ts            # createHttpClient: request<T>, query builder, error mapping,
                            # AbortController, retry idempotente, 401→refresh hook
services/endpoints.ts       # builders de path/query (fonte única dos ENDPOINTS)
services/media.service.ts   # listCategories, listMedia, getMedia, searchMedia,
                            # getSuggestions, getPlayback
services/auth.service.ts    # login, logout, refresh, getMe, updateProfile
services/player.service.ts  # sendHeartbeat (sendBeacon + fallback keepalive)
repositories/
  media.repository.ts       # MediaRepository (interface) + factory mock|live
  auth.repository.ts        # idem para auth
mocks/
  generator.ts              # catálogo determinístico (PRNG com seed), geração lazy
  media.mock.ts             # implementa MediaRepository sobre o generator
  auth.mock.ts              # sessão fake com atraso simulado
  latency.ts                # simulateLatency(min, max) — única forma de fake delay
composables/
  useDebouncedValue.ts
  useSanitizedSearch.ts     # sanitize + debounce + minChars + abort de resposta velha
  usePaginatedQuery.ts      # núcleo genérico: items, status, error, loadMore, refresh, abort
  useMediaList.ts           # usePaginatedQuery(listMedia)
  useSearchResults.ts
  useCategories.ts          # cache em sessão
  useMediaDetail.ts
  useAuth.ts                # user, isAuthenticated, login, logout, hydrate
  usePlayer.ts              # play, pause, toggle, seek, setVolume, isPlaying, currentTime
  useRouteQueryState.ts     # página/busca/filtros sincronizados com a URL
  useIntersectionObserver.ts
stores/
  auth.ts                   # estado de sessão + ações (fonte da verdade do user)
  player.ts                 # expandido: currentMedia, isPlaying, volume, muted, position
  preferences.ts            # recentes/favoritos, persistidos via localStorage
server/
  utils/fastapi.ts          # fetch interno p/ FastAPI (live mode), forward de cookie
  api/v1/[....ts]           # proxy catch-all /api/v1/* → API_BASE_URL (somente live)
nuxt.config.ts              # runtimeConfig.public.dataMode ('mock'|'live'), API_BASE_URL
.env / .env.example         # DATA_MODE=mock, API_BASE_URL=
pages/dev/index.vue         # página de fio nu, dev-only, p/ validar a camada de dados
                            # (será substituída na fase 2)
```

## 3. Pontos de arquitetura-chave

### Troca mock/live (1 ponto só — DRY)
```ts
// repositories/*.ts
export const mediaRepository: MediaRepository =
  useRuntimeConfig().public.dataMode === 'mock' ? mockMediaRepository : httpMediaRepository;
```
Services nunca sabem se é mock ou real. Nenhuma página/componente referencia mock.

### `usePaginatedQuery` (núcleo de listagem, search e infinite scroll)
- Assinatura: `usePaginatedQuery<T>(fetcher: (p, signal) => Promise<Paginated<T>>, opts)`
- Estado: `items`, `status: 'idle'|'pending'|'success'|'error'`, `error`, `hasNext`, `total`
- Ações: `loadMore()`, `refresh()`, `reset()`
- Cancela a request anterior (AbortController) — nunca race condition entre digitações/páginas
- Key/cache derivado dos params canônicos (`useAsyncData`) — dedupe de GET idêntico
- Itens acumulados com `shallowRef` + concat imutável (sem reatividade profunda em 300k)

### Busca performática
`useSanitizedSearch` → `query` (crua) e `debouncedQuery` (normalizada: trim, colapso de espaços, NFD sem diacríticos, lowercase, cap de `MAX_QUERY_LENGTH`, min chars). Dispara request apenas quando o valor canônico muda e cancela a anterior.

### Player (fase 1 = contrato e composable; fase 2 = UI)
`usePlayer(videoEl)` envolve Plyr (já é dependência): `play/pause/toggle/seek/setVolume`, sincroniza com `stores/player`. Heartbeat de posição via `sendHeartbeat` (beacon). **hls.js** fica para a fase 2 (streams M3U8) — será dependência nova então.

### Auth (proxy Nitro)
- Browser só conhece `/api/v1/*` (mesmo caminho do FastAPI — o proxy é transparente).
- Cookie httpOnly gerado no login; Nitro repassa para FastAPI via header em `server/utils/fastapi.ts`.
- Em **mock mode** o proxy nunca é chamado (repository intercepta antes do fetch).

## 4. Dependências

- **Nova (runtime):** `@tanstack/vue-virtual`
- **Nova (dev):** `vue-tsc` + script `"typecheck": "nuxt typecheck"` (validação automática do contrato de tipos)
- Mantidas: nuxt, pinia, plyr, tailwind, @nuxt/icon. Nuxt Content e OMDB **permanecem intocados** nesta fase (remoção na fase 2).

## 5. Regra de checkpoint (obrigatória)

**A cada "contrato" novo totalmente implementado, a implementação PARA e o usuário revisa/le o código antes de eu seguir.** Um contrato novo = um bloco de arquivos coeso listado abaixo. Cada bloco termina com um resumo do que foi criado + o que eu espera de feedback. Nada do bloco seguinte começa sem aprovação.

## 6. Ordem de implementação (com checkpoints)

- ✅ 0. `docs/` + `docs/PLAN.md`
- ✋→✅ 1. `docs/SPEC.md` — contrato REST completo (revisado pelo usuário)
- ✋→✅ 2. `types/` + `constants/` — tipos e limites (revisado)
- ✋→✅ 3. `utils/sanitize|pagination|format|errors` — sanitização e paginação (revisado)
- ✋→✅ 4. `mocks/` + `repositories/contracts.ts` — gerador determinístico (revisado)
- ✋→✅ 5. `repositories/` (http + factory) + `services/http|player` — http client (revisado)
- ✋→✅ 6. `composables/` (dados) — debounce, paginatedQuery, casos de uso (revisado)
- ✋→✅ 7. `stores/` (auth, player, preferences) + `useAuth|usePlayer|useRouteQueryState|usePlayback`
- ✋→✅ 8. `server/` proxy + `nuxt.config.ts` + `.env*`
- ✋→✅ 9. `pages/dev/index.vue` + verificação final

**Nota de desvio do plano original:** não criamos `services/media.service.ts` e `services/auth.service.ts` — os repositories já são a seam única (evitar camada redundante, DRY). `services/` contém apenas infraestrutura transportável: `http.ts` e `player.service.ts`.

## 7. Verificação

- `npm i @tanstack/vue-virtual` e `npm i -D vue-tsc`
- `npm run typecheck` → zero erros
- `npm run dev` e validar em `/dev`:
  - lista pagina por cursor (load more, sem carregar 300k)
  - busca com debounce + sanitize ("ção" acha "cao", acentos normalizados)
  - filtro por categoria
  - login/logout mock, `useAuth` reflete estado
  - play/pause via Plyr + store
- Páginas existentes (`/`, `/medias`, `/pricing`) continuam funcionando sem alteração

## 8. Fora do escopo da fase 1 (prévia da fase 2)

Remover Nuxt Content + OMDB; páginas `/browse`, `/categories/[slug]`, `/search`, `/watch/[id]`, `/login`; componentes UI reutilizáveis (`ui/Button`, `ui/Input`, `MediaCard` refeito, `MediaGrid` virtualizado); `hls.js`; middleware `auth`/`guest`; redesign de navbar/footer; favoritos/recentes na UI.
