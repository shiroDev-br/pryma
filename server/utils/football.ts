import { createError } from 'h3';
import { normalizeText } from '~/utils/sanitize';
import type { FavoriteTeam, NextFixture } from '~/types';

/**
 * Proxy da API-Football v3 (https://v3.football.api-sports.io).
 *
 * Toda a política de cota mora aqui — o plano free tem 100 requisições/dia:
 *  1. cache em memória por dia de calendário (jogos) e por query (times);
 *  2. deduplicação de requests em voo (dois clientes = uma chamada upstream);
 *  3. teto diário rígido: estourou, só serve cache (nunca estoura a cota).
 */

const BASE_URL = 'https://v3.football.api-sports.io';
const UPSTREAM_TIMEOUT_MS = 10_000;
const DAILY_UPSTREAM_LIMIT = 80;
const SEARCH_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_QUERY_CHARS = 3;
const MAX_QUERY_LENGTH = 60;
const RESULT_LIMIT = 12;

/* ── Erros ─────────────────────────────────────────────────────────────────── */

/** Falha controlada da API de futebol — sempre com status HTTP utilizável. */
export class FootballApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'FootballApiError';
    this.statusCode = statusCode;
  }
}

/** Qualquer erro vira um erro HTTP no shape do app (§4.2 da SPEC). */
export function toFootballHttpError(error: unknown): Error {
  if (error instanceof FootballApiError) {
    return createError({ statusCode: error.statusCode, message: error.message });
  }

  return createError({ statusCode: 500, message: 'Não foi possível consultar a API de futebol.' });
}

/* ── Datas no fuso da aplicação ────────────────────────────────────────────── */

/** `YYYY-MM-DD` de uma data no fuso informado (janela "hoje/amanhã" da API). */
export function isoDateInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date);
}

/** Soma dias a uma data ISO — feito em UTC de meio-dia para não sofrer com DST. */
export function addIsoDays(iso: string, days: number): string {
  const base = new Date(`${iso}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Offset (local − UTC) em ms de um instante no fuso dado. */
function tzOffsetMs(tz: string, epoch: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(epoch));

  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - epoch;
}

/** Epoch da meia-noite (fuso `tz`) que encerra o dia `iso` — TTL do cache do dia. */
export function endOfIsoDayEpoch(iso: string, tz: string): number {
  const nextIso = addIsoDays(iso, 1);
  const naive = Date.parse(`${nextIso}T00:00:00Z`);
  let epoch = naive - tzOffsetMs(tz, naive);
  // Refina uma vez — cobre transição de horário de verão.
  epoch = naive - tzOffsetMs(tz, epoch);
  return epoch;
}

/** Epoch das 06:00 do dia seguinte ao `iso` no fuso `tz` — cache expira às 6h. */
export function nextMorning6Epoch(iso: string, tz: string): number {
  const nextIso = addIsoDays(iso, 1);
  const naive = Date.parse(`${nextIso}T06:00:00Z`);
  let epoch = naive - tzOffsetMs(tz, naive);
  epoch = naive - tzOffsetMs(tz, epoch);
  return epoch;
}

/* ── Orçamento + cache ─────────────────────────────────────────────────────── */

const upstreamBudget = { day: '', used: 0 };

function consumeBudget(tz: string): void {
  const today = isoDateInTz(new Date(), tz);
  if (upstreamBudget.day !== today) {
    upstreamBudget.day = today;
    upstreamBudget.used = 0;
  }
  upstreamBudget.used += 1;
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

function sweepCache(): void {
  if (cache.size < 256) return;
  const now = Date.now();
  for (const [key, entry] of cache) if (entry.expiresAt <= now) cache.delete(key);
}

/**
 * Lê do cache; em caso de falha upstream serve o valor vencido (stale) em vez de
 * quebrar a UI — o objetivo é nunca perder a cota nem a informação já exibida.
 */
async function withCache<T>(key: string, expiresAt: number, loader: () => Promise<T>): Promise<T> {
  sweepCache();

  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const request = loader()
    .then((value) => {
      cache.set(key, { value, expiresAt });
      return value;
    })
    .catch((error: unknown) => {
      const stale = cache.get(key);
      if (stale && error instanceof FootballApiError && error.statusCode === 503) return stale.value as T;
      throw error;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}

/* ── Upstream ──────────────────────────────────────────────────────────────── */

interface ApiSportsPayload<T> {
  errors: string[] | Record<string, string>;
  results: number;
  response: T[];
}

function assertErrors(payload: ApiSportsPayload<unknown>): void {
  const { errors } = payload;
  const messages = Array.isArray(errors)
    ? errors
    : errors && typeof errors === 'object'
      ? Object.values(errors)
      : [];

  if (messages.length === 0) return;

  const message = messages.join(' ');
  if (/free plans/i.test(message)) {
    throw new FootballApiError('O plano atual da API-Football não permite esta consulta.', 502);
  }
  throw new FootballApiError(message, 502);
}

async function upstream<T>(
  path: string,
  query: Record<string, string | number | undefined>,
  tz: string,
): Promise<T[]> {
  const { footballApiKey } = useRuntimeConfig();

  if (!footballApiKey) {
    throw new FootballApiError('Chave da API-Football não configurada (FOOTBALL_API_KEY).', 503);
  }

  const today = isoDateInTz(new Date(), tz);
  if (upstreamBudget.day !== today) {
    upstreamBudget.day = today;
    upstreamBudget.used = 0;
  }
  if (upstreamBudget.used >= DAILY_UPSTREAM_LIMIT) {
    throw new FootballApiError('Cota diária da API-Football atingida. Tente novamente amanhã.', 503);
  }

  const url = new URL(path, BASE_URL);
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') url.searchParams.set(name, String(value));
  }

  consumeBudget(tz);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: 'application/json', 'x-apisports-key': footballApiKey },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new FootballApiError('API-Football indisponível no momento.', 502);
  }

  if (response.status === 429) {
    throw new FootballApiError('Limite de requisições da API-Football atingido.', 429);
  }
  if (!response.ok) {
    throw new FootballApiError(`API-Football respondeu ${response.status}.`, 502);
  }

  const payload = (await response.json()) as ApiSportsPayload<T>;
  assertErrors(payload);
  return payload.response ?? [];
}

/* ── Busca de times ────────────────────────────────────────────────────────── */

interface UpstreamTeam {
  team: { id: number; name: string; logo: string; country: string; code: string | null; national: boolean };
}

function toFavoriteTeam(row: UpstreamTeam): FavoriteTeam {
  return {
    id: row.team.id,
    name: row.team.name,
    logo: row.team.logo,
    country: row.team.country || null,
    code: row.team.code || null,
  };
}

/** Prioriza correspondências exatas e por início do nome antes das demais. */
function rankTeams(items: FavoriteTeam[], query: string): FavoriteTeam[] {
  const needle = normalizeText(query);

  const score = (item: FavoriteTeam): number => {
    const name = normalizeText(item.name);
    if (name === needle) return 0;
    if (name.startsWith(needle)) return 1;
    if (name.includes(needle)) return 2;
    return 3;
  };

  return [...items].sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));
}

/** `GET /teams?search=` — cacheada 24h por query normalizada. */
export async function searchTeams(rawQuery: string): Promise<FavoriteTeam[]> {
  const tz = footballTimezone();
  const normalized = normalizeText(rawQuery).slice(0, MAX_QUERY_LENGTH);

  if (normalized.length < MIN_QUERY_CHARS) {
    throw new FootballApiError(`Digite ao menos ${MIN_QUERY_CHARS} caracteres.`, 400);
  }

  const raw = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  const key = `teams:${normalized}`;

  const rows = await withCache(
    key,
    Date.now() + SEARCH_TTL_MS,
    () => upstream<UpstreamTeam>('/teams', { search: raw }, tz),
  );

  return rankTeams(rows.map(toFavoriteTeam), normalized).slice(0, RESULT_LIMIT);
}

/* ── Próximo jogo ──────────────────────────────────────────────────────────── */

interface UpstreamFixture {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    status: { short: string; long: string };
    venue: { name: string | null; city: string | null } | null;
  };
  league: { id: number; name: string; country: string; logo: string; round: string };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
}

export function toNextFixture(row: UpstreamFixture): NextFixture {
  return {
    id: row.fixture.id,
    timestamp: row.fixture.timestamp,
    date: row.fixture.date,
    status: { short: row.fixture.status.short, long: row.fixture.status.long },
    home: { id: row.teams.home.id, name: row.teams.home.name, logo: row.teams.home.logo },
    away: { id: row.teams.away.id, name: row.teams.away.name, logo: row.teams.away.logo },
    league: {
      id: row.league.id,
      name: row.league.name,
      country: row.league.country,
      logo: row.league.logo,
      round: row.league.round,
    },
    venue: row.fixture.venue
      ? { name: row.fixture.venue.name, city: row.fixture.venue.city }
      : null,
  };
}

/** Ligas permitidas para exibição no app. */
const ALLOWED_LEAGUE_IDS = new Set<number>([
  71,   // Brasileirão Série A
  72,   // Brasileirão Série B
  2,    // Champions League
  13,   // Libertadores
  14,   // Sul-Americana
  39,   // Premier League
  140,  // La Liga
  135,  // Serie A (Italy)
]);

/** Jogos de um dia — cacheia até 06:00 do dia seguinte (refaz às 6h da manhã). */
export async function dayFixtures(iso: string): Promise<UpstreamFixture[]> {
  const tz = footballTimezone();
  const allFixtures = await withCache(
    `fixtures:${iso}`,
    nextMorning6Epoch(iso, tz),
    () => upstream<UpstreamFixture>('/fixtures', { date: iso, timezone: tz }, tz),
  );

  // Debug temporário: mostra todas as ligas que a API devolveu hoje
  const leaguesInResponse = [...new Set(allFixtures.map(f => `${f.league.id} - ${f.league.name} (${f.league.country})`))];
  console.log('[dayFixtures] Ligas no response da API hoje:', leaguesInResponse);

  // Filtra apenas as ligas permitidas
  const filtered = allFixtures.filter((fixture) => ALLOWED_LEAGUE_IDS.has(fixture.league.id));
  console.log('[dayFixtures] Após filtro (IDs permitidos):', ALLOWED_LEAGUE_IDS.size, '| Jogos filtrados:', filtered.length);

  return filtered;
}

/**
 * Próximo jogo do time dentro da janela hoje+amanhã.
 *
 * O plano free da API-Football só libera `date` em [hoje−1, hoje+1] (sem `next`/`last`),
 * então a janela é diária: o cliente reconsulta quando o cache vence (00h do dia
 * seguinte ao jogo), mantendo o custo em ~1–2 chamadas upstream por dia.
 */
export async function resolveNextFixture(
  teamId: number,
): Promise<{ fixture: NextFixture | null; window: { from: string; to: string } }> {
  const tz = footballTimezone();
  const today = isoDateInTz(new Date(), tz);
  const tomorrow = addIsoDays(today, 1);

  const [todayResult, tomorrowResult] = await Promise.allSettled([
    dayFixtures(today),
    dayFixtures(tomorrow),
  ]);

  const collected = [todayResult, tomorrowResult];
  const fixtures = collected.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));

  if (fixtures.length === 0) {
    const failure = collected.find((result) => result.status === 'rejected');
    if (failure && failure.status === 'rejected') throw failure.reason;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const next = fixtures
    .filter(
      (row) =>
        (row.teams.home.id === teamId || row.teams.away.id === teamId) &&
        row.fixture.timestamp > nowSeconds,
    )
    .sort((a, b) => a.fixture.timestamp - b.fixture.timestamp)[0];

  return {
    fixture: next ? toNextFixture(next) : null,
    window: { from: today, to: tomorrow },
  };
}

/** Fuso configurado no runtimeConfig (FOOTBALL_TIMEZONE). */
export function footballTimezone(): string {
  return useRuntimeConfig().footballTimezone || 'America/Sao_Paulo';
}
