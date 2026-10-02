import api from '../../shared/axiosInstance.js';

export const getVendorOrders = (params) => api.get('/orders/vendor', { params });
export const getVendorOrder = (id) => api.get(`/orders/vendor/${id}`);
export const updateOrderStatus = (id, status) => api.patch(`/orders/vendor/${id}/status`, { status });
/** UPI orders: shop confirms the money reached its UPI account ('CONFIRM') or not ('REJECT' → order cancelled) */
export const verifyUpiPayment = (id, action) => api.patch(`/orders/vendor/${id}/payment`, { action });