// server/src/partners/partner.routes.js
// Server-to-server API for partner apps (Motor Konnect). See partner.middleware.js for the headers.
//
//   POST  /partner/cart/validate        live price / stock / shop order options
//   POST  /partner/orders               place order(s) — COD (cash on delivery / pay at shop) or UPI
//   GET   /partner/orders               the customer's orders
//   GET   /partner/orders/:id
//   PATCH /partner/orders/:id/cancel
//   GET   /partner/orders/:id/upi       shop UPI ID + amount + upi:// link
//   POST  /partner/orders/:id/upi       "I've paid" + UTR
import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { sendCreated } from '../utils/ApiResponse.js';
import * as marketCtrl from '../marketplace/marketplace.controller.js';
import { validateCartSchema } from '../marketplace/marketplace.validation.js';
import * as ordersCtrl from '../orders/orders.controller.js';
import * as ordersService from '../orders/orders.service.js';
import { createOrderSchema, listOrdersQuery, upiSubmitSchema } from '../orders/orders.validation.js';
import { partnerCustomer, partnerKey } from './partner.middleware.js';

const router = Router();
router.use(partnerKey);

router.post('/cart/validate', validate({ body: validateCartSchema }), asyncHandler(marketCtrl.validateCart));

const customer = asyncHandler(partnerCustomer);

router.post(
  '/orders',
  customer,
  validate({ body: createOrderSchema }),
  asyncHandler(async (req, res) => {
    // Razorpay checkout runs in the MotorDesk website only; partner apps use COD or direct UPI
    if (req.body.paymentMode === 'ONLINE') throw ApiError.badRequest('Choose Cash on delivery / Pay at shop or UPI');
    sendCreated(res, await ordersService.create(req.user, req.body, { source: req.partner }), 'Order placed');
  })
);
router.get('/orders', customer, validate({ query: listOrdersQuery }), asyncHandler(ordersCtrl.listMine));
router.get('/orders/:id', customer, asyncHandler(ordersCtrl.getMine));
router.patch('/orders/:id/cancel', customer, asyncHandler(ordersCtrl.cancelMine));
router.get('/orders/:id/upi', customer, asyncHandler(ordersCtrl.upiDetails));
router.post('/orders/:id/upi', customer, validate({ body: upiSubmitSchema }), asyncHandler(ordersCtrl.submitUpi));

export default router;
