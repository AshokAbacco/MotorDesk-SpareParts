// client/src/dashboardPages/billingHistory/billingHistory.api.js
import api from '../../shared/axiosInstance.js';

// params: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', q?, paymentMode?, status?, page? }
export const getBillingSummary = (params) => api.get('/billing/summary', { params });
export const getWalkinBills = (params) => api.get('/billing/walkin', { params });
export const getOnlineBills = (params) => api.get('/billing/online', { params });

// Full records for the detail views
export const getBillDetails = (id) => api.get(`/invoices/${id}`);
export const getOrderDetails = (id) => api.get(`/orders/vendor/${id}`);

// Excel exports (return a Blob)
export const downloadWalkinExcel = (params) => api.get('/billing/walkin/export', { params, responseType: 'blob', timeout: 120000 });
export const downloadOnlineExcel = (params) => api.get('/billing/online/export', { params, responseType: 'blob', timeout: 120000 });