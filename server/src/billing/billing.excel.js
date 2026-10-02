// server/src/billing/billing.excel.js
import ExcelJS from 'exceljs';
import { fmtIstDate, fmtIstTime } from '../utils/dateRange.js';
import { round2, toNum } from '../utils/money.js';

/*
 * Professional Excel reports for Billing History.
 * Each workbook has:
 *   Sheet 1 – bills/orders: title block, styled header, zebra rows, TOTAL row, summary section
 *   Sheet 2 – item details (one row per part sold)
 * Totals use real Excel formulas (with cached results) so they stay correct if the user edits rows.
 */

const C = {
  navy: 'FF1E3A8A',
  blue: 'FF1D4ED8',
  lightBlue: 'FFDBEAFE',
  zebra: 'FFF1F5F9',
  border: 'FFCBD5E1',
  muted: 'FF64748B',
  white: 'FFFFFFFF',
  green: 'FF047857',
  red: 'FFB91C1C',
  amber: 'FFB45309',
};
const MONEY = '"₹"#,##0.00';
const INT = '#,##0';
const IST_OFFSET_MS = 330 * 60 * 1000;
const thin = { style: 'thin', color: { argb: C.border } };
const box = { top: thin, left: thin, bottom: thin, right: thin };
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

/** Excel stores dates without a timezone, so shift to IST before writing */
const istCellDate = (d) => new Date(new Date(d).getTime() + IST_OFFSET_MS);
const colLetter = (n) => {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

const STATUS_COLORS = {
  PAID: C.green, DELIVERED: C.green, CANCELLED: C.red, FAILED: C.red, REFUNDED: C.muted,
  PENDING: C.amber, ACCEPTED: C.blue, PACKED: C.blue, SHIPPED: C.blue,
};

function newWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MotorDesk';
  wb.created = new Date();
  return wb;
}

function setupSheet(ws) {
  ws.pageSetup = {
    orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  ws.headerFooter.oddFooter = `&L&8MotorDesk&C&8Page &P of &N&R&8Generated ${fmtIstDate(new Date())}, ${fmtIstTime(new Date())}`;
  ws.properties.defaultRowHeight = 18;
}

/** Title block (rows 1–3) + blank row 4. Returns the header row number (5). */
function titleBlock(ws, { shop, title, range, width }) {
  const last = colLetter(width);

  ws.mergeCells(`A1:${last}1`);
  const t = ws.getCell('A1');
  t.value = shop.shopName;
  t.font = { name: 'Calibri', size: 18, bold: true, color: { argb: C.white } };
  t.fill = fill(C.navy);
  t.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 32;

  ws.mergeCells(`A2:${last}2`);
  const s = ws.getCell('A2');
  s.value = `${title}${shop.gstin ? `   •   GSTIN: ${shop.gstin}` : ''}${shop.city ? `   •   ${shop.city}, ${shop.state}` : ''}`;
  s.font = { size: 12, bold: true, color: { argb: C.navy } };
  s.fill = fill(C.lightBlue);
  s.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 22;

  ws.mergeCells(`A3:${last}3`);
  const p = ws.getCell('A3');
  p.value = `Period: ${fmtIstDate(range.gte)} – ${fmtIstDate(range.lte)}      Generated: ${fmtIstDate(new Date())}, ${fmtIstTime(new Date())}`;
  p.font = { size: 10, italic: true, color: { argb: C.muted } };
  p.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(3).height = 18;
  return 5;
}

/**
 * Writes a styled table. columns: [{ header, key, width, type: 'text'|'money'|'int'|'date'|'time'|'pct'|'status', sum }]
 * Returns { firstRow, lastRow, totalRow, colIndex(key) }
 */
function writeTable(ws, startRow, columns, rows, { totalLabel = 'TOTAL' } = {}) {
  columns.forEach((c, i) => { ws.getColumn(i + 1).width = c.width; });

  const header = ws.getRow(startRow);
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: C.white }, size: 10.5 };
    cell.fill = fill(C.blue);
    cell.border = box;
    cell.alignment = { vertical: 'middle', horizontal: ['money', 'int', 'pct'].includes(c.type) ? 'right' : 'center', wrapText: true };
  });
  header.height = 30;

  const firstRow = startRow + 1;
  rows.forEach((r, idx) => {
    const row = ws.getRow(firstRow + idx);
    columns.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      let v = r[c.key];
      if (c.type === 'date' || c.type === 'time') v = v ? istCellDate(v) : null;
      cell.value = v ?? (c.type === 'money' || c.type === 'int' ? 0 : '');
      cell.border = box;
      cell.alignment = { vertical: 'middle', horizontal: c.align ?? (['money', 'int', 'pct'].includes(c.type) ? 'right' : c.type === 'text' ? 'left' : 'center'), wrapText: c.wrap };
      if (c.type === 'money') cell.numFmt = MONEY;
      if (c.type === 'int') cell.numFmt = INT;
      if (c.type === 'pct') cell.numFmt = '0"%"';
      if (c.type === 'date') cell.numFmt = 'dd-mmm-yyyy';
      if (c.type === 'time') cell.numFmt = 'hh:mm AM/PM';
      if (c.type === 'status' && STATUS_COLORS[v]) cell.font = { bold: true, color: { argb: STATUS_COLORS[v] } };
      if (idx % 2 === 1) cell.fill = fill(C.zebra);
    });
    const lines = Math.max(1, ...columns.filter((c) => c.wrap).map((c) =>
      String(r[c.key] ?? '').split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / (c.width * 1.15))), 0)));
    if (lines > 1) row.height = 15 * lines + 3;
  });

  const lastRow = firstRow + Math.max(rows.length, 1) - 1;
  if (!rows.length) {
    ws.mergeCells(firstRow, 1, firstRow, columns.length);
    const cell = ws.getCell(firstRow, 1);
    cell.value = 'No records in this period';
    cell.font = { italic: true, color: { argb: C.muted } };
    cell.alignment = { horizontal: 'center' };
  }

  // TOTAL row
  const totalRow = lastRow + 1;
  const tr = ws.getRow(totalRow);
  columns.forEach((c, i) => {
    const cell = tr.getCell(i + 1);
    cell.fill = fill(C.lightBlue);
    cell.font = { bold: true, color: { argb: C.navy } };
    cell.border = { ...box, top: { style: 'double', color: { argb: C.navy } } };
    if (c.sum) {
      const L = colLetter(i + 1);
      const result = rows.reduce((n, r) => n + toNum(r[c.key]), 0);
      cell.value = { formula: `SUM(${L}${firstRow}:${L}${lastRow})`, result: c.type === 'money' ? round2(result) : result };
      cell.numFmt = c.type === 'money' ? MONEY : INT;
      cell.alignment = { horizontal: 'right' };
    }
  });
  tr.getCell(1).value = totalLabel;
  tr.height = 22;

  ws.views = [{ state: 'frozen', ySplit: startRow, xSplit: 0, activeCell: `A${firstRow}` }];

  const colIndex = (key) => columns.findIndex((c) => c.key === key) + 1;
  return { firstRow, lastRow, totalRow, colIndex };
}

/*
 * Summary sections sit BELOW the table, side by side on the same rows.
 * Each box is given a column span { from, to } chosen so labels and ₹ amounts have room:
 *   summary box   → label = from..to-1 (merged), value = to
 *   breakdown box → label = from..to-2 (merged), count = to-1, amount = to
 */
function boxHeader(ws, row, title, { from, to }) {
  ws.mergeCells(row, from, row, to);
  const h = ws.getCell(row, from);
  h.value = title;
  h.font = { bold: true, size: 11, color: { argb: C.white } };
  h.fill = fill(C.navy);
  h.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(row).height = 22;
}

/** items: [{ label, formula, result, type: 'money'|'int', bold }] */
function summaryBox(ws, row, title, items, span) {
  const { from, to } = span;
  boxHeader(ws, row, title, span);
  // sub-header keeps the three boxes' rows aligned
  ws.mergeCells(row + 1, from, row + 1, to - 1);
  [[from, 'Particulars'], [to, 'Value']].forEach(([c, t]) => {
    const cell = ws.getCell(row + 1, c);
    cell.value = t;
    cell.font = { bold: true, size: 10, color: { argb: C.navy } };
    cell.alignment = { horizontal: 'center' };
  });
  for (let c = from; c <= to; c++) { ws.getCell(row + 1, c).fill = fill(C.lightBlue); ws.getCell(row + 1, c).border = box; }

  items.forEach((it, i) => {
    const r = row + 2 + i;
    ws.mergeCells(r, from, r, to - 1);
    const label = ws.getCell(r, from);
    const val = ws.getCell(r, to);
    label.value = it.label;
    label.font = { color: { argb: it.bold ? C.navy : 'FF334155' }, bold: it.bold };
    label.alignment = { vertical: 'middle', indent: 1 };
    val.value = { formula: it.formula, result: it.result };
    val.numFmt = it.type === 'money' ? MONEY : INT;
    val.font = { bold: true, size: it.bold ? 12 : 11, color: { argb: it.bold ? C.navy : 'FF0F172A' } };
    val.alignment = { horizontal: 'right', vertical: 'middle' };
    for (let c = from; c <= to; c++) {
      const cell = ws.getCell(r, c);
      cell.border = box;
      if (it.bold) cell.fill = fill(C.lightBlue);
      else if (i % 2 === 1) cell.fill = fill(C.zebra);
    }
    if (it.bold) ws.getRow(r).height = 22;
  });
}

/** Breakdown by a column (payment mode / status) using COUNTIF + SUMIF(S) */
function breakdownBox(ws, row, title, groups, { keyCol, amountCol, firstRow, lastRow, rows, keyField, amountField, excludeField, excludeValue, firstLabel }, span) {
  const { from, to } = span;
  boxHeader(ws, row, title, span);
  const sub = row + 1;
  if (to - 2 > from) ws.mergeCells(sub, from, sub, to - 2);
  [[from, firstLabel], [to - 1, 'Count'], [to, 'Amount']].forEach(([c, t]) => {
    const cell = ws.getCell(sub, c);
    cell.value = t;
    cell.font = { bold: true, size: 10, color: { argb: C.navy } };
    cell.alignment = { horizontal: 'center' };
  });
  for (let c = from; c <= to; c++) { ws.getCell(sub, c).fill = fill(C.lightBlue); ws.getCell(sub, c).border = box; }

  const ref = (c) => `$${colLetter(c)}$${firstRow}:$${colLetter(c)}$${lastRow}`;
  const K = ref(keyCol);
  const A = ref(amountCol);
  const ex = excludeField ? ref(excludeField.col) : null;

  groups.forEach((g, i) => {
    const r = sub + 1 + i;
    const matching = rows.filter((x) => x[keyField] === g.key);
    const counted = excludeValue ? matching.filter((x) => x[excludeField.key] !== excludeValue) : matching;
    if (to - 2 > from) ws.mergeCells(r, from, r, to - 2);
    const label = ws.getCell(r, from);
    const count = ws.getCell(r, to - 1);
    const amount = ws.getCell(r, to);
    label.value = g.label;
    label.alignment = { indent: 1 };
    count.value = { formula: `COUNTIF(${K},"${g.key}")`, result: matching.length };
    count.numFmt = INT;
    count.alignment = { horizontal: 'center' };
    amount.value = ex
      ? { formula: `SUMIFS(${A},${K},"${g.key}",${ex},"<>${excludeValue}")`, result: round2(counted.reduce((n, x) => n + toNum(x[amountField]), 0)) }
      : { formula: `SUMIF(${K},"${g.key}",${A})`, result: round2(matching.reduce((n, x) => n + toNum(x[amountField]), 0)) };
    amount.numFmt = MONEY;
    amount.font = { bold: true };
    amount.alignment = { horizontal: 'right' };
    for (let c = from; c <= to; c++) { ws.getCell(r, c).border = box; if (i % 2 === 1) ws.getCell(r, c).fill = fill(C.zebra); }
  });
}

/** "Air Filter × 2, Spark Plug × 1" */
const itemsText = (items) => items.map((it) => `${it.productName} × ${it.quantity}`).join('\n');

const PAYMENT_LABEL = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', COD: 'Cash on delivery', ONLINE: 'Online (Razorpay)' };

// ═══════════════════════ WALK-IN (POS) ═══════════════════════

export async function buildWalkinWorkbook({ shop, rows, range }) {
  const wb = newWorkbook();
  const ws = wb.addWorksheet('Walk-in Bills', { properties: { tabColor: { argb: C.blue } } });
  setupSheet(ws);

  const data = rows.map((inv, i) => ({
    sno: i + 1,
    invoiceNumber: inv.invoiceNumber,
    date: inv.createdAt,
    time: inv.createdAt,
    customer: inv.garage?.name ?? inv.customerName ?? 'Walk-in customer',
    type: inv.garage ? 'Garage (B2B)' : 'Walk-in',
    phone: inv.garage?.phone ?? inv.customerPhone ?? '',
    gstin: inv.garage?.gstin ?? inv.customerGstin ?? '',
    itemsList: itemsText(inv.items),
    items: inv.items.reduce((n, it) => n + it.quantity, 0),
    taxable: toNum(inv.subtotal),
    discount: toNum(inv.discount),
    cgst: toNum(inv.cgst),
    sgst: toNum(inv.sgst),
    igst: toNum(inv.igst),
    total: toNum(inv.grandTotal),
    paymentMode: PAYMENT_LABEL[inv.paymentMode] ?? inv.paymentMode,
  }));

  const columns = [
    { header: 'S.No', key: 'sno', width: 7, type: 'int', align: 'center' },
    { header: 'Invoice No', key: 'invoiceNumber', width: 19, type: 'text' },
    { header: 'Date', key: 'date', width: 13, type: 'date' },
    { header: 'Time', key: 'time', width: 10, type: 'time' },
    { header: 'Customer', key: 'customer', width: 26, type: 'text' },
    { header: 'Type', key: 'type', width: 13, type: 'text' },
    { header: 'Phone', key: 'phone', width: 16, type: 'text' },
    { header: 'Customer GSTIN', key: 'gstin', width: 18, type: 'text' },
    { header: 'Items', key: 'itemsList', width: 36, type: 'text', wrap: true },
    { header: 'Qty', key: 'items', width: 7, type: 'int', sum: true },
    { header: 'Taxable Value', key: 'taxable', width: 14, type: 'money', sum: true },
    { header: 'Discount', key: 'discount', width: 11, type: 'money', sum: true },
    { header: 'CGST', key: 'cgst', width: 11, type: 'money', sum: true },
    { header: 'SGST', key: 'sgst', width: 11, type: 'money', sum: true },
    { header: 'IGST', key: 'igst', width: 11, type: 'money', sum: true },
    { header: 'Grand Total', key: 'total', width: 15, type: 'money', sum: true },
    { header: 'Payment Mode', key: 'paymentMode', width: 16, type: 'text', align: 'center' },
  ];

  const headerRow = titleBlock(ws, { shop, title: 'Walk-in Billing Report (Counter / POS)', range, width: columns.length });
  const t = writeTable(ws, headerRow, columns, data);
  const L = (key) => colLetter(t.colIndex(key));
  const sumOf = (key) => round2(data.reduce((n, r) => n + r[key], 0));
  const gst = round2(sumOf('cgst') + sumOf('sgst') + sumOf('igst'));

  const boxRow = t.totalRow + 3;
  summaryBox(ws, boxRow, 'SUMMARY', [
    { label: 'Total bills', formula: `COUNT(${L('sno')}${t.firstRow}:${L('sno')}${t.lastRow})`, result: data.length },
    { label: 'Items sold (qty)', formula: `${L('items')}${t.totalRow}`, result: sumOf('items') },
    { label: 'Taxable value', formula: `${L('taxable')}${t.totalRow}`, result: sumOf('taxable'), type: 'money' },
    { label: 'Discount given', formula: `${L('discount')}${t.totalRow}`, result: sumOf('discount'), type: 'money' },
    { label: 'Total GST', formula: `${L('cgst')}${t.totalRow}+${L('sgst')}${t.totalRow}+${L('igst')}${t.totalRow}`, result: gst, type: 'money' },
    { label: 'Average bill value', formula: `IFERROR(${L('total')}${t.totalRow}/COUNT(${L('sno')}${t.firstRow}:${L('sno')}${t.lastRow}),0)`, result: data.length ? round2(sumOf('total') / data.length) : 0, type: 'money' },
    { label: 'GRAND TOTAL', formula: `${L('total')}${t.totalRow}`, result: sumOf('total'), type: 'money', bold: true },
  ], { from: 2, to: 5 }); // B:D label | E value
  breakdownBox(ws, boxRow, 'BY PAYMENT MODE', ['CASH', 'UPI', 'CARD'].map((k) => ({ key: PAYMENT_LABEL[k], label: PAYMENT_LABEL[k] })), {
    keyCol: t.colIndex('paymentMode'), amountCol: t.colIndex('total'), firstRow: t.firstRow, lastRow: t.lastRow,
    rows: data, keyField: 'paymentMode', amountField: 'total', firstLabel: 'Payment Mode',
  }, { from: 7, to: 9 }); // (F = gap) G label | H count | I amount

  // ─── Sheet 2: item details
  const ws2 = wb.addWorksheet('Item Details', { properties: { tabColor: { argb: C.navy } } });
  setupSheet(ws2);
  const items = rows.flatMap((inv) => inv.items.map((it) => ({
    invoiceNumber: inv.invoiceNumber, date: inv.createdAt, customer: inv.garage?.name ?? inv.customerName ?? 'Walk-in customer',
    part: it.productName, oem: it.oemNumber, hsn: it.hsnCode ?? '', qty: it.quantity, rate: toNum(it.unitPrice),
    gstRate: toNum(it.gstRate), tax: toNum(it.taxAmount), total: toNum(it.lineTotal),
  }))).map((x, i) => ({ sno: i + 1, ...x }));
  const itemCols = [
    { header: 'S.No', key: 'sno', width: 7, type: 'int', align: 'center' },
    { header: 'Invoice No', key: 'invoiceNumber', width: 19, type: 'text' },
    { header: 'Date', key: 'date', width: 13, type: 'date' },
    { header: 'Customer', key: 'customer', width: 24, type: 'text' },
    { header: 'Part Name', key: 'part', width: 30, type: 'text' },
    { header: 'OEM No', key: 'oem', width: 16, type: 'text' },
    { header: 'HSN', key: 'hsn', width: 11, type: 'text' },
    { header: 'Qty', key: 'qty', width: 7, type: 'int', sum: true },
    { header: 'Rate (excl. GST)', key: 'rate', width: 14, type: 'money' },
    { header: 'GST %', key: 'gstRate', width: 8, type: 'pct' },
    { header: 'GST Amount', key: 'tax', width: 12, type: 'money', sum: true },
    { header: 'Line Total', key: 'total', width: 14, type: 'money', sum: true },
  ];
  writeTable(ws2, titleBlock(ws2, { shop, title: 'Walk-in Bills – Item Details', range, width: itemCols.length }), itemCols, items);

  return wb.xlsx.writeBuffer();
}

// ═══════════════════════ ONLINE (MARKETPLACE) ═══════════════════════

export async function buildOnlineWorkbook({ shop, rows, range }) {
  const wb = newWorkbook();
  const ws = wb.addWorksheet('Online Orders', { properties: { tabColor: { argb: C.blue } } });
  setupSheet(ws);

  const data = rows.map((o, i) => ({
    sno: i + 1,
    orderNumber: o.orderNumber,
    date: o.createdAt,
    time: o.createdAt,
    customer: o.shippingAddress?.name ?? o.customer.name,
    phone: o.shippingAddress?.phone ?? o.customer.phone ?? '',
    address: [o.shippingAddress?.line1, o.shippingAddress?.landmark && `Near ${o.shippingAddress.landmark}`, o.shippingAddress?.city, o.shippingAddress?.pincode].filter(Boolean).join(', '),
    state: o.shippingAddress?.state ?? '',
    itemsList: itemsText(o.items),
    items: o.items.reduce((n, it) => n + it.quantity, 0),
    subtotal: toNum(o.subtotal),
    gst: toNum(o.taxTotal),
    total: toNum(o.grandTotal),
    paymentMode: PAYMENT_LABEL[o.paymentMode] ?? o.paymentMode,
    paymentStatus: o.paymentStatus,
    upiRef: o.upiRef ?? '',
    status: o.status,
    invoice: o.invoice?.invoiceNumber ?? '',
  }));

  const columns = [
    { header: 'S.No', key: 'sno', width: 7, type: 'int', align: 'center' },
    { header: 'Order No', key: 'orderNumber', width: 18, type: 'text' },
    { header: 'Date', key: 'date', width: 13, type: 'date' },
    { header: 'Time', key: 'time', width: 10, type: 'time' },
    { header: 'Customer', key: 'customer', width: 22, type: 'text' },
    { header: 'Phone', key: 'phone', width: 13, type: 'text' },
    { header: 'Delivery Address', key: 'address', width: 34, type: 'text', wrap: true },
    { header: 'State', key: 'state', width: 13, type: 'text' },
    { header: 'Items', key: 'itemsList', width: 34, type: 'text', wrap: true },
    { header: 'Qty', key: 'items', width: 7, type: 'int', sum: true },
    { header: 'Subtotal', key: 'subtotal', width: 13, type: 'money', sum: true },
    { header: 'GST', key: 'gst', width: 11, type: 'money', sum: true },
    { header: 'Grand Total', key: 'total', width: 15, type: 'money', sum: true },
    { header: 'Payment Mode', key: 'paymentMode', width: 18, type: 'text', align: 'center' },
    { header: 'Payment Status', key: 'paymentStatus', width: 13, type: 'status' },
    { header: 'UPI Ref / UTR', key: 'upiRef', width: 16, type: 'text' },
    { header: 'Order Status', key: 'status', width: 13, type: 'status' },
    { header: 'Invoice No', key: 'invoice', width: 19, type: 'text' },
  ];

  const headerRow = titleBlock(ws, { shop, title: 'Online Orders Report (Marketplace)', range, width: columns.length });
  const t = writeTable(ws, headerRow, columns, data, { totalLabel: 'TOTAL (all)' });
  const rng = (key) => `${colLetter(t.colIndex(key))}${t.firstRow}:${colLetter(t.colIndex(key))}${t.lastRow}`;
  const live = data.filter((d) => d.status !== 'CANCELLED');
  const sum = (arr, key) => round2(arr.reduce((n, r) => n + r[key], 0));

  const boxRow = t.totalRow + 3;
  summaryBox(ws, boxRow, 'SUMMARY', [
    { label: 'Total orders', formula: `COUNT(${rng('sno')})`, result: data.length },
    { label: 'Delivered', formula: `COUNTIF(${rng('status')},"DELIVERED")`, result: data.filter((d) => d.status === 'DELIVERED').length },
    { label: 'In progress', formula: `COUNT(${rng('sno')})-COUNTIF(${rng('status')},"DELIVERED")-COUNTIF(${rng('status')},"CANCELLED")`, result: data.filter((d) => !['DELIVERED', 'CANCELLED'].includes(d.status)).length },
    { label: 'Cancelled', formula: `COUNTIF(${rng('status')},"CANCELLED")`, result: data.length - live.length },
    { label: 'Payment received', formula: `SUMIF(${rng('paymentStatus')},"PAID",${rng('total')})`, result: sum(data.filter((d) => d.paymentStatus === 'PAID'), 'total'), type: 'money' },
    { label: 'GST (excl. cancelled)', formula: `SUMIF(${rng('status')},"<>CANCELLED",${rng('gst')})`, result: sum(live, 'gst'), type: 'money' },
    { label: 'NET SALES (excl. cancelled)', formula: `SUMIF(${rng('status')},"<>CANCELLED",${rng('total')})`, result: sum(live, 'total'), type: 'money', bold: true },
  ], { from: 2, to: 5 }); // B:D label | E value
  const opts = { amountCol: t.colIndex('total'), firstRow: t.firstRow, lastRow: t.lastRow, rows: data, amountField: 'total' };
  breakdownBox(ws, boxRow, 'BY PAYMENT MODE (excl. cancelled)', ['COD', 'UPI', 'ONLINE'].map((k) => ({ key: PAYMENT_LABEL[k], label: PAYMENT_LABEL[k] })), {
    ...opts, keyCol: t.colIndex('paymentMode'), keyField: 'paymentMode', excludeField: { col: t.colIndex('status'), key: 'status' }, excludeValue: 'CANCELLED', firstLabel: 'Payment Mode',
  }, { from: 7, to: 9 }); // (F = gap) G label | H count | I amount
  breakdownBox(ws, boxRow, 'BY ORDER STATUS', ['PENDING', 'ACCEPTED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((k) => ({ key: k, label: k.charAt(0) + k.slice(1).toLowerCase() })), {
    ...opts, keyCol: t.colIndex('status'), keyField: 'status', firstLabel: 'Order Status',
  }, { from: 11, to: 14 }); // (J = gap) K:L label | M count | N amount

  // ─── Sheet 2: item details
  const ws2 = wb.addWorksheet('Item Details', { properties: { tabColor: { argb: C.navy } } });
  setupSheet(ws2);
  const items = rows.flatMap((o) => o.items.map((it) => ({
    orderNumber: o.orderNumber, date: o.createdAt, customer: o.shippingAddress?.name ?? o.customer.name, status: o.status,
    part: it.productName, oem: it.oemNumber, qty: it.quantity, rate: toNum(it.unitPrice), gstRate: toNum(it.gstRate), total: toNum(it.lineTotal),
  }))).map((x, i) => ({ sno: i + 1, ...x }));
  const itemCols = [
    { header: 'S.No', key: 'sno', width: 7, type: 'int', align: 'center' },
    { header: 'Order No', key: 'orderNumber', width: 18, type: 'text' },
    { header: 'Date', key: 'date', width: 13, type: 'date' },
    { header: 'Customer', key: 'customer', width: 22, type: 'text' },
    { header: 'Part Name', key: 'part', width: 30, type: 'text' },
    { header: 'OEM No', key: 'oem', width: 16, type: 'text' },
    { header: 'Qty', key: 'qty', width: 7, type: 'int', sum: true },
    { header: 'Rate (excl. GST)', key: 'rate', width: 14, type: 'money' },
    { header: 'GST %', key: 'gstRate', width: 8, type: 'pct' },
    { header: 'Line Total', key: 'total', width: 14, type: 'money', sum: true },
    { header: 'Order Status', key: 'status', width: 13, type: 'status' },
  ];
  writeTable(ws2, titleBlock(ws2, { shop, title: 'Online Orders – Item Details', range, width: itemCols.length }), itemCols, items);

  return wb.xlsx.writeBuffer();
}