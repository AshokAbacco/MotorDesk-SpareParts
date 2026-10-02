// server/src/pos/pos.service.js
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateGst } from '../utils/gst.js';
import { nextInvoiceNumber } from '../utils/invoiceNumber.js';

/** Loads the vendor's inventory rows for the cart and builds GST lines */
async function buildLines(db, vendorId, items) {
  const ids = [...new Set(items.map((i) => i.inventoryId))];
  if (ids.length !== items.length) throw ApiError.badRequest('Duplicate items in cart — combine quantities instead');

  const rows = await db.inventory.findMany({ where: { id: { in: ids }, vendorId }, include: { product: true } });
  const byId = new Map(rows.map((r) => [r.id, r]));

  return items.map((i) => {
    const inv = byId.get(i.inventoryId);
    if (!inv) throw ApiError.badRequest('An item in the cart is not in your inventory');
    if (inv.stock < i.quantity) throw ApiError.badRequest(`Only ${inv.stock} left of ${inv.product.name}`);
    const unitPrice = i.unitPrice ?? Number(inv.price);
    if (unitPrice > Number(inv.mrp)) throw ApiError.badRequest(`Price of ${inv.product.name} cannot exceed MRP`);
    return {
      inventoryId: inv.id,
      productName: inv.product.name,
      oemNumber: inv.product.oemNumber,
      hsnCode: inv.product.hsnCode,
      quantity: i.quantity,
      unitPrice,
      costPrice: Number(inv.costPrice),
      gstRate: Number(inv.product.gstRate),
    };
  });
}

async function resolveBuyerState(db, vendorId, { garageId, customerState }) {
  if (!garageId) return { garage: null, buyerState: customerState };
  const garage = await db.garage.findFirst({ where: { id: garageId, vendorId } });
  if (!garage) throw ApiError.notFound('Garage not found');
  return { garage, buyerState: garage.state || customerState };
}

/** Preview totals without saving (used by the POS cart panel) */
export async function quote(vendor, body) {
  const lines = await buildLines(prisma, vendor.id, body.items);
  const { buyerState } = await resolveBuyerState(prisma, vendor.id, body);
  return calculateGst(lines, { sellerState: vendor.state, buyerState, discount: body.discount });
}

/** Completes a counter sale: deducts stock and creates the GST invoice — all atomic */
export async function checkout(vendor, body) {
  return prisma.$transaction(async (tx) => {
    const lines = await buildLines(tx, vendor.id, body.items);
    const { garage, buyerState } = await resolveBuyerState(tx, vendor.id, body);
    const gst = calculateGst(lines, { sellerState: vendor.state, buyerState, discount: body.discount });

    // Deduct stock with a guard so two counters can't oversell the same part
    for (const l of lines) {
      const r = await tx.inventory.updateMany({
        where: { id: l.inventoryId, vendorId: vendor.id, stock: { gte: l.quantity } },
        data: { stock: { decrement: l.quantity } },
      });
      if (r.count === 0) throw ApiError.conflict(`${l.productName} just went out of stock`);
    }

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber: await nextInvoiceNumber(tx, vendor.id),
        vendorId: vendor.id,
        garageId: garage?.id,
        customerName: garage?.name ?? body.customerName,
        customerPhone: garage?.phone ?? (body.customerPhone || null),
        customerGstin: garage?.gstin ?? (body.customerGstin || null),
        placeOfSupply: buyerState || vendor.state,
        paymentMode: body.paymentMode,
        subtotal: gst.subtotal,
        discount: gst.discount,
        cgst: gst.cgst,
        sgst: gst.sgst,
        igst: gst.igst,
        grandTotal: gst.grandTotal,
        items: {
          create: gst.lines.map((l) => ({
            inventoryId: l.inventoryId, productName: l.productName, oemNumber: l.oemNumber, hsnCode: l.hsnCode,
            quantity: l.quantity, unitPrice: l.unitPrice, costPrice: l.costPrice, gstRate: l.gstRate, taxAmount: l.taxAmount, lineTotal: l.lineTotal,
          })),
        },
      },
      include: { items: true, garage: true },
    });

    return invoice;
  });
}