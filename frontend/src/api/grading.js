import axios from './axios';

export const getExamRecords = (examId, params) => axios.get(`/api/exams/${examId}/records`, { params });
export const getRecordAnswers = (recordId) => axios.get(`/api/records/${recordId}/answers`);
export const gradeAnswer = (answerId, data) => axios.put(`/api/answers/${answerId}/grade`, data);
export const finalizeRecord = (recordId) => axios.put(`/api/records/${recordId}/finalize`);
