import { sendSuccess } from '../utils/ApiResponse.js';
import * as paymentsService from './payments.service.js';

export const config = (_req, res) => sendSuccess(res, paymentsService.getConfig());
export const verify = async (req, res) => sendSuccess(res, await paymentsService.verifyFromCheckout(req.user.id, req.body), 'Payment successful');
export const cancel = async (req, res) => sendSuccess(res, await paymentsService.cancelByUser(req.user.id, req.params.id), 'Payment cancelled');
export const listMine = async (req, res) => sendSuccess(res, await paymentsService.listMine(req.user.id));

export const webhook = async (req, res) => {
  await paymentsService.handleWebhook(req.body, req.headers['x-razorpay-signature']);
  res.json({ ok: true });
};