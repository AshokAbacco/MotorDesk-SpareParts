import api from '../../shared/axiosInstance.js';

export const getAnalytics = () => api.get('/admin/analytics');
