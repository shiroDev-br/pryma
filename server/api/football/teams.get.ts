import { defineEventHandler, getQuery } from 'h3';
import { searchTeams, toFootballHttpError } from '../../utils/football';

/**
 * GET /api/football/teams?search=flamengo
 * Busca de times com cache de 24h por query — cada digitada única custa 1 request upstream.
 */
export default defineEventHandler(async (event) => {
  const raw = getQuery(event).search;
  const search = Array.isArray(raw) ? raw[0] : raw;

  try {
    return { items: await searchTeams(search ?? '') };
  } catch (error) {
    throw toFootballHttpError(error);
  }
});
