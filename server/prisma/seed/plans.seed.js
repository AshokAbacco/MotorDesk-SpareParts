// server/prisma/seed/plans.seed.js
const PLANS = [
  
  { name: 'Premium – Urban', area: 'URBAN', price: 500, durationDays: 30, maxSkus: 5000, features: ['For shops in cities & towns', 'POS billing with GST invoices', 'Car & bike inventory', 'Online orders from the marketplace', 'Billing history, P&L and GST reports'] },
  { name: 'Premium – Rural', area: 'RURAL', price: 350, durationDays: 30, maxSkus: 5000, features: ['For shops in villages & rural areas', 'POS billing with GST invoices', 'Car & bike inventory', 'Online orders from the marketplace', 'Billing history, P&L and GST reports'] },
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