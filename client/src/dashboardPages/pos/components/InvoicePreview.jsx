import { Download, Printer, Share2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaWhatsapp } from 'react-icons/fa';
import Button from '../../../shared/ui/Button.jsx';
import Modal from '../../../shared/ui/Modal.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { formatDateTime } from '../../../shared/utils/formatDate.js';
import { getInvoicePdf, shareInvoice } from '../invoice.api.js';

export default function InvoicePreview({ invoice, onClose }) {
  const [busy, setBusy] = useState('');
  if (!invoice) return null;

  const openPdf = async (download) => {
    setBusy(download ? 'download' : 'print');
    try {
      const blob = await getInvoicePdf(invoice.id);
      const url = URL.createObjectURL(blob);
      if (download) {
        const a = Object.assign(document.createElement('a'), { href: url, download: `${invoice.invoiceNumber}.pdf` });
        a.click();
      } else {
        window.open(url, '_blank', 'noopener');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) { toast.error(e.message); } finally { setBusy(''); }
  };

  const onShare = async () => {
    setBusy('share');
    try {
      const { data } = await shareInvoice(invoice.id);
      const phone = invoice.customerPhone ? `91${invoice.customerPhone}` : '';
      const text = encodeURIComponent(`Invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.grandTotal)}: ${data.pdfUrl}`);
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener');
    } catch (e) { toast.error(e.message); } finally { setBusy(''); }
  };

  return (
    <Modal open onClose={onClose} title={`Bill ${invoice.invoiceNumber}`} size="md"
      footer={
        <>
          <Button variant="secondary" icon={Printer} loading={busy === 'print'} onClick={() => openPdf(false)}>Print</Button>
          <Button variant="secondary" icon={Download} loading={busy === 'download'} onClick={() => openPdf(true)}>PDF</Button>
          <Button variant="success" loading={busy === 'share'} onClick={onShare}><FaWhatsapp className="h-4 w-4" /> Share</Button>
        </>
      }>
      <div className="text-sm">
        <div className="flex justify-between text-slate-500">
          <span>{invoice.garage?.name || invoice.customerName || 'Walk-in customer'}</span>
          <span>{formatDateTime(invoice.createdAt)}</span>
        </div>
        <table className="mt-3 w-full">
          <tbody className="divide-y divide-slate-100">
            {invoice.items.map((i) => (
              <tr key={i.id}>
                <td className="py-1.5">{i.productName} <span className="text-slate-400">× {i.quantity}</span></td>
                <td className="py-1.5 text-right">{formatCurrency(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-slate-600">
          <div className="flex justify-between"><span>Taxable</span><span>{formatCurrency(invoice.subtotal)}</span></div>
          {Number(invoice.igst) > 0
            ? <div className="flex justify-between"><span>IGST</span><span>{formatCurrency(invoice.igst)}</span></div>
            : <div className="flex justify-between"><span>CGST + SGST</span><span>{formatCurrency(Number(invoice.cgst) + Number(invoice.sgst))}</span></div>}
          <div className="flex justify-between text-base font-semibold text-slate-900"><span>Total ({invoice.paymentMode})</span><span>{formatCurrency(invoice.grandTotal)}</span></div>
        </div>
        <p className="mt-3 flex items-center gap-1 text-xs text-slate-400"><Share2 className="h-3 w-3" /> Share uploads the PDF to cloud storage and opens WhatsApp.</p>
      </div>
    </Modal>
  );
}
