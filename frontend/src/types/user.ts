export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  name: string;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface ProfileUpdate {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}
