// server/src/garages/garages.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { attachTenant } from '../middlewares/tenant.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './garages.controller.js';
import { garageSchema, listGaragesQuery, updateGarageSchema } from './garages.validation.js';

const router = Router();
router.use(authenticate, authorize('VENDOR'), attachTenant());

router.get('/', validate({ query: listGaragesQuery }), asyncHandler(ctrl.list));
router.post('/', validate({ body: garageSchema }), asyncHandler(ctrl.create));
router.get('/:id', asyncHandler(ctrl.getById));
router.patch('/:id', validate({ body: updateGarageSchema }), asyncHandler(ctrl.update));
router.delete('/:id', asyncHandler(ctrl.remove));

export default router;