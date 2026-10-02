import api from '../../shared/axiosInstance.js';

/** Shop's UPI ID, payee name, amount and ready-made upi:// link for one order */
export const getUpiDetails = (orderId) => api.get(`/orders/my/${orderId}/upi`);
/** "I've paid" — sends the UTR / UPI reference number to the shop for confirmation */
export const submitUpiPayment = (orderId, utr) => api.post(`/orders/my/${orderId}/upi`, { utr });
export const cancelUnpaidOrder = (orderId) => api.patch(`/orders/my/${orderId}/cancel`);