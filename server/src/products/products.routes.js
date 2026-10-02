// server/src/products/products.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { attachTenant } from '../middlewares/tenant.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './products.controller.js';
import { createProductSchema, listProductsQuery, setVehiclesSchema, updateProductSchema } from './products.validation.js';

const router = Router();

/** For vendors, load their shop (req.vendor) so the service can apply ownership rules */
const loadShop = (opts) => (req, res, next) => (req.user.role === 'VENDOR' ? attachTenant(opts)(req, res, next) : next());

// Catalog: admin sees everything; a vendor sees the master catalog + its own products
router.get('/', authenticate, loadShop({ requireApproved: false }), validate({ query: listProductsQuery }), asyncHandler(ctrl.list));
router.get('/categories', asyncHandler(ctrl.categories));
router.get('/:id', authenticate, loadShop({ requireApproved: false }), asyncHandler(ctrl.getById));

// Admin → master catalog products. Approved vendor → the shop's own products (only its own can be changed)
const editors = [authenticate, authorize('ADMIN', 'VENDOR'), loadShop()];
router.post('/', ...editors, validate({ body: createProductSchema }), asyncHandler(ctrl.create));
router.patch('/:id', ...editors, validate({ body: updateProductSchema }), asyncHandler(ctrl.update));
router.put('/:id/vehicles', ...editors, validate({ body: setVehiclesSchema }), asyncHandler(ctrl.setVehicles));
router.delete('/:id', ...editors, asyncHandler(ctrl.remove));

export default router;