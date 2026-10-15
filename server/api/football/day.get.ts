import { createError, defineEventHandler, getQuery } from 'h3';
import { dayFixtures, toNextFixture, footballTimezone, isoDateInTz } from '../../utils/football';
import type { UpstreamFixture, NextFixture } from '~/types';

/**
 * GET /api/football/day?date=2024-01-15
 * Todos os jogos de um dia específico (default: hoje no fuso configurado).
 */
export default defineEventHandler(async (event) => {
  const raw = getQuery(event).date;
  const tz = footballTimezone();

  const date = raw
    ? String(Array.isArray(raw) ? raw[0] : raw)
    : isoDateInTz(new Date(), tz);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, message: 'Parâmetro "date" inválido. Use YYYY-MM-DD.' });
  }

  try {
    const fixtures = await dayFixtures(date);

    const mapped = fixtures
      .map((row: UpstreamFixture) => toNextFixture(row))
      .sort((a: NextFixture, b: NextFixture) => a.timestamp - b.timestamp);

    return {
      date,
      fixtures: mapped,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw createError({ statusCode: (error as any).statusCode, message: error.message });
    }
    throw createError({ statusCode: 502, message: 'Não foi possível consultar os jogos do dia.' });
  }
});