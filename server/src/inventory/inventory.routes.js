import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { attachTenant } from '../middlewares/tenant.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './inventory.controller.js';
import { addInventorySchema, adjustStockSchema, listInventoryQuery, updateInventorySchema } from './inventory.validation.js';

const router = Router();
router.use(authenticate, authorize('VENDOR'), attachTenant());

router.get('/', validate({ query: listInventoryQuery }), asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getById));
router.post('/', validate({ body: addInventorySchema }), asyncHandler(ctrl.add));
router.patch('/:id', validate({ body: updateInventorySchema }), asyncHandler(ctrl.update));
router.patch('/:id/stock', validate({ body: adjustStockSchema }), asyncHandler(ctrl.adjustStock));
router.delete('/:id', asyncHandler(ctrl.remove));

export default router;
