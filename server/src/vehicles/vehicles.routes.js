// server/src/vehicles/vehicles.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { attachTenant } from '../middlewares/tenant.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './vehicles.controller.js';
import { bulkCreateVehicleSchema, createVehicleSchema, listVehiclesQuery } from './vehicles.validation.js';

const router = Router();
const q = validate({ query: listVehiclesQuery });

// Public: powers the "Select your vehicle" dropdowns
router.get('/', q, asyncHandler(ctrl.list));
router.get('/brands', q, asyncHandler(ctrl.brands));
router.get('/models', q, asyncHandler(ctrl.models));
router.get('/years', q, asyncHandler(ctrl.years));

router.post('/', authenticate, authorize('ADMIN'), validate({ body: createVehicleSchema }), asyncHandler(ctrl.create));
// "Add new brand / model" from Vehicle fitment — admin, or an approved shop (saved for everyone to pick later)
const loadShop = (req, res, next) => (req.user.role === 'VENDOR' ? attachTenant()(req, res, next) : next());
router.post('/bulk', authenticate, authorize('ADMIN', 'VENDOR'), loadShop, validate({ body: bulkCreateVehicleSchema }), asyncHandler(ctrl.bulkCreate));
router.delete('/:id', authenticate, authorize('ADMIN'), asyncHandler(ctrl.remove));

export default router;