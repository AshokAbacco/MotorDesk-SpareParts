import api from '../../shared/axiosInstance.js';

export const getUpiSettings = () => api.get('/vendors/me/upi');
export const saveUpiSettings = (body) => api.put('/vendors/me/upi', body);
export const removeUpiSettings = () => api.delete('/vendors/me/upi');
// Order options: Cash on delivery / Delivery (off = store pickup only) / delivery charge
export const getOrderSettings = () => api.get('/vendors/me/order-settings');
export const saveOrderSettings = (body) => api.put('/vendors/me/order-settings', body);
