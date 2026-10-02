// server/prisma/seed/inventory.seed.js
import { canStock } from '../../src/utils/inventoryType.js';

// Deterministic pseudo-random so re-seeding gives the same numbers
export const rand = (seed) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };

const BASE_PRICE = {
  Brakes: 650, Filters: 280, Suspension: 1800, Transmission: 1400, Lighting: 2200,
  'Body & Exterior': 750, Engine: 420, Lubricants: 380, Controls: 190,
};

// Regular B2B customers per shop (index matches the approved-vendor order)
const GARAGES = [
  [
    { name: 'Balaji Motor Works', ownerName: 'Venkatesh', phone: '9811111111', gstin: '29AAKFB1234C1Z2', address: 'Shivajinagar', state: 'Karnataka' },
    { name: 'City Car Care', ownerName: 'Farhan', phone: '9822222222', address: 'Koramangala 5th Block', state: 'Karnataka' },
    { name: 'Highway Bike Point', ownerName: 'Manoj', phone: '9833333333', address: 'Hosur Road', state: 'Tamil Nadu' },
  ],
  [
    { name: 'Deccan Auto Garage', ownerName: 'Sachin', phone: '9844444444', gstin: '27AAHFD5678D1Z9', address: 'Shivaji Nagar', state: 'Maharashtra' },
    { name: 'Pune Two-Wheeler Hub', ownerName: 'Rahul', phone: '9855555555', address: 'Kothrud', state: 'Maharashtra' },
  ],
];

// Sized to the sample sales so the demo P&L shows a small profit
const EXPENSES = [
  { title: 'Shop rent (share)', category: 'RENT', amount: 4500 },
  { title: 'Helper salary (part-time)', category: 'SALARY', amount: 3000 },
  { title: 'Electricity bill', category: 'ELECTRICITY', amount: 900 },
  { title: 'Parcel & transport', category: 'TRANSPORT', amount: 600 },
];

export async function seedInventory(prisma, vendors, products) {
  const approved = vendors.filter((v) => v.status === 'APPROVED');
  let count = 0;

  for (const [vi, vendor] of approved.entries()) {
    // Older databases may hold parts this shop no longer sells (e.g. bike parts in a car-only shop) → unlist them
    const offType = products.filter((p) => !p.vehicleTypes.some((t) => canStock(vendor.inventoryType, t))).map((p) => p.id);
    if (offType.length) {
      await prisma.inventory.updateMany({ where: { vendorId: vendor.id, productId: { in: offType }, isListed: true }, data: { isListed: false } });
    }

    for (const [pi, product] of products.entries()) {
      if (vi === 1 && pi % 3 === 0) continue; // second shop carries a smaller range
      if (!product.vehicleTypes.some((t) => canStock(vendor.inventoryType, t))) continue; // car-only / bike-only shops

      const base = BASE_PRICE[product.category] ?? 500;
      const price = Math.round(base * (0.85 + rand(pi + vi * 31) * 0.4)); // selling price, excl. GST
      const mrp = Math.round(price * (1 + Number(product.gstRate) / 100) * 1.12); // incl. GST, ~12% above customer price
      const costPrice = Math.round(price * 0.72); // purchase cost (for P&L)
      const stock = pi % 7 === 0 ? 3 : 15 + Math.floor(rand(pi * 7 + vi) * 50);

      await prisma.inventory.upsert({
        where: { vendorId_productId: { vendorId: vendor.id, productId: product.id } },
        update: {},
        create: { vendorId: vendor.id, productId: product.id, costPrice, price, mrp, stock, lowStockThreshold: 5 },
      });
      count++;
    }

    // Garages (B2B customers)
    for (const g of GARAGES[vi] ?? []) {
      await prisma.garage.upsert({ where: { vendorId_phone: { vendorId: vendor.id, phone: g.phone } }, update: {}, create: { ...g, vendorId: vendor.id } });
    }

    // Monthly expenses for the P&L screen (only if the shop has none this month)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const has = await prisma.expense.count({ where: { vendorId: vendor.id, date: { gte: monthStart } } });
    if (!has) {
      await prisma.expense.createMany({
        data: EXPENSES.map((e) => ({ ...e, vendorId: vendor.id, amount: vi === 0 ? e.amount : Math.round(e.amount * 0.8), date: new Date(monthStart.getTime() + 2 * 86400000) })),
      });
    }
  }

  const garageCount = approved.reduce((n, _, i) => n + (GARAGES[i]?.length ?? 0), 0);
  console.log(`  inventory rows: ${count}, garages: ${garageCount}, expenses: ${EXPENSES.length} per shop`);
}