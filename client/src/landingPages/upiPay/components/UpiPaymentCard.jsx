// client/src/landingPages/upiPay/components/UpiPaymentCard.jsx
import { CheckCircle2, Clock, Copy, Store } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import UpiQrCode from '../../../shared/ui/UpiQrCode.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { UPI_APPS, appLink, isMobile } from '../../../shared/utils/upi.js';
import { submitUpiPayment } from '../upiPay.api.js';

export default function UpiPaymentCard({ details, preferredApp, onSubmitted, onCancel }) {
  const [utr, setUtr] = useState(details.upiRef ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const mobile = isMobile();
  const submitted = Boolean(details.upiRef) || details.status !== 'AWAITING_PAYMENT';
  const expired = details.payBy && new Date(details.payBy) < new Date();

  const copy = (text, label) => navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await submitUpiPayment(details.orderId, utr.trim());
      toast.success(`Payment sent to ${details.shopName} for confirmation`);
      onSubmitted(res.data);
    } catch (err) {
      setError(err.errors?.[0]?.message ?? err.message);
    } finally {
      setSaving(false);
    }
  };

  const apps = [...UPI_APPS].sort((a, b) => (a.key === preferredApp ? -1 : b.key === preferredApp ? 1 : 0));

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
        <p className="flex items-center gap-2 font-semibold text-slate-800"><Store className="h-4 w-4 text-slate-400" /> {details.shopName}</p>
        <p className="text-sm text-slate-500">Order #{details.orderNumber}</p>
      </div>

      {submitted ? (
        <div className="flex items-start gap-3 p-5">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
          <div className="text-sm">
            <p className="font-semibold text-slate-800">
              {details.paymentStatus === 'PAID' ? 'Payment confirmed by the shop' : `Payment of ${formatCurrency(details.amount)} submitted`}
            </p>
            <p className="text-slate-500">UPI reference: <span className="font-mono">{details.upiRef}</span>{details.paymentStatus !== 'PAID' && ' · the shop will confirm once it sees the money.'}</p>
          </div>
        </div>
      ) : expired ? (
        <p className="p-5 text-sm text-red-600">The 30-minute payment window has ended and this order was released. Please order again.</p>
      ) : (
        <div className="grid gap-6 p-5 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center">
            <UpiQrCode value={details.upiLink} size={190} />
            <p className="mt-2 max-w-[210px] text-center text-xs text-slate-500">{mobile ? 'Or scan from another phone' : 'Scan with Google Pay, PhonePe, Paytm or any UPI app'}</p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Amount to pay</p>
              <p className="text-3xl font-semibold text-slate-900">{formatCurrency(details.amount)}</p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-slate-500">Pay to <span className="font-medium text-slate-700">{details.payeeName}</span></p>
              <button onClick={() => copy(details.upiId, 'UPI ID')} className="flex items-center gap-1.5 font-mono text-brand-700 hover:underline">{details.upiId} <Copy className="h-3.5 w-3.5" /></button>
              {details.upiNumber && (
                <button onClick={() => copy(details.upiNumber, 'UPI number')} className="flex items-center gap-1.5 text-slate-600 hover:underline">UPI number: {details.upiNumber} <Copy className="h-3.5 w-3.5" /></button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {apps.map(({ key, label, icon: Icon, color }) => (
                <a key={key} href={appLink(details.upiLink, key)}
                  onClick={(e) => { if (!mobile) { e.preventDefault(); toast('Open this page on your phone, or scan the QR code with your UPI app', { icon: '📱' }); } }}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${key === preferredApp ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  <Icon className={`h-5 w-5 ${color}`} /> {key === 'upi' ? 'UPI app' : label}
                </a>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-2 rounded-lg bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700">After paying, enter the UPI reference number</p>
              <div className="flex gap-2">
                <Input className="flex-1" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="12-digit UTR / UPI Ref No." maxLength={22} error={error} aria-label="UPI reference number" required />
                <Button type="submit" loading={saving}>I’ve paid</Button>
              </div>
              <p className="text-xs text-slate-500">Find it in your UPI app under the payment details (“UPI Ref No.”, “UTR” or “Transaction ID”).</p>
            </form>

            <div className="flex items-center justify-between text-xs text-slate-500">
              {details.payBy && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Pay by {new Date(details.payBy).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
              <button onClick={() => onCancel(details)} className="text-red-600 hover:underline">Cancel this order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}