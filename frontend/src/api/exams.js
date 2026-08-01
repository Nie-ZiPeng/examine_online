import axios from './axios';

export const getExams = (params) => axios.get('/api/exams', { params });
export const getExam = (id) => axios.get(`/api/exams/${id}`);
export const createExam = (data) => axios.post('/api/exams', data);
export const updateExam = (id, data) => axios.put(`/api/exams/${id}`, data);
export const deleteExam = (id) => axios.delete(`/api/exams/${id}`);
export const publishExam = (id) => axios.put(`/api/exams/${id}/publish`);
export const getExamQuestions = (examId) => axios.get(`/api/exams/${examId}/questions`);
export const createQuestion = (examId, data) => axios.post(`/api/exams/${examId}/questions`, data);
export const updateQuestion = (questionId, data) => axios.put(`/api/questions/${questionId}`, data);
export const deleteQuestion = (questionId) => axios.delete(`/api/questions/${questionId}`);
