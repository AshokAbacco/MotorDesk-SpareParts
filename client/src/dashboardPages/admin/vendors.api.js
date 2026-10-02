import api from '../../shared/axiosInstance.js';

export const getVendors = (params) => api.get('/admin/vendors', { params });
export const setVendorStatus = (id, status) => api.patch(`/admin/vendors/${id}/status`, { status });
