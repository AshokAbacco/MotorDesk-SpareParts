import api from '../../shared/axiosInstance.js';

export const getDashboardStats = () => api.get('/reports/dashboard');
