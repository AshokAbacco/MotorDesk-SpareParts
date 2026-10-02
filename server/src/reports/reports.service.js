// server/src/reports/reports.service.js
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { round2, toNum } from '../utils/money.js';

// Shops run on IST regardless of the server's timezone (servers are usually UTC)
const IST_OFFSET_MS = 330 * 60 * 1000;
const toIst = (d) => new Date(d.getTime() + IST_OFFSET_MS);
const fromIst = (d) => new Date(d.getTime() - IST_OFFSET_MS);
const startOfDay = (d = new Date()) => { const x = toIst(d); x.setUTCHours(0, 0, 0, 0); return fromIst(x); };
const startOfMonth = (d = new Date()) => { const x = toIst(d); return fromIst(new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), 1))); };

function range({ from, to }) {
  const f = from ?? startOfMonth();
  // A bare "to" date (YYYY-MM-DD) means "until the end of that IST day"
  const t = to ? new Date(startOfDay(to).getTime() + 24 * 60 * 60 * 1000 - 1) : new Date();
  return { gte: f, lte: t };
}

export async function dashboard(vendorId) {
  const today = startOfDay();
  const month = startOfMonth();
  const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [skuCount, stockAgg, lowStock, outOfStock, todaySales, monthSales, pendingOrders, daily, lowList, recent] =
    await Promise.all([
      prisma.inventory.count({ where: { vendorId } }),
      prisma.inventory.aggregate({ where: { vendorId }, _sum: { stock: true } }),
      prisma.inventory.count({ where: { vendorId, stock: { gt: 0, lte: prisma.inventory.fields.lowStockThreshold } } }),
      prisma.inventory.count({ where: { vendorId, stock: 0 } }),
      prisma.invoice.aggregate({ where: { vendorId, createdAt: { gte: today } }, _sum: { grandTotal: true }, _count: true }),
      prisma.invoice.aggregate({ where: { vendorId, createdAt: { gte: month } }, _sum: { grandTotal: true }, _count: true }),
      prisma.order.count({ where: { vendorId, status: 'PENDING' } }),
      prisma.$queryRaw`
        SELECT to_char(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS day,
               SUM("grandTotal")::float AS total
        FROM "Invoice"
        WHERE "vendorId" = ${vendorId} AND "createdAt" >= ${weekAgo}
        GROUP BY 1 ORDER BY 1`,
      prisma.inventory.findMany({
        where: { vendorId, stock: { lte: prisma.inventory.fields.lowStockThreshold } },
        include: { product: { select: { name: true, oemNumber: true } } },
        orderBy: { stock: 'asc' },
        take: 8,
      }),
      prisma.invoice.findMany({
        where: { vendorId }, orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, invoiceNumber: true, customerName: true, grandTotal: true, paymentMode: true, createdAt: true },
      }),
    ]);

  // Stock value at cost (sum of stock * costPrice)
  const [{ stockValue }] = await prisma.$queryRaw`
    SELECT COALESCE(SUM("stock" * "costPrice"), 0)::float AS "stockValue" FROM "Inventory" WHERE "vendorId" = ${vendorId}`;

  // Fill missing days with 0 so the chart always has 7 bars
  const byDay = new Map(daily.map((r) => [r.day, r.total]));
  const salesLast7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return { day: key, total: round2(byDay.get(key) ?? 0) };
  });

  return {
    totalSkus: skuCount,
    totalStock: stockAgg._sum.stock ?? 0,
    stockValue: round2(stockValue),
    lowStockCount: lowStock,
    outOfStockCount: outOfStock,
    todaySales: toNum(todaySales._sum.grandTotal),
    todayBills: todaySales._count,
    monthSales: toNum(monthSales._sum.grandTotal),
    monthBills: monthSales._count,
    pendingOrders,
    salesLast7Days,
    lowStockItems: lowList,
    recentInvoices: recent,
  };
}

export async function profitAndLoss(vendorId, query) {
  const createdAt = range(query);
  const [sales, items, expenses, byCategory] = await Promise.all([
    prisma.invoice.aggregate({
      where: { vendorId, createdAt },
      _sum: { subtotal: true, cgst: true, sgst: true, igst: true, grandTotal: true, discount: true },
      _count: true,
    }),
    prisma.$queryRaw`
      SELECT COALESCE(SUM(ii."costPrice" * ii."quantity"), 0)::float AS cogs
      FROM "InvoiceItem" ii JOIN "Invoice" i ON i.id = ii."invoiceId"
      WHERE i."vendorId" = ${vendorId} AND i."createdAt" BETWEEN ${createdAt.gte} AND ${createdAt.lte}`,
    prisma.expense.aggregate({ where: { vendorId, date: createdAt }, _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ['category'], where: { vendorId, date: createdAt }, _sum: { amount: true } }),
  ]);

  const revenue = toNum(sales._sum.subtotal); // taxable value (GST is not income)
  const gstCollected = toNum(sales._sum.cgst) + toNum(sales._sum.sgst) + toNum(sales._sum.igst);
  const cogs = items[0].cogs;
  const grossProfit = revenue - cogs;
  const totalExpenses = toNum(expenses._sum.amount);

  return {
    from: createdAt.gte,
    to: createdAt.lte,
    bills: sales._count,
    revenue: round2(revenue),
    discountGiven: toNum(sales._sum.discount),
    gstCollected: round2(gstCollected),
    grossSales: toNum(sales._sum.grandTotal),
    costOfGoodsSold: round2(cogs),
    grossProfit: round2(grossProfit),
    expenses: round2(totalExpenses),
    expensesByCategory: byCategory.map((e) => ({ category: e.category, amount: toNum(e._sum.amount) })),
    netProfit: round2(grossProfit - totalExpenses),
  };
}

export async function gstSummary(vendorId, query) {
  const createdAt = range(query);
  const [totals, byRate] = await Promise.all([
    prisma.invoice.aggregate({ where: { vendorId, createdAt }, _sum: { subtotal: true, cgst: true, sgst: true, igst: true }, _count: true }),
    prisma.$queryRaw`
      SELECT ii."gstRate"::float AS rate,
             SUM(ii."lineTotal" - ii."taxAmount")::float AS taxable,
             SUM(ii."taxAmount")::float AS tax
      FROM "InvoiceItem" ii JOIN "Invoice" i ON i.id = ii."invoiceId"
      WHERE i."vendorId" = ${vendorId} AND i."createdAt" BETWEEN ${createdAt.gte} AND ${createdAt.lte}
      GROUP BY ii."gstRate" ORDER BY ii."gstRate"`,
  ]);
  return {
    from: createdAt.gte,
    to: createdAt.lte,
    invoices: totals._count,
    taxableValue: toNum(totals._sum.subtotal),
    cgst: toNum(totals._sum.cgst),
    sgst: toNum(totals._sum.sgst),
    igst: toNum(totals._sum.igst),
    totalTax: round2(toNum(totals._sum.cgst) + toNum(totals._sum.sgst) + toNum(totals._sum.igst)),
    byRate: byRate.map((r) => ({ rate: r.rate, taxable: round2(r.taxable), tax: round2(r.tax) })),
  };
}

export const listExpenses = (vendorId, query) =>
  prisma.expense.findMany({ where: { vendorId, date: range(query) }, orderBy: { date: 'desc' } });

export const addExpense = (vendorId, data) => prisma.expense.create({ data: { ...data, vendorId } });

export async function deleteExpense(vendorId, id) {
  const e = await prisma.expense.findFirst({ where: { id, vendorId } });
  if (!e) throw ApiError.notFound('Expense not found');
  return prisma.expense.delete({ where: { id } });
}