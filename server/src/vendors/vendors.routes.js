import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { attachTenant } from '../middlewares/tenant.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './vendors.controller.js';
import { updateShopSchema, upiSettingsSchema } from './vendors.validation.js';

const router = Router();
// Pending vendors can still view/edit their own shop profile
router.use(authenticate, authorize('VENDOR'), attachTenant({ requireApproved: false }));

router.get('/me', asyncHandler(ctrl.getShop));
router.patch('/me', validate({ body: updateShopSchema }), asyncHandler(ctrl.updateShop));

// Online payment settings — the shop's own UPI account
router.get('/me/upi', asyncHandler(ctrl.getUpi));
router.put('/me/upi', validate({ body: upiSettingsSchema }), asyncHandler(ctrl.updateUpi));
router.delete('/me/upi', asyncHandler(ctrl.removeUpi));

export default router;