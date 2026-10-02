import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { attachTenant } from '../middlewares/tenant.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './invoices.controller.js';

const router = Router();
router.use(authenticate, authorize('VENDOR'), attachTenant());

router.get('/', validate({ query: ctrl.listQuery }), asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getById));
router.get('/:id/pdf', asyncHandler(ctrl.downloadPdf));      // streams PDF (no storage needed)
router.post('/:id/share', asyncHandler(ctrl.publishPdf));    // uploads PDF to R2, returns public URL

export default router;
