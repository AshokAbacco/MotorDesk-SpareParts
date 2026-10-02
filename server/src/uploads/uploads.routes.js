// server/src/uploads/uploads.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { uploadImages } from '../middlewares/upload.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './uploads.controller.js';

const router = Router();
router.use(authenticate, authorize('ADMIN', 'VENDOR'));

// multipart/form-data, field name "images" (max 6 files, 5 MB each)
router.post('/images', uploadImages.array('images', 6), asyncHandler(ctrl.uploadImages));
// JSON { url } — the server downloads the image and stores its own copy in R2
router.post('/images/from-url', asyncHandler(ctrl.uploadFromUrl));
router.delete('/images', authorize('ADMIN'), asyncHandler(ctrl.deleteImage));

export default router;