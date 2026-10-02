import api from '../../shared/axiosInstance.js';

// Search my stock across car + bike parts
export const searchPosItems = (q) => api.get('/inventory', { params: { q, limit: 12, stockStatus: 'IN_STOCK' } });
export const getPosGarages = () => api.get('/garages', { params: { limit: 100 } });
export const getQuote = (payload) => api.post('/pos/quote', payload);
export const checkout = (payload) => api.post('/pos/checkout', payload);
