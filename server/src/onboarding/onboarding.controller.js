// server/src/onboarding/onboarding.controller.js
import { sendSuccess } from '../utils/ApiResponse.js';
import * as service from './onboarding.service.js';

export const plans = async (_req, res) => sendSuccess(res, await service.listSignupPlans());
export const checkout = async (req, res) => sendSuccess(res, await service.checkout(req.body), 'Opening payment');
export const verify = async (req, res) => sendSuccess(res, await service.verify(req.body), 'Payment successful');
export const getSignup = async (req, res) => sendSuccess(res, await service.getPaidSignup(req.params.id));