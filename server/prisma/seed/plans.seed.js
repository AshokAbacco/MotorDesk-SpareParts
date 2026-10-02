// server/prisma/seed/plans.seed.js
const PLANS = [
  { name: 'Free', price: 0, durationDays: 365, maxSkus: 50, features: ['50 SKUs', 'POS billing', 'Basic reports'] },
  { name: 'Starter', price: 499, durationDays: 30, maxSkus: 500, features: ['500 SKUs', 'POS + GST invoices', 'Marketplace listing', 'UPI payments'] },
  { name: 'Pro', price: 1499, durationDays: 30, maxSkus: 5000, features: ['5,000 SKUs', 'Everything in Starter', 'Billing history & Excel', 'P&L and GST reports'] },
];

export async function seedPlans(prisma, vendors) {
  const plans = [];
  // update: p keeps plan names/prices/features in sync with this file
  for (const p of PLANS) plans.push(await prisma.plan.upsert({ where: { name: p.name }, update: p, create: p }));

  // Approved shops get an active Pro plan (renewed if it has expired)
  const pro = plans.find((p) => p.name === 'Pro');
  for (const v of vendors.filter((x) => x.status === 'APPROVED')) {
    const active = await prisma.subscription.findFirst({ where: { vendorId: v.id, status: 'ACTIVE', endDate: { gt: new Date() } } });
    if (!active) {
      await prisma.subscription.updateMany({ where: { vendorId: v.id, status: 'ACTIVE' }, data: { status: 'EXPIRED' } });
      await prisma.subscription.create({ data: { vendorId: v.id, planId: pro.id, endDate: new Date(Date.now() + pro.durationDays * 86400000) } });
    }
  }
  console.log(`  plans: ${plans.map((p) => p.name).join(', ')}`);
  return plans;
}