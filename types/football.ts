/** Time escolhido pelo usuário — persistido em localStorage (nada de credenciais). */
export interface FavoriteTeam {
  id: number;
  name: string;
  logo: string;
  country: string | null;
  code: string | null;
}

/** Um dos lados de um jogo. */
export interface FixtureTeam {
  id: number;
  name: string;
  logo: string;
}

export interface FixtureLeague {
  id: number;
  name: string;
  country: string;
  logo: string;
  round: string;
}

export interface FixtureVenue {
  name: string | null;
  city: string | null;
}

/** Próximo jogo do time — recortado do payload da API-Football (só o que a UI usa). */
export interface NextFixture {
  id: number;
  /** Epoch (s) do kickoff no fuso do aparelho. */
  timestamp: number;
  /** ISO original retornado pela API. */
  date: string;
  status: { short: string; long: string };
  home: FixtureTeam;
  away: FixtureTeam;
  league: FixtureLeague;
  venue: FixtureVenue | null;
}

/** Resposta de GET /api/football/next. */
export interface NextFixtureResponse {
  teamId: number;
  fixture: NextFixture | null;
  /** Janela de dias consultada na API (hoje/amanhã no fuso configurado). */
  window: { from: string; to: string };
  checkedAt: string;
}

/** Resposta de GET /api/football/teams. */
export interface TeamSearchResponse {
  items: FavoriteTeam[];
}

/** Payload bruto de fixture da API-Football (upstream). */
export interface UpstreamFixture {
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

/** Resposta de GET /api/football/day. */
export interface DayFixturesResponse {
  date: string;
  fixtures: NextFixture[];
  checkedAt: string;
}
