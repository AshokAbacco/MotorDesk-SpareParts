import { ArrowRight, XCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../../shared/ui/Button.jsx';
import { NEXT_STATUS } from '../../../shared/utils/constants.js';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { updateOrderStatus } from '../orders.api.js';
import UpiPaymentCheck from './UpiPaymentCheck.jsx';

const LABEL = { ACCEPTED: 'Accept order', PACKED: 'Mark packed', SHIPPED: 'Mark shipped', DELIVERED: 'Mark delivered' };

export default function StatusUpdater({ order, onUpdated }) {
  const [busy, setBusy] = useState('');
  const next = NEXT_STATUS[order.status];
  const canCancel = ['PENDING', 'ACCEPTED'].includes(order.status);

  const change = async (status) => {
    const paidOnline = order.paymentMode === 'ONLINE' && order.paymentStatus === 'PAID';
    const paidUpi = order.paymentMode === 'UPI' && order.paymentStatus === 'PAID';
    const msg = paidOnline
      ? `Cancel this order? ${formatCurrency(order.grandTotal)} will be refunded to the customer via Razorpay.`
      : paidUpi
        ? `Cancel this order? The customer paid ${formatCurrency(order.grandTotal)} to your UPI — please refund them from your UPI app.`
        : 'Cancel this order? Stock will be restored.';
    if (status === 'CANCELLED' && !window.confirm(msg)) return;
    setBusy(status);
    try {
      const res = await updateOrderStatus(order.id, status);
      toast.success(status === 'DELIVERED' ? 'Delivered — invoice generated' : res.data.paymentStatus === 'REFUNDED' ? 'Order cancelled — refund initiated' : `Order ${status.toLowerCase()}`);
      onUpdated(res.data);
    } catch (e) { toast.error(e.message); } finally { setBusy(''); }
  };

  // UPI orders: the shop must first confirm the money arrived
  if (order.paymentMode === 'UPI' && order.paymentStatus === 'PENDING' && order.status === 'PENDING') {
    return <UpiPaymentCheck order={order} onUpdated={onUpdated} />;
  }
  if (!next && !canCancel) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {next && <Button icon={ArrowRight} loading={busy === next} onClick={() => change(next)}>{LABEL[next]}</Button>}
      {canCancel && <Button variant="secondary" icon={XCircle} loading={busy === 'CANCELLED'} onClick={() => change('CANCELLED')}>Cancel</Button>}
    </div>
  );
}