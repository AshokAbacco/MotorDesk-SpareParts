// server/src/admin/admin.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './admin.controller.js';
import {
  createCustomerSchema, customerStatusSchema, listCustomersQuery, listVendorsQuery, updateCustomerSchema, vendorStatusSchema,
} from './admin.validation.js';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

router.get('/analytics', asyncHandler(ctrl.analytics));
router.get('/vendors', validate({ query: listVendorsQuery }), asyncHandler(ctrl.listVendors));
router.patch('/vendors/:id/status', validate({ body: vendorStatusSchema }), asyncHandler(ctrl.setVendorStatus));

// Customers
router.get('/customers', validate({ query: listCustomersQuery }), asyncHandler(ctrl.listCustomers));
router.post('/customers', validate({ body: createCustomerSchema }), asyncHandler(ctrl.createCustomer));
router.put('/customers/:id', validate({ body: updateCustomerSchema }), asyncHandler(ctrl.updateCustomer));
router.patch('/customers/:id/status', validate({ body: customerStatusSchema }), asyncHandler(ctrl.setCustomerStatus));
router.delete('/customers/:id', asyncHandler(ctrl.deleteCustomer));

export default router;