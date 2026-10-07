// client/src/landingPages/pricing/pricing.api.js
import api from '../../shared/axiosInstance.js';

/** { plans, paymentsEnabled } — Urban / Rural sign-up plans */
export const getSignupPlans = () => api.get('/onboarding/plans');
/** Payment form → Razorpay checkout data (nothing is saved yet) */
export const startSignupPayment = (form) => api.post('/onboarding/checkout', form);
/** After Razorpay success → saves the paid details, returns { signupId, ...prefill } */
export const verifySignupPayment = (response) => api.post('/onboarding/verify', response);
/** Paid details to prefill the register form */
export const getPaidSignup = (id) => api.get(`/onboarding/signup/${id}`);