import express, { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './payments.controller.js';
import { verifySchema } from './payments.validation.js';

const router = Router();

router.get('/config', ctrl.config);                // public: is Razorpay on? + public key
router.get('/my', authenticate, asyncHandler(ctrl.listMine));
router.post('/razorpay/verify', authenticate, validate({ body: verifySchema }), asyncHandler(ctrl.verify));
router.post('/:id/cancel', authenticate, asyncHandler(ctrl.cancel));

export default router;

/**
 * Webhook needs the RAW body to check Razorpay's HMAC signature,
 * so app.js mounts this BEFORE express.json().
 * Razorpay Dashboard → Webhooks → URL: https://<your-api>/api/v1/payments/razorpay/webhook
 */
export const webhookRouter = Router();
webhookRouter.post('/', express.raw({ type: 'application/json', limit: '1mb' }), asyncHandler(ctrl.webhook));