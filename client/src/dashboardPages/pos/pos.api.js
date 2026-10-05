// client/src/dashboardPages/pos/pos.api.js
import api from '../../shared/axiosInstance.js';

// Search my stock across car + bike parts
export const searchPosItems = (q) => api.get('/inventory', { params: { q, limit: 12, stockStatus: 'IN_STOCK' } });
/** Own garages + MotorDesk Garage CRM garages, for the customer picker */
export const getPosGarages = () => api.get('/garages', { params: { limit: 1000, source: 'ALL' } });
export const getQuote = (payload) => api.post('/pos/quote', payload);
export const checkout = (payload) => api.post('/pos/checkout', payload);