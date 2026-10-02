// client/src/dashboardPages/customers/customers.api.js
import api from '../../shared/axiosInstance.js';

// Admin → Customers
export const getCustomers = (params) => api.get('/admin/customers', { params });
export const createCustomer = (body) => api.post('/admin/customers', body);
export const updateCustomer = (id, body) => api.put(`/admin/customers/${id}`, body);
export const deleteCustomer = (id) => api.delete(`/admin/customers/${id}`);
export const setCustomerStatus = (id, isActive) => api.patch(`/admin/customers/${id}/status`, { isActive });