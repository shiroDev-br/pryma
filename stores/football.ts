import { defineStore } from 'pinia';
import { FOOTBALL_ENDPOINTS, STORAGE_KEYS } from '~/constants';
import { readErrorMessage } from '~/utils/errors';
import type { FavoriteTeam, NextFixture, NextFixtureResponse } from '~/types';

/** Estado de erro re-tenta em 5 min — evita martelar o proxy a cada render. */
const ERROR_RETRY_MS = 5 * 60_000;

interface PersistedFixture {
  teamId: number;
  fixture: NextFixture | null;
  /** Epoch em que o cache vence — 00h do dia seguinte ao jogo. */
  expiresAt: number;
  checkedAt: string | null;
}

interface FootballState {
  team: FavoriteTeam | null;
  fixture: NextFixture | null;
  expiresAt: number | null;
  checkedAt: string | null;
  /** `true` quando já existe um resultado (inclusive "sem jogo na janela"). */
  hasChecked: boolean;
  hydrated: boolean;
  isLoading: boolean;
  /** Time da busca em voo — respostas de outro time são descartadas. */
  loadingTeamId: number | null;
  error: string | null;
  retryAt: number | null;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage indisponível/cheio — preferências são descartáveis.
  }
}

function removeStorage(key: string): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.removeItem(key);
  } catch {
    // Idem.
  }
}

/** Meia-noite local do dia seguinte ao informado. */
function startOfNextLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
}

/**
 * Regra do produto: o cache do próximo jogo vence à meia-noite do dia
 * SEGUINTE ao dia do jogo — é nesse instante que uma nova busca acontece.
 * Sem jogo conhecido, vence na próxima meia-noite (reconsulta diária).
 */
function resolveExpiry(fixture: NextFixture | null): number {
  if (!fixture) return startOfNextLocalDay(new Date());
  return startOfNextLocalDay(new Date(fixture.timestamp * 1000));
}

/**
 * Time do coração + próximo jogo, com cache local.
 *
 * - `team` e `fixture` persistem em localStorage (nada sensível);
 * - a validade segue a regra acima: só refaz a busca quando o cache vence;
 * - `ensureFresh()` é idempotente: várias telas podem chamá-la à vontade.
 */
export const useFootballStore = defineStore('football', {
  state: (): FootballState => ({
    team: null,
    fixture: null,
    expiresAt: null,
    checkedAt: null,
    hasChecked: false,
    hydrated: false,
    isLoading: false,
    loadingTeamId: null,
    error: null,
    retryAt: null,
  }),

  getters: {
    hasTeam: (state): boolean => state.team !== null,
    /** Show no header/bottom bar só depois da hidratação (evita flash no SSR). */
    isReady: (state): boolean => state.hydrated && state.team !== null,
  },

  actions: {
    /** Lê o cache local — uma única vez, só no cliente. */
    hydrate() {
      if (this.hydrated || typeof localStorage === 'undefined') return;

      this.team = readStorage<FavoriteTeam | null>(STORAGE_KEYS.footballTeam, null);
      const cached = readStorage<PersistedFixture | null>(STORAGE_KEYS.footballFixture, null);
      this.hydrated = true;

      if (!cached || !this.team || cached.teamId !== this.team.id) return;

      this.fixture = cached.fixture;
      this.checkedAt = cached.checkedAt;
      this.expiresAt = cached.expiresAt;
      // Vencido fica "não verificado" mas o dado antigo continua na tela
      // até a nova resposta chegar.
      this.hasChecked = cached.expiresAt > Date.now();
    },

    setTeam(team: FavoriteTeam) {
      const changed = this.team?.id !== team.id;
      this.team = team;
      this.error = null;
      writeStorage(STORAGE_KEYS.footballTeam, team);

      if (changed) {
        this.clearFixture();
        void this.ensureFresh(true);
      }
    },

    clearTeam() {
      this.team = null;
      this.error = null;
      removeStorage(STORAGE_KEYS.footballTeam);
      this.clearFixture();
    },

    clearFixture() {
      this.fixture = null;
      this.expiresAt = null;
      this.checkedAt = null;
      this.hasChecked = false;
      this.retryAt = null;
      removeStorage(STORAGE_KEYS.footballFixture);
    },

    /**
     * Busca o próximo jogo apenas quando não há cache válido (ou com `force`).
     * Em erro mantém o último jogo conhecido na tela e agenda nova tentativa.
     */
    async ensureFresh(force = false): Promise<void> {
      if (import.meta.server) return;
      if (!this.hydrated) this.hydrate();

      const team = this.team;
      if (!team) return;

      const fresh = this.hasChecked && this.expiresAt !== null && Date.now() < this.expiresAt;
      if (!force && fresh) return;
      if (!force && this.retryAt !== null && Date.now() < this.retryAt) return;
      // Só bloqueia se a busca em vão é justamente deste time (troca não espera).
      if (this.isLoading && this.loadingTeamId === team.id) return;

      this.isLoading = true;
      this.loadingTeamId = team.id;
      this.error = null;

      try {
        const payload = await $fetch<NextFixtureResponse>(FOOTBALL_ENDPOINTS.next, {
          query: { team: team.id },
        });

        // O usuário trocou de time enquanto a request rodava — descarta.
        if (this.team?.id !== team.id) return;

        this.fixture = payload.fixture;
        this.checkedAt = payload.checkedAt;
        this.hasChecked = true;
        this.expiresAt = resolveExpiry(payload.fixture);
        this.retryAt = null;

        writeStorage(STORAGE_KEYS.footballFixture, {
          teamId: team.id,
          fixture: payload.fixture,
          expiresAt: this.expiresAt,
          checkedAt: this.checkedAt,
        } satisfies PersistedFixture);
      } catch (error) {
        if (this.team?.id !== team.id) return;

        this.error = readErrorMessage(error, 'Não foi possível consultar o próximo jogo.');
        this.retryAt = Date.now() + ERROR_RETRY_MS;
      } finally {
        if (this.loadingTeamId === team.id) {
          this.isLoading = false;
          this.loadingTeamId = null;
        }
      }
    },
  },
});
