export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  displayName?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface AuthResponse {
  user: User;
}
