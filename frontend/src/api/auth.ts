import axios from './axios';
import type { ApiResponse, Paginated } from '../types/api';
import type { TokenResponse, User, ProfileUpdate, ChangePasswordRequest } from '../types/user';

export const login = (username: string, password: string): Promise<ApiResponse<TokenResponse>> =>
  axios.post('/api/auth/login', { username, password });

export const logout = (): Promise<ApiResponse<null>> => axios.post('/api/auth/logout');

export const getMe = (): Promise<ApiResponse<User>> => axios.get('/api/auth/me');

export const updateMe = (data: ProfileUpdate): Promise<ApiResponse<User>> =>
  axios.put('/api/auth/me', data);

export const changePassword = (data: ChangePasswordRequest): Promise<ApiResponse<null>> =>
  axios.post('/api/auth/change-password', data);
