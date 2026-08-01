import axios from '../axios';

export const getUsers = (params) => axios.get('/api/users', { params });
export const createUser = (data) => axios.post('/api/users', data);
export const updateUser = (id, data) => axios.put(`/api/users/${id}`, data);
export const deleteUser = (id) => axios.delete(`/api/users/${id}`);
