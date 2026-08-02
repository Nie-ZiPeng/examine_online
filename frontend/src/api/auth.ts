import axios from './axios';
import type { ApiResponse } from '../types/api';
import type { TokenResponse, User, ProfileUpdate, ChangePasswordRequest } from '../types/user';

export const login = (username: string, password: string): Promise<ApiResponse<TokenResponse>> =>
  axios.post('/api/auth/login', { username, password }) as Promise<ApiResponse<TokenResponse>>;

export const logout = (): Promise<ApiResponse<null>> =>
  axios.post('/api/auth/logout') as Promise<ApiResponse<null>>;

export const getMe = (): Promise<ApiResponse<User>> =>
  axios.get('/api/auth/me') as Promise<ApiResponse<User>>;

export const updateMe = (data: ProfileUpdate): Promise<ApiResponse<User>> =>
  axios.put('/api/auth/me', data) as Promise<ApiResponse<User>>;

export const changePassword = (data: ChangePasswordRequest): Promise<ApiResponse<null>> =>
  axios.post('/api/auth/change-password', data) as Promise<ApiResponse<null>>;
