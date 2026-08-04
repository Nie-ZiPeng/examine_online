import type { AxiosResponse } from 'axios';
import axios from './axios';
import type { ApiResponse } from '../types/api';
import type { DashboardData } from '../types/dashboard';

export const getDashboard = (): Promise<ApiResponse<DashboardData>> =>
  axios.get('/api/statistics/dashboard') as Promise<ApiResponse<DashboardData>>;

export const exportDashboard = (
  format: 'csv' | 'xlsx',
  dataset?: string
): Promise<AxiosResponse<Blob>> =>
  axios.get('/api/statistics/dashboard/export', {
    params: { format, ...(dataset ? { dataset } : {}) },
    responseType: 'blob',
    preserveResponse: true,
  }) as Promise<AxiosResponse<Blob>>;
