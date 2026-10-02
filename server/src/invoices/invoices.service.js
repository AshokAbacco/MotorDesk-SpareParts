import { prisma } from '../config/prisma.js';
import { uploadBuffer } from '../uploads/uploads.service.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateGst } from '../utils/gst.js';
import { nextInvoiceNumber } from '../utils/invoiceNumber.js';
import { buildMeta, getPagination } from '../utils/pagination.js';
import { buildInvoicePdf } from './invoices.pdf.js';

const fullInclude = { items: true, garage: true, vendor: true, order: { select: { orderNumber: true } } };

export async function list(vendorId, query) {
  const pg = getPagination(query);
  const where = { vendorId };
  if (query.q) {
    where.OR = [
      { invoiceNumber: { contains: query.q, mode: 'insensitive' } },
      { customerName: { contains: query.q, mode: 'insensitive' } },
      { customerPhone: { contains: query.q } },
      { garage: { name: { contains: query.q, mode: 'insensitive' } } },
    ];
  }
  if (query.paymentMode) where.paymentMode = query.paymentMode;
  if (query.from || query.to) where.createdAt = { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined };

  const [items, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take,
      include: { garage: { select: { name: true } }, _count: { select: { items: true } } },
    }),
    prisma.invoice.count({ where }),
  ]);
  return { items, meta: buildMeta(total, pg) };
}

export async function getById(vendorId, id) {
  const invoice = await prisma.invoice.findFirst({ where: { id, vendorId }, include: fullInclude });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return invoice;
}

export async function pdfBuffer(vendorId, id) {
  const invoice = await getById(vendorId, id);
  return { invoice, buffer: await buildInvoicePdf(invoice) };
}

/** Uploads the PDF to R2 (for WhatsApp/email sharing) and stores the URL */
export async function publishPdf(vendorId, id) {
  const { invoice, buffer } = await pdfBuffer(vendorId, id);
  const { url } = await uploadBuffer({
    buffer, mimetype: 'application/pdf', folder: `invoices/${vendorId}`, fileName: `${invoice.invoiceNumber}.pdf`,
  });
  return prisma.invoice.update({ where: { id }, data: { pdfUrl: url }, select: { id: true, pdfUrl: true } });
}

/** Creates an invoice for a delivered marketplace order (called inside the order transaction) */
export async function createFromOrder(tx, order) {
  const vendor = await tx.vendor.findUnique({ where: { id: order.vendorId } });
  const inv = await tx.inventory.findMany({
    where: { id: { in: order.items.map((i) => i.inventoryId) } },
    select: { id: true, costPrice: true, product: { select: { hsnCode: true } } },
  });
  const invMap = new Map(inv.map((r) => [r.id, r]));
  const lines = order.items.map((i) => ({
    inventoryId: i.inventoryId, productName: i.productName, oemNumber: i.oemNumber,
    hsnCode: invMap.get(i.inventoryId)?.product.hsnCode ?? null,
    costPrice: Number(invMap.get(i.inventoryId)?.costPrice ?? 0),
    quantity: i.quantity, unitPrice: Number(i.unitPrice), gstRate: Number(i.gstRate),
  }));
  const buyerState = order.shippingAddress?.state;
  const gst = calculateGst(lines, { sellerState: vendor.state, buyerState });

  return tx.invoice.create({
    data: {
      invoiceNumber: await nextInvoiceNumber(tx, vendor.id),
      vendorId: vendor.id,
      orderId: order.id,
      customerName: order.shippingAddress?.name,
      customerPhone: order.shippingAddress?.phone,
      placeOfSupply: buyerState ?? vendor.state,
      paymentMode: order.paymentMode,
      subtotal: gst.subtotal, cgst: gst.cgst, sgst: gst.sgst, igst: gst.igst, grandTotal: gst.grandTotal,
      items: {
        create: gst.lines.map((l) => ({
          inventoryId: l.inventoryId, productName: l.productName, oemNumber: l.oemNumber, hsnCode: l.hsnCode,
          quantity: l.quantity, unitPrice: l.unitPrice, costPrice: l.costPrice, gstRate: l.gstRate,
          taxAmount: l.taxAmount, lineTotal: l.lineTotal,
        })),
      },
    },
  });
}
