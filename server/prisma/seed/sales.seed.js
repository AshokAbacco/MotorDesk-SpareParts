// server/prisma/seed/sales.seed.js
import { calculateGst } from '../../src/utils/gst.js';
import { nextInvoiceNumber, nextOrderNumber } from '../../src/utils/invoiceNumber.js';
import { rand } from './inventory.seed.js';

/*
 * Sample sales so the Dashboard, Billing History, P&L and GST screens have data:
 *   • counter (POS) bills spread over the last ~6 weeks for each approved shop
 *   • a few marketplace orders for the demo customer in different statuses
 * Runs only when a shop has no bills yet / the customer has no orders, so re-seeding never duplicates.
 */
const DAY = 24 * 60 * 60 * 1000;

const WALK_IN = [
  { customerName: 'Ramesh', customerPhone: '9811100001' },
  { customerName: 'Priya' },
  { customerName: 'Suresh Motors', customerPhone: '9811100002', customerState: 'Tamil Nadu' },
  { customerName: 'Arjun', customerPhone: '9811100003' },
  { customerName: 'Walk-in customer' },
  { customerName: 'Kiran', customerPhone: '9811100004' },
  { customerName: 'Mohammed Ali', customerPhone: '9811100005' },
  { customerName: 'Deepa' },
];
const MODES = ['CASH', 'UPI', 'CARD', 'UPI', 'CASH', 'UPI'];

const line = (inv, quantity) => ({
  inventoryId: inv.id,
  productName: inv.product.name,
  oemNumber: inv.product.oemNumber,
  hsnCode: inv.product.hsnCode,
  quantity,
  unitPrice: Number(inv.price),
  costPrice: Number(inv.costPrice),
  gstRate: Number(inv.product.gstRate),
});

async function takeStock(tx, lines) {
  for (const l of lines) {
    const r = await tx.inventory.updateMany({ where: { id: l.inventoryId, stock: { gte: l.quantity } }, data: { stock: { decrement: l.quantity } } });
    if (!r.count) throw new Error(`Seed: not enough stock for ${l.productName}`);
  }
}

const invoiceItems = (gst) => ({
  create: gst.lines.map((l) => ({
    inventoryId: l.inventoryId, productName: l.productName, oemNumber: l.oemNumber, hsnCode: l.hsnCode, quantity: l.quantity,
    unitPrice: l.unitPrice, costPrice: l.costPrice, gstRate: l.gstRate, taxAmount: l.taxAmount, lineTotal: l.lineTotal,
  })),
});

// ─────────────── counter bills ───────────────

async function seedCounterBills(prisma, vendor, vi) {
  if (await prisma.invoice.count({ where: { vendorId: vendor.id } })) return 0;

  const stock = await prisma.inventory.findMany({ where: { vendorId: vendor.id, stock: { gt: 10 }, isListed: true }, include: { product: true }, orderBy: { createdAt: 'asc' } });
  const garages = await prisma.garage.findMany({ where: { vendorId: vendor.id }, orderBy: { createdAt: 'asc' } });
  if (!stock.length) return 0;

  const total = vi === 0 ? 24 : 14;
  let made = 0;
  for (let i = 0; i < total; i++) {
    // Oldest first so invoice numbers increase with time; the last 3 bills are today
    const daysAgo = i >= total - 3 ? 0 : Math.round(((total - 4 - i) / (total - 4)) * 40) + 1;
    const at = new Date(Date.now() - daysAgo * DAY - Math.floor(rand(i + vi * 7) * 5) * 3600 * 1000);

    const picks = 1 + Math.floor(rand(i * 3 + vi) * 3);
    const lines = [];
    for (let k = 0; k < picks; k++) {
      const inv = stock[(i * 5 + k * 3 + vi) % stock.length];
      if (!lines.some((l) => l.inventoryId === inv.id)) lines.push(line(inv, 1 + Math.floor(rand(i * 11 + k) * 2)));
    }

    const garage = i % 5 === 2 && garages.length ? garages[i % garages.length] : null;
    const walkIn = WALK_IN[i % WALK_IN.length];
    const buyerState = garage?.state || walkIn.customerState || vendor.state;
    const gst = calculateGst(lines, { sellerState: vendor.state, buyerState, discount: i % 6 === 0 ? 50 : 0 });

    await prisma.$transaction(async (tx) => {
      await takeStock(tx, lines);
      await tx.invoice.create({
        data: {
          invoiceNumber: await nextInvoiceNumber(tx, vendor.id),
          vendorId: vendor.id,
          garageId: garage?.id,
          customerName: garage?.name ?? walkIn.customerName,
          customerPhone: garage?.phone ?? walkIn.customerPhone ?? null,
          customerGstin: garage?.gstin ?? null,
          placeOfSupply: buyerState,
          paymentMode: MODES[i % MODES.length],
          subtotal: gst.subtotal, discount: gst.discount, cgst: gst.cgst, sgst: gst.sgst, igst: gst.igst, grandTotal: gst.grandTotal,
          createdAt: at,
          items: invoiceItems(gst),
        },
      });
    });
    made++;
  }
  return made;
}

// ─────────────── marketplace orders ───────────────

const ORDER_PLAN = [
  { shop: 0, status: 'DELIVERED', paymentMode: 'COD', daysAgo: 12 },
  { shop: 1, status: 'CANCELLED', paymentMode: 'COD', daysAgo: 8 },
  { shop: 0, status: 'SHIPPED', paymentMode: 'UPI', daysAgo: 3 },
  { shop: 1, status: 'ACCEPTED', paymentMode: 'COD', daysAgo: 1 },
  { shop: 0, status: 'PENDING', paymentMode: 'COD', daysAgo: 0 },
];
const FLOW = ['PENDING', 'ACCEPTED', 'PACKED', 'SHIPPED', 'DELIVERED'];

async function seedOrders(prisma, vendors, customer) {
  if (!customer || (await prisma.order.count({ where: { customerId: customer.id } }))) return 0;
  const address = customer.addresses?.[0];
  if (!address) return 0;
  const { name, phone, line1, landmark, city, state, pincode } = address;
  const shippingAddress = { name, phone, line1, city, state, pincode, ...(landmark && { landmark }) };

  let made = 0;
  for (const [i, plan] of ORDER_PLAN.entries()) {
    const vendor = vendors[plan.shop];
    if (!vendor) continue;
    const inv = await prisma.inventory.findFirst({
      where: { vendorId: vendor.id, stock: { gt: 5 }, isListed: true },
      include: { product: true },
      orderBy: { stock: 'desc' },
      skip: i,
    });
    if (!inv) continue;

    const lines = [line(inv, 1 + (i % 2))];
    const gst = calculateGst(lines, { sellerState: vendor.state, buyerState: state });
    const createdAt = new Date(Date.now() - plan.daysAgo * DAY - 2 * 3600 * 1000);
    const steps = plan.status === 'CANCELLED' ? ['PENDING', 'CANCELLED'] : FLOW.slice(0, FLOW.indexOf(plan.status) + 1);
    const statusHistory = steps.map((s, k) => ({ status: s, at: new Date(createdAt.getTime() + k * 6 * 3600 * 1000).toISOString() }));
    const paid = plan.status === 'DELIVERED' || plan.paymentMode === 'UPI';

    await prisma.$transaction(async (tx) => {
      if (plan.status !== 'CANCELLED') await takeStock(tx, lines);
      const order = await tx.order.create({
        data: {
          orderNumber: await nextOrderNumber(tx, vendor.id),
          customerId: customer.id,
          vendorId: vendor.id,
          status: plan.status,
          paymentMode: plan.paymentMode,
          paymentStatus: paid ? 'PAID' : 'PENDING',
          ...(plan.paymentMode === 'UPI' && { upiRef: `42650000${String(i).padStart(4, '0')}`, upiSubmittedAt: createdAt, paymentVerifiedAt: createdAt }),
          subtotal: gst.subtotal, taxTotal: gst.taxTotal, grandTotal: gst.grandTotal,
          shippingAddress,
          statusHistory,
          createdAt,
          items: {
            create: gst.lines.map((l) => ({
              inventoryId: l.inventoryId, productName: l.productName, oemNumber: l.oemNumber, quantity: l.quantity,
              unitPrice: l.unitPrice, gstRate: l.gstRate, lineTotal: l.lineTotal,
            })),
          },
        },
      });

      // Delivered orders get their GST invoice, like the real flow
      if (plan.status === 'DELIVERED') {
        await tx.invoice.create({
          data: {
            invoiceNumber: await nextInvoiceNumber(tx, vendor.id),
            vendorId: vendor.id,
            orderId: order.id,
            customerName: name,
            customerPhone: phone,
            placeOfSupply: state,
            paymentMode: plan.paymentMode,
            subtotal: gst.subtotal, cgst: gst.cgst, sgst: gst.sgst, igst: gst.igst, grandTotal: gst.grandTotal,
            createdAt: new Date(createdAt.getTime() + 4 * 6 * 3600 * 1000),
            items: invoiceItems(gst),
          },
        });
      }
    });
    made++;
  }
  return made;
}

export async function seedSales(prisma, vendors, customer) {
  const approved = vendors.filter((v) => v.status === 'APPROVED');
  let bills = 0;
  for (const [vi, vendor] of approved.entries()) bills += await seedCounterBills(prisma, vendor, vi);
  const orders = await seedOrders(prisma, approved, customer);
  console.log(`  sample sales: ${bills} counter bills, ${orders} online orders${bills + orders === 0 ? ' (already present — skipped)' : ''}`);
}