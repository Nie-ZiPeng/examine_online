import axios from './axios';
import type { ApiResponse } from '../types/api';
import type { DashboardData } from '../types/dashboard';

export const getDashboard = (): Promise<ApiResponse<DashboardData>> =>
  axios.get('/api/statistics/dashboard') as Promise<ApiResponse<DashboardData>>;
