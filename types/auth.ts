export type UserRole = 'user' | 'reseller' | 'admin';

/** Admin e revendedor — contas do painel (/admin), sem catálogo próprio. */
export type StaffRole = Exclude<UserRole, 'user'>;

export type PlaylistStatus = 'pending' | 'syncing' | 'ready' | 'failed';

/** Lista M3U vinculada ao cliente — o login só libera com `status: 'ready'`. */
export interface UserPlaylist {
  id: string;
  status: PlaylistStatus;
  error: string | null;
  catalogId: string | null;
  itemCount: number;
  syncedAt: string | null;
}

export interface User {
  id: string;
  username: string;
  /** Nome digitado pelo revendedor no cadastro (controle; não é o login). */
  name?: string | null;
  role: UserRole;
  /** Só clientes (`role: 'user'`) têm lista. */
  playlist?: UserPlaylist | null;
  createdAt: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface UpdateProfilePayload {
  currentPassword?: string;
  newPassword?: string;
}

export interface AuthResponse {
  user: User;
  /** JWT devolvido por login/refresh — persistido em localStorage (tokenStorage). */
  accessToken?: string;
  /** Refresh JWT — enviada de volta no corpo de /auth/refresh. */
  refreshToken?: string;
}
