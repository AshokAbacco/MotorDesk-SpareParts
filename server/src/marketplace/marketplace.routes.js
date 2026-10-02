// server/src/marketplace/marketplace.routes.js
import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './marketplace.controller.js';
import { browseQuery, validateCartSchema } from './marketplace.validation.js';

// Public storefront — no login needed to browse
const router = Router();

router.get('/products', validate({ query: browseQuery }), asyncHandler(ctrl.browse));
router.get('/products/:id', asyncHandler(ctrl.productDetail));
router.get('/products/:id/related', asyncHandler(ctrl.related)); // "Related parts" + "More parts" rows
router.post('/cart/validate', validate({ body: validateCartSchema }), asyncHandler(ctrl.validateCart));

export default router;