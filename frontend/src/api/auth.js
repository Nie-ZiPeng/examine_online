import axios from './axios';

export const login = (username, password) =>
  axios.post('/api/auth/login', { username, password });

export const logout = () => axios.post('/api/auth/logout');

export const getMe = () => axios.get('/api/auth/me');

export const updateMe = (data) => axios.put('/api/auth/me', data);

export const changePassword = (data) => axios.post('/api/auth/change-password', data);
