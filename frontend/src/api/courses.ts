import axios from './axios';
import type { ApiResponse, Paginated } from '../types/api';
import type { Course, CourseInput } from '../types/course';

export const getCourses = (params?: Record<string, unknown>): Promise<ApiResponse<Paginated<Course>>> =>
  axios.get('/api/courses', { params }) as Promise<ApiResponse<Paginated<Course>>>;

export const createCourse = (data: CourseInput): Promise<ApiResponse<Course>> =>
  axios.post('/api/courses', data) as Promise<ApiResponse<Course>>;

export const updateCourse = (id: number, data: CourseInput): Promise<ApiResponse<Course>> =>
  axios.put(`/api/courses/${id}`, data) as Promise<ApiResponse<Course>>;

export const deleteCourse = (id: number): Promise<ApiResponse<null>> =>
  axios.delete(`/api/courses/${id}`) as Promise<ApiResponse<null>>;
