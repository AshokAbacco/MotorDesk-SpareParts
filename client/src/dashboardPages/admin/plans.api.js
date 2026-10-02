import api from '../../shared/axiosInstance.js';

export const getAllPlans = () => api.get('/subscriptions/plans/all');
export const createPlan = (body) => api.post('/subscriptions/plans', body);
export const updatePlan = (id, body) => api.patch(`/subscriptions/plans/${id}`, body);
export const deactivatePlan = (id) => api.delete(`/subscriptions/plans/${id}`);
