/**
 * Atomically increments the vendor's invoice counter inside a transaction.
 * Format: INV-2627-000123 (financial year Apr–Mar)
 */
export async function nextInvoiceNumber(tx, vendorId) {
  const vendor = await tx.vendor.update({
    where: { id: vendorId },
    data: { invoiceSeq: { increment: 1 } },
    select: { invoiceSeq: true },
  });
  return `INV-${financialYear()}-${String(vendor.invoiceSeq).padStart(6, '0')}`;
}

export async function nextOrderNumber(tx, vendorId) {
  const vendor = await tx.vendor.update({
    where: { id: vendorId },
    data: { orderSeq: { increment: 1 } },
    select: { orderSeq: true },
  });
  return `MD-${vendorId.slice(0, 4).toUpperCase()}-${String(vendor.orderSeq).padStart(6, '0')}`;
}

function financialYear(d = new Date()) {
  const y = d.getFullYear() % 100;
  const start = d.getMonth() >= 3 ? y : y - 1;
  return `${String(start).padStart(2, '0')}${String(start + 1).padStart(2, '0')}`;
}
