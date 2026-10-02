// server/src/billing/billing.service.js
import { prisma } from '../config/prisma.js';
import { istRange, startOfDayIst, startOfMonthIst, startOfWeekIst } from '../utils/dateRange.js';
import { round2, toNum } from '../utils/money.js';
import { buildMeta, getPagination } from '../utils/pagination.js';

/*
 * Walk-in = counter bills made in POS (invoices NOT linked to a marketplace order).
 * Online  = marketplace orders (unpaid online checkouts are excluded — they aren't sales yet).
 */
const walkinBase = (vendorId) => ({ vendorId, orderId: null });
const onlineBase = (vendorId) => ({ vendorId, status: { not: 'AWAITING_PAYMENT' } });

// ─────────────── summary cards ───────────────

async function walkinStats(vendorId, createdAt) {
  const a = await prisma.invoice.aggregate({ where: { ...walkinBase(vendorId), createdAt }, _count: true, _sum: { grandTotal: true } });
  return { count: a._count, amount: toNum(a._sum.grandTotal) };
}

async function onlineStats(vendorId, createdAt) {
  const [all, live] = await Promise.all([
    prisma.order.count({ where: { ...onlineBase(vendorId), createdAt } }),
    // Cancelled orders are counted but not added to sales value
    prisma.order.aggregate({ where: { ...onlineBase(vendorId), createdAt, status: { notIn: ['AWAITING_PAYMENT', 'CANCELLED'] } }, _sum: { grandTotal: true } }),
  ]);
  return { count: all, amount: toNum(live._sum.grandTotal) };
}

export async function summary(vendorId, query) {
  const now = new Date();
  const periods = {
    today: { gte: startOfDayIst(now), lte: now },
    week: { gte: startOfWeekIst(now), lte: now },
    month: { gte: startOfMonthIst(now), lte: now },
    range: istRange(query),
  };
  const out = { range: { from: periods.range.gte, to: periods.range.lte }, walkin: {}, online: {} };
  await Promise.all(
    Object.entries(periods).flatMap(([key, createdAt]) => [
      walkinStats(vendorId, createdAt).then((s) => { out.walkin[key] = s; }),
      onlineStats(vendorId, createdAt).then((s) => { out.online[key] = s; }),
    ])
  );
  return out;
}

// ─────────────── lists ───────────────

function walkinWhere(vendorId, query) {
  const where = { ...walkinBase(vendorId), createdAt: istRange(query) };
  if (query.paymentMode) where.paymentMode = query.paymentMode;
  if (query.q) {
    where.OR = [
      { invoiceNumber: { contains: query.q, mode: 'insensitive' } },
      { customerName: { contains: query.q, mode: 'insensitive' } },
      { customerPhone: { contains: query.q } },
      { garage: { name: { contains: query.q, mode: 'insensitive' } } },
    ];
  }
  return where;
}

function onlineWhere(vendorId, query) {
  const where = { ...onlineBase(vendorId), createdAt: istRange(query) };
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { orderNumber: { contains: query.q, mode: 'insensitive' } },
      { customer: { name: { contains: query.q, mode: 'insensitive' } } },
      { customer: { phone: { contains: query.q } } },
      { upiRef: { contains: query.q } },
    ];
  }
  return where;
}

const walkinInclude = {
  garage: { select: { name: true, phone: true, gstin: true } },
  items: { select: { productName: true, oemNumber: true, hsnCode: true, quantity: true, unitPrice: true, gstRate: true, taxAmount: true, lineTotal: true } },
};
const onlineInclude = {
  customer: { select: { name: true, email: true, phone: true } },
  items: { select: { productName: true, oemNumber: true, quantity: true, unitPrice: true, gstRate: true, lineTotal: true } },
  invoice: { select: { invoiceNumber: true } },
};

export async function listWalkin(vendorId, query) {
  const pg = getPagination(query);
  const where = walkinWhere(vendorId, query);
  const [items, total, sums] = await prisma.$transaction([
    prisma.invoice.findMany({ where, include: walkinInclude, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take }),
    prisma.invoice.count({ where }),
    prisma.invoice.aggregate({ where, _sum: { grandTotal: true } }),
  ]);
  return { items, meta: { ...buildMeta(total, pg), totalAmount: toNum(sums._sum.grandTotal) } };
}

export async function listOnline(vendorId, query) {
  const pg = getPagination(query);
  const where = onlineWhere(vendorId, query);
  const [items, total, sums] = await prisma.$transaction([
    prisma.order.findMany({ where, include: onlineInclude, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take }),
    prisma.order.count({ where }),
    // Net sales: cancelled orders never count, even when listing "all statuses"
    prisma.order.aggregate({ where: { ...where, status: query.status === 'CANCELLED' ? { in: [] } : query.status ?? { notIn: ['AWAITING_PAYMENT', 'CANCELLED'] } }, _sum: { grandTotal: true } }),
  ]);
  return { items, meta: { ...buildMeta(total, pg), totalAmount: toNum(sums._sum.grandTotal) } };
}

// ─────────────── export data (no pagination, capped for safety) ───────────────

const EXPORT_LIMIT = 20000;

export async function walkinForExport(vendorId, query) {
  const where = walkinWhere(vendorId, query);
  const [shop, rows] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: vendorId }, select: { shopName: true, gstin: true, city: true, state: true } }),
    prisma.invoice.findMany({ where, include: walkinInclude, orderBy: { createdAt: 'asc' }, take: EXPORT_LIMIT }),
  ]);
  return { shop, rows, range: istRange(query) };
}

export async function onlineForExport(vendorId, query) {
  const where = onlineWhere(vendorId, query);
  const [shop, rows] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: vendorId }, select: { shopName: true, gstin: true, city: true, state: true } }),
    prisma.order.findMany({ where, include: onlineInclude, orderBy: { createdAt: 'asc' }, take: EXPORT_LIMIT }),
  ]);
  return { shop, rows, range: istRange(query) };
}

export { round2 };