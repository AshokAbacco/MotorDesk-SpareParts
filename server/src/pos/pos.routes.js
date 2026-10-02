import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { attachTenant } from '../middlewares/tenant.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './pos.controller.js';
import { checkoutSchema, quoteSchema } from './pos.validation.js';

const router = Router();
router.use(authenticate, authorize('VENDOR'), attachTenant());

router.post('/quote', validate({ body: quoteSchema }), asyncHandler(ctrl.quote));
router.post('/checkout', validate({ body: checkoutSchema }), asyncHandler(ctrl.checkout));

export default router;
