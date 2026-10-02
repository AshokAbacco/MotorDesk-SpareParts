import api from '../../shared/axiosInstance.js';

export const getUpiSettings = () => api.get('/vendors/me/upi');
export const saveUpiSettings = (body) => api.put('/vendors/me/upi', body);
export const removeUpiSettings = () => api.delete('/vendors/me/upi');