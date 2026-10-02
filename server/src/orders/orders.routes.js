import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { attachTenant } from '../middlewares/tenant.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './orders.controller.js';
import { createOrderSchema, listOrdersQuery, updateStatusSchema, upiSubmitSchema, verifyPaymentSchema } from './orders.validation.js';

const router = Router();
const customer = [authenticate, authorize('CUSTOMER')];
const vendor = [authenticate, authorize('VENDOR'), attachTenant()];
const listQ = validate({ query: listOrdersQuery });

// Customer
router.post('/', ...customer, validate({ body: createOrderSchema }), asyncHandler(ctrl.create));
router.get('/my', ...customer, listQ, asyncHandler(ctrl.listMine));
router.get('/my/:id', ...customer, asyncHandler(ctrl.getMine));
router.patch('/my/:id/cancel', ...customer, asyncHandler(ctrl.cancelMine));
router.get('/my/:id/upi', ...customer, asyncHandler(ctrl.upiDetails));            // shop's UPI ID + link/QR data
router.post('/my/:id/upi', ...customer, validate({ body: upiSubmitSchema }), asyncHandler(ctrl.submitUpi)); // "I've paid" + UTR

// Vendor
router.get('/vendor', ...vendor, listQ, asyncHandler(ctrl.listVendor));
router.get('/vendor/:id', ...vendor, asyncHandler(ctrl.getVendor));
router.patch('/vendor/:id/status', ...vendor, validate({ body: updateStatusSchema }), asyncHandler(ctrl.updateStatus));
router.patch('/vendor/:id/payment', ...vendor, validate({ body: verifyPaymentSchema }), asyncHandler(ctrl.verifyUpi)); // confirm / reject UPI

export default router;