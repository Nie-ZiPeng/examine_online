import axios from './axios';
import type { ApiResponse } from '../types/api';
import type { Subject, TeacherSubjectCreate } from '../types/teacher_subject';

export const getSubjects = (): Promise<ApiResponse<Subject[]>> =>
  axios.get('/api/admin/subjects') as Promise<ApiResponse<Subject[]>>;

export const getTeacherSubjects = (teacherId: number): Promise<ApiResponse<Subject[]>> =>
  axios.get(`/api/admin/teachers/${teacherId}/subjects`) as Promise<ApiResponse<Subject[]>>;

export const assignSubjectToTeacher = (teacherId: number, data: TeacherSubjectCreate): Promise<ApiResponse<null>> =>
  axios.post(`/api/admin/teachers/${teacherId}/subjects`, data) as Promise<ApiResponse<null>>;

export const removeSubjectFromTeacher = (teacherId: number, subjectId: number): Promise<ApiResponse<null>> =>
  axios.delete(`/api/admin/teachers/${teacherId}/subjects/${subjectId}`) as Promise<ApiResponse<null>>;
