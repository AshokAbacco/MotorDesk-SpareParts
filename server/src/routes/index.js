// server/src/routes/index.js
import { Router } from 'express';
import adminRoutes from '../admin/admin.routes.js';
import authRoutes from '../auth/auth.routes.js';
import billingRoutes from '../billing/billing.routes.js';
import garagesRoutes from '../garages/garages.routes.js';
import inventoryRoutes from '../inventory/inventory.routes.js';
import invoicesRoutes from '../invoices/invoices.routes.js';
import marketplaceRoutes from '../marketplace/marketplace.routes.js';
import notificationsRoutes from '../notifications/notifications.routes.js';
import onboardingRoutes from '../onboarding/onboarding.routes.js';
import ordersRoutes from '../orders/orders.routes.js';
import paymentsRoutes from '../payments/payments.routes.js';
import posRoutes from '../pos/pos.routes.js';
import productsRoutes from '../products/products.routes.js';
import reportsRoutes from '../reports/reports.routes.js';
import subscriptionsRoutes from '../subscriptions/subscriptions.routes.js';
import uploadsRoutes from '../uploads/uploads.routes.js';
import usersRoutes from '../users/users.routes.js';
import vehiclesRoutes from '../vehicles/vehicles.routes.js';
import vendorsRoutes from '../vendors/vendors.routes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/vendors', vendorsRoutes);
router.use('/products', productsRoutes);
router.use('/vehicles', vehiclesRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/pos', posRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/billing', billingRoutes);
router.use('/orders', ordersRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/garages', garagesRoutes);
router.use('/reports', reportsRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/admin', adminRoutes);
router.use('/uploads', uploadsRoutes);

export default router;