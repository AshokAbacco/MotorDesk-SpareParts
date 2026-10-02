// server/src/admin/admin.service.js
import { randomUUID } from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/hash.js';
import { toNum } from '../utils/money.js';
import { buildMeta, getPagination } from '../utils/pagination.js';

export async function analytics() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [vendorsByStatus, customers, products, vehicles, orders, gmv, posSales, activeSubs, newVendors, topVendors] = await Promise.all([
    prisma.vendor.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.vehicle.count(),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { grandTotal: true } }),
    prisma.invoice.aggregate({ where: { orderId: null }, _sum: { grandTotal: true }, _count: true }),
    prisma.subscription.findMany({ where: { status: 'ACTIVE', endDate: { gt: new Date() } }, include: { plan: true } }),
    prisma.vendor.count({ where: { createdAt: { gte: since } } }),
    prisma.invoice.groupBy({ by: ['vendorId'], _sum: { grandTotal: true }, orderBy: { _sum: { grandTotal: 'desc' } }, take: 5 }),
  ]);

  const vendorNames = await prisma.vendor.findMany({ where: { id: { in: topVendors.map((t) => t.vendorId) } }, select: { id: true, shopName: true, city: true } });
  const nameMap = new Map(vendorNames.map((v) => [v.id, v]));

  // Monthly recurring revenue: normalise each plan price to 30 days
  const mrr = activeSubs.reduce((s, sub) => s + (toNum(sub.plan.price) / sub.plan.durationDays) * 30, 0);

  return {
    vendors: Object.fromEntries(vendorsByStatus.map((v) => [v.status, v._count._all])),
    newVendorsLast30Days: newVendors,
    customers,
    products,
    vehicles,
    orders: Object.fromEntries(orders.map((o) => [o.status, o._count._all])),
    marketplaceGmv: toNum(gmv._sum.grandTotal),
    posSales: toNum(posSales._sum.grandTotal),
    posBills: posSales._count,
    activeSubscriptions: activeSubs.length,
    mrr: Math.round(mrr),
    topVendors: topVendors.map((t) => ({ ...nameMap.get(t.vendorId), sales: toNum(t._sum.grandTotal) })),
  };
}

export async function listVendors(query) {
  const pg = getPagination(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { shopName: { contains: query.q, mode: 'insensitive' } },
      { city: { contains: query.q, mode: 'insensitive' } },
      { user: { email: { contains: query.q, mode: 'insensitive' } } },
    ];
  }
  const [items, total] = await prisma.$transaction([
    prisma.vendor.findMany({
      where, skip: pg.skip, take: pg.take, orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        subscriptions: { where: { status: 'ACTIVE' }, include: { plan: { select: { name: true } } }, take: 1 },
        _count: { select: { inventory: true, orders: true, invoices: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);
  return { items, meta: buildMeta(total, pg) };
}

export const setVendorStatus = (id, status) =>
  prisma.vendor.update({ where: { id }, data: { status }, include: { user: { select: { name: true, email: true } } } });

// ───────────── Customers ─────────────

const customerSelect = { id: true, name: true, email: true, phone: true, isActive: true, addresses: true, createdAt: true };

/** All customers with order count, total spent (excl. cancelled) and last order date */
export async function listCustomers(query) {
  const pg = getPagination(query);
  const where = { role: 'CUSTOMER' };
  if (query.status) where.isActive = query.status === 'ACTIVE';
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
      { phone: { contains: query.q } },
    ];
  }
  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: customerSelect, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take }),
    prisma.user.count({ where }),
  ]);

  const ids = users.map((u) => u.id);
  const stats = ids.length
    ? await prisma.order.groupBy({
        by: ['customerId'],
        where: { customerId: { in: ids }, status: { not: 'CANCELLED' } },
        _count: { _all: true },
        _sum: { grandTotal: true },
        _max: { createdAt: true },
      })
    : [];
  const byId = new Map(stats.map((s) => [s.customerId, s]));

  const items = users.map(({ addresses, ...u }) => {
    const s = byId.get(u.id);
    const list = Array.isArray(addresses) ? addresses : [];
    const main = list.find((a) => a.isDefault) ?? list[0];
    return {
      ...u,
      city: main ? [main.city, main.state].filter(Boolean).join(', ') : null,
      // for the Edit form
      defaultAddress: main ? { line1: main.line1 ?? '', landmark: main.landmark ?? '', city: main.city ?? '', state: main.state ?? '', pincode: main.pincode ?? '' } : null,
      addressCount: list.length,
      orders: s?._count._all ?? 0,
      totalSpent: toNum(s?._sum.grandTotal ?? 0),
      lastOrderAt: s?._max.createdAt ?? null,
    };
  });
  return { items, meta: buildMeta(total, pg) };
}

/** Admin adds a customer account (they can log in with this email + password) */
export async function createCustomer({ name, email, phone, password, address }) {
  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
    select: { email: true },
  });
  if (exists) throw ApiError.conflict(exists.email === email ? 'This email is already registered' : 'This mobile number is already registered');

  const addresses = address
    ? [{ id: randomUUID(), label: 'Home', name, phone: phone || '', ...address, landmark: address.landmark || undefined, isDefault: true }]
    : [];

  const user = await prisma.user.create({
    data: { name, email, phone: phone || null, password: await hashPassword(password), role: 'CUSTOMER', addresses },
    select: customerSelect,
  });
  return { ...user, orders: 0, totalSpent: 0, lastOrderAt: null };
}

/**
 * Admin edits a customer: name, email, mobile, optional password reset, and the default address.
 * Other saved addresses stay untouched.
 */
export async function updateCustomer(id, { name, email, phone, password, address }) {
  const user = await prisma.user.findFirst({ where: { id, role: 'CUSTOMER' }, select: { id: true, addresses: true } });
  if (!user) throw ApiError.notFound('Customer not found');

  const clash = await prisma.user.findFirst({
    where: { id: { not: id }, OR: [{ email }, ...(phone ? [{ phone }] : [])] },
    select: { email: true },
  });
  if (clash) throw ApiError.conflict(clash.email === email ? 'This email is already registered' : 'This mobile number is already registered');

  const data = { name, email, phone: phone || null };
  if (password) data.password = await hashPassword(password);

  if (address) {
    const list = Array.isArray(user.addresses) ? [...user.addresses] : [];
    const fields = { ...address, landmark: address.landmark || undefined };
    let i = list.findIndex((a) => a.isDefault); // the default address…
    if (i < 0 && list.length) i = 0;            // …or the first one if none is marked
    if (i >= 0) list[i] = { ...list[i], ...fields, isDefault: true };
    else list.push({ id: randomUUID(), label: 'Home', name, phone: phone || '', ...fields, isDefault: true });
    data.addresses = list;
  }

  await prisma.user.update({ where: { id }, data });
  return { id, name, email, phone: phone || null, passwordChanged: Boolean(password) };
}

/**
 * Delete a customer.
 * No orders/payments → removed permanently.
 * Has orders → disabled instead (can't log in), so order history, invoices and shop reports stay correct.
 */
export async function deleteCustomer(id) {
  const user = await prisma.user.findFirst({ where: { id, role: 'CUSTOMER' }, select: { id: true, name: true } });
  if (!user) throw ApiError.notFound('Customer not found');

  const [orders, payments] = await Promise.all([
    prisma.order.count({ where: { customerId: id } }),
    prisma.payment.count({ where: { userId: id } }),
  ]);
  if (orders || payments) {
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    return { deleted: false, disabled: true, orders, message: `${user.name} has ${orders} order${orders === 1 ? '' : 's'}, so the account was disabled instead of deleted (order history is kept).` };
  }
  await prisma.user.delete({ where: { id } });
  return { deleted: true, disabled: false, orders: 0, message: `${user.name} deleted` };
}

/** Enable / disable login for a customer */
export async function setCustomerStatus(id, isActive) {
  const user = await prisma.user.findFirst({ where: { id, role: 'CUSTOMER' }, select: { id: true } });
  if (!user) throw ApiError.notFound('Customer not found');
  return prisma.user.update({ where: { id }, data: { isActive }, select: customerSelect });
}