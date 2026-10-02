// server/src/billing/billing.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { attachTenant } from '../middlewares/tenant.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './billing.controller.js';
import { onlineListQuery, rangeQuery, walkinListQuery } from './billing.validation.js';

const router = Router();
router.use(authenticate, authorize('VENDOR'), attachTenant());

// ?from=YYYY-MM-DD&to=YYYY-MM-DD  (IST days; default = this month)
router.get('/summary', validate({ query: rangeQuery }), asyncHandler(ctrl.summary));
router.get('/walkin', validate({ query: walkinListQuery }), asyncHandler(ctrl.listWalkin));
router.get('/online', validate({ query: onlineListQuery }), asyncHandler(ctrl.listOnline));
router.get('/walkin/export', validate({ query: walkinListQuery }), asyncHandler(ctrl.exportWalkin));
router.get('/online/export', validate({ query: onlineListQuery }), asyncHandler(ctrl.exportOnline));

export default router;