import api from '../../shared/axiosInstance.js';

export const register = (payload) => api.post('/auth/register', payload);
