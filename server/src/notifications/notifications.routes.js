// server/src/notifications/notifications.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ctrl from './notifications.controller.js';
import { listNotificationsQuery } from './notifications.validation.js';

// Every logged-in user (customer, shop, admin) only ever sees their own notifications
const router = Router();
router.use(authenticate);

router.get('/', validate({ query: listNotificationsQuery }), asyncHandler(ctrl.list));
router.get('/unread-count', asyncHandler(ctrl.unreadCount));
router.patch('/read-all', asyncHandler(ctrl.markAllRead));
router.patch('/:id/read', asyncHandler(ctrl.markRead));
router.delete('/', asyncHandler(ctrl.clearAll));       // Clear all
router.delete('/:id', asyncHandler(ctrl.remove));      // Delete one

export default router;