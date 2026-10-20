import { useRuntimeConfig } from '#imports';
import { FOOTBALL_MIN_SEARCH_CHARS, FOOTBALL_RESULT_LIMIT } from '~/constants';
import { createApiError } from '~/utils/errors';
import { normalizeText } from '~/utils/sanitize';
import type { ApiError } from '~/types';
import type {
  DayFixturesResponse,
  FavoriteTeam,
  NextFixture,
  NextFixtureResponse,
  TeamSearchResponse,
  UpstreamFixture,
} from '~/types';

/**
 * API-Football v3 (https://v3.football.api-sports.io) direto do cliente.
 *
 * No APK não existe Nitro — a chave vive no bundle (runtimeConfig.public)
 * e a política de cota mora aqui (plano free: 100 req/dia):
 *  1. cache em memória por dia de calendário (jogos) e por query (times);
 *  2. deduplicação de requests em voo;
 *  3. teto diário persistido em localStorage: estourou, só serve cache.
 */

const BASE_URL = 'https://v3.football.api-sports.io';
const UPSTREAM_TIMEOUT_MS = 10_000;
const DAILY_UPSTREAM_LIMIT = 80;
const SEARCH_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_QUERY_LENGTH = 60;
const BUDGET_KEY = 'iptv.footballBudget';

function footballError(message: string, status = 502): ApiError {
  return createApiError(status, 'football_error', message);
}

/** `YYYY-MM-DD` de uma data no fuso informado (janela "hoje/amanhã" da API). */
function isoDateInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date);
}

/** Soma dias a uma data ISO — feito em UTC de meio-dia para não sofrer com DST. */
function addIsoDays(iso: string, days: number): string {
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

/** Epoch das 06:00 do dia seguinte ao `iso` no fuso `tz` — cache expira às 6h. */
function nextMorning6Epoch(iso: string, tz: string): number {
  const nextIso = addIsoDays(iso, 1);
  const naive = Date.parse(`${nextIso}T06:00:00Z`);
  let epoch = naive - tzOffsetMs(tz, naive);
  epoch = naive - tzOffsetMs(tz, epoch);
  return epoch;
}

/** Fuso configurado no runtimeConfig (FOOTBALL_TIMEZONE). */
function footballTimezone(): string {
  return useRuntimeConfig().public.footballTimezone || 'America/Sao_Paulo';
}

/* ── Orçamento diário (localStorage) ───────────────────────────────────────── */

function readBudget(): { day: string; used: number } {
  if (typeof localStorage === 'undefined') return { day: '', used: 0 };
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    const parsed = raw ? (JSON.parse(raw) as { day?: string; used?: number }) : null;
    return { day: parsed?.day ?? '', used: parsed?.used ?? 0 };
  } catch {
    return { day: '', used: 0 };
  }
}

function writeBudget(budget: { day: string; used: number }): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budget));
  } catch {
    // Sem storage, o limite fica só em memória.
  }
}

/* ── Cache + dedup ─────────────────────────────────────────────────────────── */

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
      const isQuotaDown =
        typeof error === 'object' && error !== null && (error as ApiError).status === 503;
      if (stale && isQuotaDown) return stale.value as T;
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
    throw footballError('O plano atual da API-Football não permite esta consulta.');
  }
  throw footballError(message);
}

async function upstream<T>(
  path: string,
  query: Record<string, string | number | undefined>,
  tz: string,
): Promise<T[]> {
  const { footballApiKey } = useRuntimeConfig().public;

  if (!footballApiKey) {
    throw footballError('Chave da API-Football não configurada (FOOTBALL_API_KEY).', 503);
  }

  const today = isoDateInTz(new Date(), tz);
  const budget = readBudget();
  if (budget.day !== today) {
    budget.day = today;
    budget.used = 0;
  }
  if (budget.used >= DAILY_UPSTREAM_LIMIT) {
    throw footballError('Cota diária da API-Football atingida. Tente novamente amanhã.', 503);
  }

  const url = new URL(path, BASE_URL);
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') url.searchParams.set(name, String(value));
  }

  budget.used += 1;
  writeBudget(budget);

  let response: Response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    response = await fetch(url, {
      headers: { accept: 'application/json', 'x-apisports-key': footballApiKey },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
  } catch {
    throw footballError('API-Football indisponível no momento.');
  }

  if (response.status === 429) {
    throw footballError('Limite de requisições da API-Football atingido.', 429);
  }
  if (!response.ok) {
    throw footballError(`API-Football respondeu ${response.status}.`);
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

/** Busca de times — cacheada 24h por query normalizada. */
export async function searchFootballTeams(rawQuery: string): Promise<TeamSearchResponse> {
  const tz = footballTimezone();
  const normalized = normalizeText(rawQuery).slice(0, MAX_QUERY_LENGTH);

  if (normalized.length < FOOTBALL_MIN_SEARCH_CHARS) {
    throw footballError(`Digite ao menos ${FOOTBALL_MIN_SEARCH_CHARS} caracteres.`, 400);
  }

  const raw = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  const key = `teams:${normalized}`;

  const rows = await withCache(
    key,
    Date.now() + SEARCH_TTL_MS,
    () => upstream<UpstreamTeam>('/teams', { search: raw }, tz),
  );

  const items = rankTeams(rows.map(toFavoriteTeam), normalized).slice(0, FOOTBALL_RESULT_LIMIT);
  return { items };
}

/* ── Jogos ─────────────────────────────────────────────────────────────────── */

function toNextFixture(row: UpstreamFixture): NextFixture {
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
async function dayFixtures(iso: string): Promise<UpstreamFixture[]> {
  const tz = footballTimezone();
  const all = await withCache(
    `fixtures:${iso}`,
    nextMorning6Epoch(iso, tz),
    () => upstream<UpstreamFixture>('/fixtures', { date: iso, timezone: tz }, tz),
  );

  return all.filter((fixture) => ALLOWED_LEAGUE_IDS.has(fixture.league.id));
}

/** Todos os jogos de um dia (default: hoje no fuso configurado) — shape de DayFixturesResponse. */
export async function fetchDayFixtures(date?: string): Promise<DayFixturesResponse> {
  const tz = footballTimezone();
  const iso = date || isoDateInTz(new Date(), tz);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw footballError('Parâmetro "date" inválido. Use YYYY-MM-DD.', 400);
  }

  const fixtures = (await dayFixtures(iso))
    .map(toNextFixture)
    .sort((a, b) => a.timestamp - b.timestamp);

  return { date: iso, fixtures, checkedAt: new Date().toISOString() };
}

/**
 * Próximo jogo do time na janela hoje/amanhã — a janela é diária porque o
 * plano free só libera `date` em [hoje−1, hoje+1]. O store guarda o resultado
 * até a meia-noite seguinte ao jogo, então o custo fica em ~1–2 chamadas/dia.
 */
export async function fetchNextFixture(teamId: number): Promise<NextFixtureResponse> {
  if (!Number.isInteger(teamId) || teamId <= 0) {
    throw footballError('Parâmetro "team" inválido.', 400);
  }

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
    teamId,
    fixture: next ? toNextFixture(next) : null,
    window: { from: today, to: tomorrow },
    checkedAt: new Date().toISOString(),
  };
}
