// server/src/server.js
import app from './app.js';
import { env, isR2Configured, isRazorpayConfigured, r2KeyProblems } from './config/env.js';
import { prisma } from './config/prisma.js';
import { purgeOld as purgeOldNotifications } from './notifications/notifications.service.js';
import { releaseExpiredUpi } from './orders/orders.service.js';
import { releaseExpired } from './payments/payments.service.js';

async function start() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Could not connect to PostgreSQL. Check DATABASE_URL in server/.env\n', err.message);
    process.exit(1);
  }

  if (r2KeyProblems.length) {
    console.warn('⚠️  Cloudflare R2 keys in .env look wrong — uploads are disabled until fixed:');
    for (const p of r2KeyProblems) console.warn(`     • ${p}`);
  } else if (!isR2Configured) console.warn('⚠️  Cloudflare R2 not configured — image/PDF uploads will return 503');
  if (!isRazorpayConfigured) console.warn('⚠️  Razorpay not configured — only Cash on Delivery is offered at checkout');

  // Every 5 min: release stock held by online orders that were never paid
  const sweeper = setInterval(() => {
    Promise.all([releaseExpired(), releaseExpiredUpi()])
      .then(([a, b]) => a + b && console.log(`🧹 Released ${a + b} unpaid online checkout(s)`))
      .catch((e) => console.error('Payment sweep failed:', e.message));
    // async wrapper: any error (even a synchronous one) is logged, never crashes the server
    (async () => purgeOldNotifications())().catch((e) => console.error('Notification cleanup failed:', e.message));
  }, 5 * 60 * 1000);
  sweeper.unref();

  const server = app.listen(env.PORT, () => console.log(`🚀 MotorDesk API running on http://localhost:${env.PORT}/api/v1`));

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();