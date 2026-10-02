// server/prisma/seed/index.js
import { PrismaClient } from '@prisma/client';
import { seedInventory } from './inventory.seed.js';
import { seedPlans } from './plans.seed.js';
import { seedProducts } from './products.seed.js';
import { seedSales } from './sales.seed.js';
import { DEMO_PASSWORD, seedUsers } from './users.seed.js';
import { seedVehicles } from './vehicles.seed.js';

const prisma = new PrismaClient();

/*
 * Safe to run again at any time:
 *  - resets every demo login's password to 123456
 *  - adds anything missing, never duplicates, never deletes your own data
 * Run with:  npm run seed   (or: npx prisma db seed)
 */
async function main() {
  console.log('🌱 Seeding MotorDesk...');
  const { vendors, customer } = await seedUsers(prisma);
  const vehicles = await seedVehicles(prisma);
  const products = await seedProducts(prisma, vehicles);
  await seedPlans(prisma, vendors);
  await seedInventory(prisma, vendors, products);
  await seedSales(prisma, vendors, customer);

  console.log(`\n✅ Done. Demo logins — password for all: ${DEMO_PASSWORD}`);
  console.log('   Admin    → admin@motordesk.in');
  console.log('   Vendor   → ravi@srautoparts.in   (Sri Ram Auto Parts · Car + Bike · UPI sriramauto@okaxis)');
  console.log('   Vendor   → imran@speedspares.in  (Speed Spares · Car only · UPI speedspares@ybl)');
  console.log('   Vendor   → suresh@bikezone.in    (Bike Zone Spares · Bike only · pending approval)');
  console.log('   Customer → customer@motordesk.in (2 saved addresses)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());