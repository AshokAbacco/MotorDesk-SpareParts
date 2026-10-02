// server/src/users/users.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './users.controller.js';
import { addressSchema, changePasswordSchema, updateMeSchema } from './users.validation.js';

const router = Router();
router.use(authenticate);

// Profile
router.get('/me', asyncHandler(ctrl.getMe));
router.patch('/me', validate({ body: updateMeSchema }), asyncHandler(ctrl.updateMe));
router.patch('/me/password', validate({ body: changePasswordSchema }), asyncHandler(ctrl.changePassword));

// Address book (Home / Work / …) — one is the default, picked first at checkout
router.get('/me/addresses', asyncHandler(ctrl.listAddresses));
router.post('/me/addresses', validate({ body: addressSchema }), asyncHandler(ctrl.addAddress));
router.put('/me/addresses/:id', validate({ body: addressSchema }), asyncHandler(ctrl.updateAddress));
router.delete('/me/addresses/:id', asyncHandler(ctrl.deleteAddress));
router.patch('/me/addresses/:id/default', asyncHandler(ctrl.setDefaultAddress));

export default router;