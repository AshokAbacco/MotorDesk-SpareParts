import Razorpay from 'razorpay';
import { env, isRazorpayConfigured } from './env.js';

export const razorpay = isRazorpayConfigured
  ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
  : null;

export const RAZORPAY_KEY_ID = env.RAZORPAY_KEY_ID; // public key, safe to send to the browser