import api from '../../shared/axiosInstance.js';

// Shop profile
export const getShop = () => api.get('/vendors/me');
export const updateShop = (body) => api.patch('/vendors/me', body);

// Reports
export const getPnl = (params) => api.get('/reports/pnl', { params });
export const getGstReport = (params) => api.get('/reports/gst', { params });

// Expenses
export const getExpenses = (params) => api.get('/reports/expenses', { params });
export const addExpense = (body) => api.post('/reports/expenses', body);
export const deleteExpense = (id) => api.delete(`/reports/expenses/${id}`);

// Subscription
export const getMySubscription = () => api.get('/subscriptions/me');
export const getPlans = () => api.get('/subscriptions/plans');
/** Free plan → { subscription }   Paid plan → { payment } to open in Razorpay */
export const subscribeToPlan = (planId) => api.post('/subscriptions/subscribe', { planId });
export const verifyPlanPayment = (response) => api.post('/payments/razorpay/verify', response);
export const cancelPlanPayment = (paymentId) => api.post(`/payments/${paymentId}/cancel`);