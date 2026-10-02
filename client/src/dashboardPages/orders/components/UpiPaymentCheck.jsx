import { CheckCircle2, Smartphone, XCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../../shared/ui/Button.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { formatDateTime } from '../../../shared/utils/formatDate.js';
import { verifyUpiPayment } from '../orders.api.js';

/** Shown on UPI orders until the shop confirms the money arrived in its UPI / bank app */
export default function UpiPaymentCheck({ order, onUpdated }) {
  const [busy, setBusy] = useState('');

  const act = async (action) => {
    if (action === 'REJECT' && !window.confirm('Mark as NOT received? The order will be cancelled and the stock returned to your inventory.')) return;
    setBusy(action);
    try {
      const res = await verifyUpiPayment(order.id, action);
      toast.success(action === 'CONFIRM' ? 'Payment confirmed — you can accept the order now' : 'Order cancelled');
      onUpdated(res.data);
    } catch (e) { toast.error(e.message); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold text-amber-900"><Smartphone className="h-4 w-4" /> Check this UPI payment</p>
      <p className="text-amber-900">
        Customer says they paid <b>{formatCurrency(order.grandTotal)}</b> to your UPI
        {order.upiSubmittedAt && <> on {formatDateTime(order.upiSubmittedAt)}</>}.
        Open your UPI / bank app and look for reference <b className="font-mono">{order.upiRef}</b>.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="success" icon={CheckCircle2} loading={busy === 'CONFIRM'} onClick={() => act('CONFIRM')}>Payment received</Button>
        <Button variant="secondary" icon={XCircle} loading={busy === 'REJECT'} onClick={() => act('REJECT')}>Not received</Button>
      </div>
    </div>
  );
}