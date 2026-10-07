// server/src/onboarding/onboarding.routes.js
import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './onboarding.controller.js';
import { signupCheckoutSchema, signupVerifySchema } from './onboarding.validation.js';

// Public (no login yet): shop owners pay for a plan, then register
const router = Router();

router.get('/plans', asyncHandler(ctrl.plans));                                                        // pricing cards
router.post('/checkout', validate({ body: signupCheckoutSchema }), asyncHandler(ctrl.checkout));       // payment form → Razorpay order
router.post('/verify', validate({ body: signupVerifySchema }), asyncHandler(ctrl.verify));             // after Razorpay success
router.get('/signup/:id', asyncHandler(ctrl.getSignup));                                               // prefill the register form

export default router;