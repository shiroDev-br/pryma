import type { User } from './auth';

/** Cliente visto pelo painel — inclui quem o cadastrou. */
export interface ClientAccount extends User {
  resellerId: string | null;
  resellerUsername: string | null;
  /** Servidor (DNS) em que a conta do cliente existe. */
  serverId: string | null;
  serverName: string | null;
  /** Falso para contas sem servidor (lista original) — não há o que verificar. */
  canResync: boolean;
}

export interface ClientList {
  items: ClientAccount[];
  /** Total de resultados do filtro (paginação por offset). */
  total: number;
}

export interface ClientQuery {
  /** Só admin. */
  resellerId?: string | null;
  serverId?: string | null;
  /** Nome ou usuário (contém, sem diferenciar maiúsculas). */
  q?: string | null;
  limit?: number;
  offset?: number;
}

export interface Reseller {
  id: string;
  username: string;
  clientCount: number;
  createdAt: string;
}

export interface CreateResellerPayload {
  /** Minúsculas, números, `.`, `_` ou `-` (3–32). */
  username: string;
}

/** Senha gerada pelo servidor — aparece só nesta resposta. */
export interface CreatedReseller {
  reseller: Reseller;
  password: string;
}

/** Painel Xtream (DNS) cadastrado pelo admin — o catálogo é lido dele ao vivo. */
export interface Server {
  id: string;
  name: string;
  /** scheme://host[:port] */
  url: string;
  clientCount: number;
  createdAt: string;
}

export interface ServerPayload {
  name: string;
  url: string;
}
