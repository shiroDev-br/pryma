import { createError, defineEventHandler, getQuery } from 'h3';
import { resolveNextFixture, toFootballHttpError } from '../../utils/football';

/**
 * GET /api/football/next?team=127
 * Próximo jogo do time na janela hoje/amanhã. Cache por dia de calendário:
 * vence à meia-noite — é a "outra busca às 00 do dia seguinte ao jogo".
 */
export default defineEventHandler(async (event) => {
  const raw = getQuery(event).team;
  const teamId = Number(Array.isArray(raw) ? raw[0] : raw);

  if (!Number.isInteger(teamId) || teamId <= 0) {
    throw createError({ statusCode: 400, message: 'Parâmetro "team" inválido.' });
  }

  try {
    const result = await resolveNextFixture(teamId);

    return {
      teamId,
      fixture: result.fixture,
      window: result.window,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw toFootballHttpError(error);
  }
});
