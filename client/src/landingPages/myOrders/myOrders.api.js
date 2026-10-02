import api from '../../shared/axiosInstance.js';

export const getMyOrders = (params) => api.get('/orders/my', { params });
export const getMyOrder = (id) => api.get(`/orders/my/${id}`);
export const cancelMyOrder = (id) => api.patch(`/orders/my/${id}/cancel`);
