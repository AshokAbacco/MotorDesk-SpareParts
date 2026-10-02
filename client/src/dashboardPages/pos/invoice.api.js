import api from '../../shared/axiosInstance.js';

export const getInvoices = (params) => api.get('/invoices', { params });
export const getInvoice = (id) => api.get(`/invoices/${id}`);
/** Returns a Blob — open it in a new tab or download */
export const getInvoicePdf = (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
/** Uploads the PDF to Cloudflare R2 and returns { pdfUrl } for WhatsApp / email sharing */
export const shareInvoice = (id) => api.post(`/invoices/${id}/share`);
