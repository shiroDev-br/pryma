export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  username: string;
  role: UserRole;
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
