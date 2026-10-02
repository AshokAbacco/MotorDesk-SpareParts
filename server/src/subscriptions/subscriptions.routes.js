import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { attachTenant } from '../middlewares/tenant.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './subscriptions.controller.js';
import { planSchema, subscribeSchema, updatePlanSchema } from './subscriptions.validation.js';

const router = Router();
const admin = [authenticate, authorize('ADMIN')];
const vendor = [authenticate, authorize('VENDOR'), attachTenant({ requireApproved: false })];

// Public pricing page
router.get('/plans', asyncHandler(ctrl.listActivePlans));

// Vendor
router.get('/me', ...vendor, asyncHandler(ctrl.current));
router.post('/subscribe', ...vendor, validate({ body: subscribeSchema }), asyncHandler(ctrl.subscribe));

// Admin plan management
router.get('/plans/all', ...admin, asyncHandler(ctrl.listAllPlans));
router.post('/plans', ...admin, validate({ body: planSchema }), asyncHandler(ctrl.createPlan));
router.patch('/plans/:id', ...admin, validate({ body: updatePlanSchema }), asyncHandler(ctrl.updatePlan));
router.delete('/plans/:id', ...admin, asyncHandler(ctrl.deactivatePlan));

export default router;
