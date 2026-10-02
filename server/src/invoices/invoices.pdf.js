import PDFDocument from 'pdfkit';

const inr = (n) => `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Builds a GST tax invoice PDF and resolves with a Buffer (kept in memory). */
export function buildInvoicePdf(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const v = invoice.vendor;

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(v.shopName);
    doc.fontSize(9).font('Helvetica')
      .text([v.addressLine, v.city, v.state, v.pincode].filter(Boolean).join(', '))
      .text(`Phone: ${v.phone ?? '-'}   GSTIN: ${v.gstin ?? 'Unregistered'}`);
    doc.moveUp(3).fontSize(14).font('Helvetica-Bold').text('TAX INVOICE', { align: 'right' });
    doc.fontSize(9).font('Helvetica')
      .text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' })
      .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, { align: 'right' })
      .text(`Payment: ${invoice.paymentMode}`, { align: 'right' });

    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').text('Bill To');
    doc.font('Helvetica')
      .text(invoice.garage?.name ?? invoice.customerName ?? 'Walk-in Customer')
      .text(`Phone: ${invoice.garage?.phone ?? invoice.customerPhone ?? '-'}`)
      .text(`GSTIN: ${invoice.garage?.gstin ?? invoice.customerGstin ?? '-'}   Place of supply: ${invoice.placeOfSupply}`);

    // Table
    doc.moveDown();
    const cols = [40, 65, 245, 310, 350, 415, 460];
    const header = ['#', 'Item', 'HSN', 'Qty', 'Rate', 'GST%', 'Amount'];
    let y = doc.y + 5;
    doc.rect(40, y - 4, 515, 18).fill('#f1f5f9').fillColor('#000');
    doc.font('Helvetica-Bold').fontSize(9);
    header.forEach((h, i) => doc.text(h, cols[i], y, { width: i === 1 ? 175 : 90 }));
    y += 20;
    doc.font('Helvetica');

    invoice.items.forEach((it, idx) => {
      if (y > 720) { doc.addPage(); y = 50; }
      const row = [String(idx + 1), `${it.productName}\n${it.oemNumber}`, it.hsnCode ?? '-', String(it.quantity),
        inr(it.unitPrice), `${Number(it.gstRate)}%`, inr(it.lineTotal)];
      row.forEach((c, i) => doc.text(c, cols[i], y, { width: i === 1 ? 175 : 90 }));
      y += 26;
    });

    // Totals
    doc.moveTo(40, y).lineTo(555, y).stroke('#cbd5e1');
    y += 10;
    const totals = [
      ['Taxable value', invoice.subtotal],
      ...(Number(invoice.discount) > 0 ? [['Discount', -Number(invoice.discount)]] : []),
      ...(Number(invoice.igst) > 0 ? [['IGST', invoice.igst]] : [['CGST', invoice.cgst], ['SGST', invoice.sgst]]),
    ];
    totals.forEach(([label, val]) => {
      doc.text(label, 380, y).text(inr(val), 460, y);
      y += 15;
    });
    doc.font('Helvetica-Bold').fontSize(11).text('Grand Total', 380, y + 4).text(inr(invoice.grandTotal), 460, y + 4);

    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
      .text('This is a computer generated invoice. Powered by MotorDesk.', 40, 780, { align: 'center', width: 515 });

    doc.end();
  });
}
