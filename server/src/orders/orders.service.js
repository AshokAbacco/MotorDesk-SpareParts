// server/src/orders/orders.service.js
import { ORDER_TRANSITIONS } from '../constants/orderStatus.js';
import { prisma } from '../config/prisma.js';
import { createFromOrder } from '../invoices/invoices.service.js';
import { attachCrmMatch } from '../garages/crmCustomerMatch.js';
import { notifyOrder, notifyOrders } from '../notifications/notifications.service.js';
import { createPayment, ensureRazorpay, refundOrder } from '../payments/payments.service.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { calculateGst } from '../utils/gst.js';
import { round2 } from '../utils/money.js';
import { buildUpiLink } from '../utils/upi.js';
import { nextOrderNumber } from '../utils/invoiceNumber.js';
import { buildMeta, getPagination } from '../utils/pagination.js';

const include = {
  items: true,
  vendor: { select: { id: true, shopName: true, city: true, phone: true } },
  customer: { select: { id: true, name: true, email: true, phone: true } },
  invoice: { select: { id: true, invoiceNumber: true } },
};

/**
 * Customer checkout. A cart can contain parts from several shops,
 * so it is split into one order per vendor — all created atomically.
 *
 * Fulfilment (per shop settings): DELIVERY to shippingAddress, or PICKUP from the shop.
 *   A shop with delivery switched off only accepts PICKUP. DELIVERY orders add the
 *   shop's flat delivery charge. COD on a PICKUP order = "pay at the shop" and is always
 *   allowed; COD on a DELIVERY order needs the shop's COD switch on.
 *
 * COD    → orders go straight to PENDING for the shops.
 * UPI    → orders are AWAITING_PAYMENT (stock reserved, hidden from shops). The customer pays each
 *          shop's own UPI ID, submits the UTR, and the shop confirms the money arrived.
 * ONLINE → orders are AWAITING_PAYMENT (stock reserved, hidden from shops) and a single
 *          Razorpay order covers all of them. They become PENDING once payment is verified.
 */
export async function create(user, { items, shippingAddress, paymentMode, fulfilment = 'DELIVERY' }, { source = null } = {}) {
  const pickup = fulfilment === 'PICKUP';
  const online = paymentMode === 'ONLINE';
  const upi = paymentMode === 'UPI';
  if (online) ensureRazorpay();
  const customerId = user.id;

  const created = await prisma.$transaction(async (tx) => {
    const rows = await tx.inventory.findMany({
      where: { id: { in: items.map((i) => i.inventoryId) }, isListed: true, product: { isActive: true }, vendor: { status: 'APPROVED' } },
      include: { product: true, vendor: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));

    const groups = new Map(); // vendorId -> lines
    for (const i of items) {
      const inv = byId.get(i.inventoryId);
      if (!inv) throw ApiError.badRequest('One of the items is no longer available');
      if (inv.stock < i.quantity) throw ApiError.badRequest(`Only ${inv.stock} left of ${inv.product.name}`);
      if (upi && !inv.vendor.upiId) {
        throw ApiError.badRequest(`${inv.vendor.shopName} does not accept UPI yet — choose ${pickup ? 'Pay at shop' : 'Cash on delivery'} for this order`);
      }
      if (!pickup && !inv.vendor.deliveryEnabled) {
        throw ApiError.badRequest(`${inv.vendor.shopName} does not deliver — choose Pick up from shop for this order`);
      }
      if (!pickup && paymentMode === 'COD' && !inv.vendor.codEnabled) {
        throw ApiError.badRequest(`${inv.vendor.shopName} does not accept Cash on delivery — pay by UPI or choose Pick up from shop`);
      }
      if (!groups.has(inv.vendorId)) groups.set(inv.vendorId, { vendor: inv.vendor, lines: [] });
      groups.get(inv.vendorId).lines.push({
        inventoryId: inv.id, productName: inv.product.name, oemNumber: inv.product.oemNumber,
        quantity: i.quantity, unitPrice: Number(inv.price), gstRate: Number(inv.product.gstRate),
      });
    }

    const orders = [];
    for (const [vendorId, { vendor, lines }] of groups) {
      for (const l of lines) {
        const r = await tx.inventory.updateMany({
          where: { id: l.inventoryId, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity } },
        });
        if (r.count === 0) throw ApiError.conflict(`${l.productName} just went out of stock`);
      }

      // Pickup = bought at the shop → intra-state GST. Address keeps the same shape for existing screens.
      const address = pickup
        ? { ...shippingAddress, pickup: true, line1: `Pick up at ${vendor.shopName}`, city: vendor.city ?? '', state: vendor.state, pincode: vendor.pincode ?? '' }
        : shippingAddress;
      const gst = calculateGst(lines, { sellerState: vendor.state, buyerState: address.state });
      const deliveryCharge = pickup ? 0 : round2(Number(vendor.deliveryCharge ?? 0));
      const order = await tx.order.create({
        data: {
          orderNumber: await nextOrderNumber(tx, vendorId),
          customerId,
          vendorId,
          paymentMode,
          fulfilment,
          deliveryCharge,
          source,
          status: online || upi ? 'AWAITING_PAYMENT' : 'PENDING',
          subtotal: gst.subtotal,
          taxTotal: gst.taxTotal,
          grandTotal: round2(gst.grandTotal + deliveryCharge),
          shippingAddress: address,
          statusHistory: online || upi ? [] : [{ status: 'PENDING', at: new Date().toISOString() }],
          items: {
            create: gst.lines.map((l) => ({
              inventoryId: l.inventoryId, productName: l.productName, oemNumber: l.oemNumber, quantity: l.quantity,
              unitPrice: l.unitPrice, gstRate: l.gstRate, lineTotal: l.lineTotal,
            })),
          },
        },
        include: { items: true }, // full details are loaded after the transaction (keeps it short)
      });
      orders.push(order);
    }
    return orders;
  });

  // Shop / customer / invoice details for the response — read outside the transaction
  const full = await prisma.order.findMany({ where: { id: { in: created.map((o) => o.id) } }, include });
  const orders = created.map((o) => full.find((f) => f.id === o.id) ?? o);

  // ONLINE checkouts are announced once Razorpay confirms the payment (payments.service → markPaid)
  if (!online) {
    await notifyOrders(orders.map((o) => o.id), upi ? 'PLACED_AWAITING_UPI' : 'PLACED');
    return { orders, payment: null };
  }

  const total = orders.reduce((n, o) => n + Number(o.grandTotal), 0);
  try {
    const payment = await createPayment({
      user,
      amountRupees: total,
      purpose: 'MARKETPLACE_ORDER',
      receipt: orders[0].orderNumber,
      description: orders.length > 1 ? `${orders.length} orders from ${orders.length} shops` : `Order ${orders[0].orderNumber}`,
      orderIds: orders.map((o) => o.id),
    });
    return { orders, payment };
  } catch (err) {
    // Could not open a Razorpay order → give the reserved stock back
    await prisma.$transaction(async (tx) => {
      for (const o of orders) for (const i of o.items) {
        await tx.inventory.update({ where: { id: i.inventoryId }, data: { stock: { increment: i.quantity } } });
      }
      await tx.order.deleteMany({ where: { id: { in: orders.map((o) => o.id) } } });
    });
    throw err;
  }
}


// Customer "My orders" also shows each part's HSN code (from the product), so items carry hsnCode
const customerInclude = {
  ...include,
  items: { include: { inventory: { select: { product: { select: { hsnCode: true } } } } } },
};
const withHsn = (order) => ({
  ...order,
  items: order.items.map(({ inventory, ...item }) => ({ ...item, hsnCode: inventory?.product?.hsnCode ?? null })),
});

async function listWhere(where, query, { showAwaiting = false, forCustomer = false } = {}) {
  const pg = getPagination(query);
  // Unpaid checkouts are hidden from shops; customers see them so they can finish paying
  where.status = query.status ?? (showAwaiting ? undefined : { not: 'AWAITING_PAYMENT' });
  if (query.q) {
    where.OR = [
      { orderNumber: { contains: query.q, mode: 'insensitive' } },
      { customer: { name: { contains: query.q, mode: 'insensitive' } } },
    ];
  }
  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({ where, include: forCustomer ? customerInclude : include, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take }),
    prisma.order.count({ where }),
  ]);
  return { items: forCustomer ? items.map(withHsn) : items, meta: buildMeta(total, pg) };
}

export const listForCustomer = (customerId, query) => listWhere({ customerId }, query, { showAwaiting: true, forCustomer: true });
// Shops also see whether the customer is a MotorDesk Garage CRM garage (matched by phone & email)
export async function listForVendor(vendorId, query) {
  const { items, meta } = await listWhere({ vendorId }, query);
  return { items: await attachCrmMatch(items), meta };
}

export async function getById(id, { customerId, vendorId }) {
  const order = await prisma.order.findFirst({
    where: { id, ...(vendorId && { status: { not: 'AWAITING_PAYMENT' } }), ...(customerId && { customerId }), ...(vendorId && { vendorId }) },
    include,
  });
  if (!order) throw ApiError.notFound('Order not found');
  return vendorId ? attachCrmMatch(order) : order;
}

async function restoreStock(tx, order) {
  for (const i of order.items) {
    await tx.inventory.update({ where: { id: i.inventoryId }, data: { stock: { increment: i.quantity } } });
  }
}

/** Vendor moves the order forward: PENDING → ACCEPTED → PACKED → SHIPPED → DELIVERED */
export async function updateStatus(vendorId, id, status) {
  // Refund prepaid orders with Razorpay first; if that fails the order stays as it was
  let refunded = false;
  if (status === 'CANCELLED') {
    const current = await prisma.order.findFirst({ where: { id, vendorId } });
    if (!current) throw ApiError.notFound('Order not found');
    if (!ORDER_TRANSITIONS[current.status].includes('CANCELLED')) {
      throw ApiError.badRequest(`Cannot change order from ${current.status} to CANCELLED`);
    }
    refunded = await refundOrder(current);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id, vendorId }, include: { items: true } });
    if (!order) throw ApiError.notFound('Order not found');
    if (!ORDER_TRANSITIONS[order.status].includes(status)) {
      throw ApiError.badRequest(`Cannot change order from ${order.status} to ${status}`);
    }
    // Pickup orders skip "shipped": PACKED (ready for pickup) → DELIVERED (picked up)
    if (order.fulfilment === 'PICKUP' && status === 'SHIPPED') {
      throw ApiError.badRequest('Pickup orders are not shipped — mark it Picked up when the customer collects it');
    }
    if (order.fulfilment !== 'PICKUP' && order.status === 'PACKED' && status === 'DELIVERED') {
      throw ApiError.badRequest('Mark the order Shipped before Delivered');
    }
    if (status === 'ACCEPTED' && order.paymentMode === 'UPI' && order.paymentStatus !== 'PAID') {
      throw ApiError.badRequest('Confirm that the UPI payment reached your account before accepting this order');
    }

    if (status === 'CANCELLED') await restoreStock(tx, order);
    if (status === 'DELIVERED') await createFromOrder(tx, order);

    await tx.order.update({
      where: { id },
      data: {
        status,
        statusHistory: [...order.statusHistory, { status, at: new Date().toISOString() }],
        ...(status === 'DELIVERED' && order.paymentMode === 'COD' && { paymentStatus: 'PAID' }),
        ...(refunded && { paymentStatus: 'REFUNDED' }),
      },
    });
    return tx.order.findUnique({ where: { id }, include });
  });
  await notifyOrder(id, status === 'CANCELLED' ? 'CANCELLED_BY_SHOP' : status);
  return updated;
}

/** Customer can cancel only before the shop accepts */
export async function cancelByCustomer(customerId, id) {
  const current = await prisma.order.findFirst({ where: { id, customerId } });
  if (!current) throw ApiError.notFound('Order not found');
  const unpaidUpi = current.status === 'AWAITING_PAYMENT' && current.paymentMode === 'UPI';
  if (current.status !== 'PENDING' && !unpaidUpi) throw ApiError.badRequest('Order already accepted by the shop and cannot be cancelled');
  if (current.paymentMode === 'UPI' && current.paymentStatus === 'PAID') {
    throw ApiError.badRequest('The shop has already received your UPI payment. Please contact the shop to cancel and get a refund.');
  }
  const refunded = await refundOrder(current);

  const cancelled = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id, customerId }, include: { items: true } });
    if (!order) throw ApiError.notFound('Order not found');
    if (order.status !== 'PENDING' && order.status !== 'AWAITING_PAYMENT') throw ApiError.badRequest('Order already accepted by the shop and cannot be cancelled');
    await restoreStock(tx, order);
    return tx.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        statusHistory: [...order.statusHistory, { status: 'CANCELLED', at: new Date().toISOString(), by: 'CUSTOMER' }],
        ...(refunded && { paymentStatus: 'REFUNDED' }),
      },
      include,
    });
  });
  // The shop is only told if it could see the order (unpaid UPI checkouts are hidden from shops)
  await notifyOrder(id, 'CANCELLED_BY_CUSTOMER', { shopSawIt: current.status === 'PENDING' });
  return cancelled;
}

// ─────────────── Direct UPI payments (customer → shop's own UPI ID) ───────────────

const holdMs = () => env.PAYMENT_HOLD_MINUTES * 60 * 1000;

/** Everything the customer needs to pay one shop: UPI ID, amount, link for UPI apps (and the QR) */
export async function getUpiDetails(customerId, id) {
  const order = await prisma.order.findFirst({
    where: { id, customerId, paymentMode: 'UPI' },
    include: { vendor: { select: { shopName: true, upiId: true, upiName: true, upiNumber: true } } },
  });
  if (!order) throw ApiError.notFound('Order not found');
  if (!order.vendor.upiId) throw ApiError.badRequest('This shop has removed its UPI details. Please cancel and choose Cash on delivery.');

  const amount = Number(order.grandTotal);
  const note = `MotorDesk ${order.orderNumber}`;
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    upiRef: order.upiRef,
    amount,
    shopName: order.vendor.shopName,
    upiId: order.vendor.upiId,
    payeeName: order.vendor.upiName || order.vendor.shopName,
    upiNumber: order.vendor.upiNumber,
    note,
    upiLink: buildUpiLink({ vpa: order.vendor.upiId, name: order.vendor.upiName || order.vendor.shopName, amount, note }),
    payBy: order.status === 'AWAITING_PAYMENT' ? new Date(order.createdAt.getTime() + holdMs()) : null,
  };
}

/** Customer says "I've paid" and gives the UTR so the shop can match it in its bank/UPI app */
export async function submitUpiRef(customerId, id, utr) {
  const order = await prisma.order.findFirst({ where: { id, customerId, paymentMode: 'UPI' } });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.paymentStatus !== 'PENDING' || !['AWAITING_PAYMENT', 'PENDING'].includes(order.status)) {
    throw ApiError.badRequest('This order is not waiting for payment');
  }
  const dup = await prisma.order.findFirst({ where: { upiRef: utr, id: { not: id }, vendorId: order.vendorId } });
  if (dup) throw ApiError.conflict('This UPI reference number was already used for another order');

  const first = order.status === 'AWAITING_PAYMENT';
  const updated = await prisma.order.update({
    where: { id },
    data: {
      upiRef: utr,
      upiSubmittedAt: new Date(),
      status: 'PENDING', // now visible to the shop
      ...(first && { statusHistory: [...order.statusHistory, { status: 'PENDING', at: new Date().toISOString(), note: `UPI paid, ref ${utr}` }] }),
    },
    include,
  });
  await notifyOrder(id, 'UPI_SUBMITTED');
  return updated;
}

/** Shop checks its UPI/bank app and confirms (or rejects) the payment */
export async function verifyUpiPayment(vendorId, id, action) {
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id, vendorId, paymentMode: 'UPI' }, include: { items: true } });
    if (!order) throw ApiError.notFound('Order not found');
    if (order.paymentStatus !== 'PENDING' || order.status !== 'PENDING') throw ApiError.badRequest('This payment was already handled');
    const at = new Date().toISOString();

    if (action === 'CONFIRM') {
      await tx.order.update({
        where: { id },
        data: { paymentStatus: 'PAID', paymentVerifiedAt: new Date(), statusHistory: [...order.statusHistory, { status: 'PENDING', at, note: 'UPI payment confirmed by shop' }] },
      });
    } else {
      await restoreStock(tx, order);
      await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED', paymentStatus: 'FAILED', statusHistory: [...order.statusHistory, { status: 'CANCELLED', at, note: 'UPI payment not received' }] },
      });
    }
    return tx.order.findUnique({ where: { id }, include });
  });
  await notifyOrder(id, action === 'CONFIRM' ? 'UPI_CONFIRMED' : 'UPI_REJECTED');
  return updated;
}

/** Background sweep: cancel UPI orders the customer never paid, and release their stock */
export async function releaseExpiredUpi() {
  const stale = await prisma.order.findMany({
    where: { paymentMode: 'UPI', status: 'AWAITING_PAYMENT', createdAt: { lt: new Date(Date.now() - holdMs()) } },
    include: { items: true },
  });
  for (const order of stale) {
    const released = await prisma.$transaction(async (tx) => {
      const r = await tx.order.updateMany({
        where: { id: order.id, status: 'AWAITING_PAYMENT' },
        data: { status: 'CANCELLED', paymentStatus: 'FAILED', statusHistory: [{ status: 'CANCELLED', at: new Date().toISOString(), note: 'Not paid in time' }] },
      });
      if (r.count) await restoreStock(tx, order);
      return r.count > 0;
    });
    if (released) await notifyOrder(order.id, 'UPI_EXPIRED');
  }
  return stale.length;
}