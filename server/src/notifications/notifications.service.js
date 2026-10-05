// server/src/notifications/notifications.service.js
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

// ─────────────── Reading (bell icon) ───────────────

/**
 * Newest first. Older pages are loaded with `before` (createdAt of the last one shown), so deleting
 * notifications in the panel never makes the next page skip or repeat any.
 */
export async function list(userId, { limit = 15, before, unread } = {}) {
  const where = { userId, ...(unread && { readAt: null }) };
  const [rows, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { ...where, ...(before && { createdAt: { lt: before } }) },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items: rows.slice(0, limit), meta: { limit, total, unread: unreadCount, hasMore: rows.length > limit } };
}

/** Small and cheap — the header polls this. `latest` lets the client pop a toast for a brand-new one. */
export async function unreadSummary(userId) {
  const [count, latest] = await prisma.$transaction([
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.notification.findFirst({ where: { userId, readAt: null }, orderBy: { createdAt: 'desc' } }),
  ]);
  return { count, latest };
}

export async function markRead(userId, id) {
  const r = await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
  if (!r.count && !(await prisma.notification.findFirst({ where: { id, userId }, select: { id: true } }))) {
    throw ApiError.notFound('Notification not found');
  }
  return { id };
}

export async function markAllRead(userId) {
  const r = await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  return { updated: r.count };
}

const unreadOf = (userId) => prisma.notification.count({ where: { userId, readAt: null } });

/** Delete one notification (only the owner's). Returns the new unread count for the bell. */
export async function remove(userId, id) {
  const r = await prisma.notification.deleteMany({ where: { id, userId } });
  if (!r.count) throw ApiError.notFound('Notification not found');
  return { id, unread: await unreadOf(userId) };
}

/** "Clear all" — deletes every notification of this user */
export async function clearAll(userId) {
  const r = await prisma.notification.deleteMany({ where: { userId } });
  return { deleted: r.count, unread: 0 };
}

/** Keeps the table small: read notifications older than 90 days are removed (runs with the background sweep) */
export const purgeOld = () =>
  prisma.notification.deleteMany({ where: { readAt: { not: null }, createdAt: { lt: new Date(Date.now() - 90 * 864e5) } } });

// ─────────────── Sending (order activity) ───────────────

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const vendorLink = (o) => `/vendor/orders?order=${o.id}`;
const customerLink = (o) => `/my-orders?order=${o.id}`;
/**
 * The order is named by its part(s), not the order number:
 * "Rear Brake Shoe Set, HSN 87083000" · "Air Filter + 2 more, HSN 84212300, 87083000"
 */
const partText = (o) => {
  const [first, ...rest] = o.items;
  if (!first) return 'Your order';
  const name = `${first.productName}${rest.length ? ` + ${rest.length} more` : ''}`;
  const hsn = [...new Set(o.items.map((i) => i.inventory?.product?.hsnCode).filter(Boolean))].join(', ');
  return hsn ? `${name}, HSN ${hsn}` : name;
};
const qtyText = (o) => {
  const n = o.items.reduce((sum, i) => sum + i.quantity, 0);
  return `Qty ${n}`;
};

/**
 * What each order event says, and to whom.
 * Each entry returns { customer?, vendor? } messages — `null` / missing means that side isn't told.
 * A shop is not notified about changes it made itself (it just did them); the customer is.
 */
const EVENTS = {
  // Customer checked out (COD → goes straight to the shop)
  PLACED: (o) => ({
    customer: { type: 'ORDER_PLACED', title: 'Order placed successfully', body: `${partText(o)} from ${o.vendor.shopName} · ${rupees(o.grandTotal)}. We'll let you know when the shop accepts it.` },
    vendor: { type: 'ORDER_NEW', title: 'New order received', body: `${partText(o)} · ${qtyText(o)} from ${o.customer.name} · ${rupees(o.grandTotal)} (Cash on delivery)` },
  }),
  // UPI checkout created — the shop sees it only after the customer pays
  PLACED_AWAITING_UPI: (o) => ({
    customer: { type: 'PAYMENT_DUE', title: 'Order placed — complete your UPI payment', body: `Pay ${rupees(o.grandTotal)} to ${o.vendor.shopName} for ${partText(o)}. Unpaid orders are released after a short while.` },
  }),
  // Customer submitted the UPI reference → now visible to the shop
  UPI_SUBMITTED: (o) => ({
    customer: { type: 'PAYMENT_SUBMITTED', title: 'Payment submitted', body: `${o.vendor.shopName} will confirm your UPI payment of ${rupees(o.grandTotal)} for ${partText(o)}.` },
    vendor: { type: 'ORDER_NEW', title: 'New order — check UPI payment', body: `${partText(o)} · ${qtyText(o)} from ${o.customer.name} · ${rupees(o.grandTotal)}. Paid by UPI (ref ${o.upiRef}) — confirm it reached your account.` },
  }),
  // Razorpay payment verified
  PAID_ONLINE: (o) => ({
    customer: { type: 'PAYMENT_RECEIVED', title: 'Payment successful — order placed', body: `${rupees(o.grandTotal)} paid for ${partText(o)} from ${o.vendor.shopName}.` },
    vendor: { type: 'ORDER_NEW', title: 'New order received · paid online', body: `${partText(o)} · ${qtyText(o)} from ${o.customer.name} · ${rupees(o.grandTotal)} — payment completed.` },
  }),
  UPI_CONFIRMED: (o) => ({
    customer: { type: 'PAYMENT_RECEIVED', title: 'Payment confirmed', body: `${o.vendor.shopName} received your UPI payment of ${rupees(o.grandTotal)} for ${partText(o)}.` },
  }),
  UPI_REJECTED: (o) => ({
    customer: { type: 'ORDER_CANCELLED', title: 'Order cancelled — payment not received', body: `${o.vendor.shopName} could not find your UPI payment for ${partText(o)}. If money was deducted, contact the shop with ref ${o.upiRef ?? ''}.`.trim() },
  }),
  UPI_EXPIRED: (o) => ({
    customer: { type: 'ORDER_CANCELLED', title: 'Order cancelled — not paid in time', body: `${partText(o)} from ${o.vendor.shopName} was released because the UPI payment wasn't completed.` },
  }),

  // Shop moved the order forward
  ACCEPTED: (o) => ({
    customer: { type: 'ORDER_ACCEPTED', title: 'Your order has been accepted', body: `${partText(o)} — ${o.vendor.shopName} accepted your order and is preparing it.` },
  }),
  PACKED: (o) => ({
    customer: { type: 'ORDER_PACKED', title: 'Your order is packed and ready', body: `${partText(o)} is packed by ${o.vendor.shopName} and will be sent out soon.` },
  }),
  SHIPPED: (o) => ({
    customer: { type: 'ORDER_SHIPPED', title: 'Your order is on the way', body: `${partText(o)} has been shipped by ${o.vendor.shopName} and is out for delivery.` },
  }),
  DELIVERED: (o) => ({
    customer: {
      type: 'ORDER_DELIVERED', title: 'Order delivered',
      body: `${partText(o)} was delivered${o.paymentMode === 'COD' ? ` · ${rupees(o.grandTotal)} paid` : ''}. Your GST invoice from ${o.vendor.shopName} is ready.`,
    },
  }),
  CANCELLED_BY_SHOP: (o) => ({
    customer: {
      type: 'ORDER_CANCELLED', title: 'Shop cancelled your order',
      body: `${o.vendor.shopName} cancelled your order for ${partText(o)}.${o.paymentStatus === 'REFUNDED' ? ` A refund of ${rupees(o.grandTotal)} has been started.` : ''}`,
    },
  }),

  // Customer cancelled
  CANCELLED_BY_CUSTOMER: (o, { shopSawIt }) => ({
    customer: {
      type: 'ORDER_CANCELLED', title: 'Order cancelled',
      body: `You cancelled ${partText(o)} from ${o.vendor.shopName}.${o.paymentStatus === 'REFUNDED' ? ` A refund of ${rupees(o.grandTotal)} has been started.` : ''}`,
    },
    vendor: shopSawIt
      ? { type: 'ORDER_CANCELLED', title: 'Customer cancelled the order', body: `${o.customer.name} cancelled ${partText(o)} · ${qtyText(o)} (${rupees(o.grandTotal)}). The stock has been added back.` }
      : null,
  }),
};

const orderForNotice = {
  items: { select: { productName: true, quantity: true, inventory: { select: { product: { select: { hsnCode: true } } } } } },
  vendor: { select: { shopName: true, userId: true } },
  customer: { select: { id: true, name: true } },
};

/**
 * Sends the notifications for one order event. Call it AFTER the order change is saved.
 * Never throws — a failed notification must not fail the order action itself.
 */
export async function notifyOrder(orderId, event, extra = {}) {
  try {
    const o = await prisma.order.findUnique({ where: { id: orderId }, include: orderForNotice });
    const build = EVENTS[event];
    if (!o || !build) return;
    const { customer, vendor } = build(o, extra);
    const rows = [];
    if (customer) rows.push({ ...customer, userId: o.customer.id, orderId: o.id, link: customerLink(o) });
    if (vendor) rows.push({ ...vendor, userId: o.vendor.userId, orderId: o.id, link: vendorLink(o) });
    if (rows.length) await prisma.notification.createMany({ data: rows });
  } catch (err) {
    console.error(`Notification "${event}" for order ${orderId} failed:`, err.message);
  }
}

/** Same event for several orders (one checkout can create one order per shop) */
export const notifyOrders = (orderIds, event, extra) => Promise.all(orderIds.map((id) => notifyOrder(id, event, extra)));