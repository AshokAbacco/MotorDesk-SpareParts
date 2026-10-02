import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { attachTenant } from '../middlewares/tenant.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './reports.controller.js';
import { expenseSchema, rangeQuery } from './reports.validation.js';

const router = Router();
router.use(authenticate, authorize('VENDOR'), attachTenant());
const q = validate({ query: rangeQuery });

router.get('/dashboard', asyncHandler(ctrl.dashboard));
router.get('/pnl', q, asyncHandler(ctrl.pnl));
router.get('/gst', q, asyncHandler(ctrl.gst));
router.get('/expenses', q, asyncHandler(ctrl.listExpenses));
router.post('/expenses', validate({ body: expenseSchema }), asyncHandler(ctrl.addExpense));
router.delete('/expenses/:id', asyncHandler(ctrl.deleteExpense));

export default router;
