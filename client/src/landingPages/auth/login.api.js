import api from '../../shared/axiosInstance.js';

export const login = (payload) => api.post('/auth/login', payload);
export const getMe = () => api.get('/auth/me');
