import { Package, Store } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, Navigate } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';
import useFetch from '../../shared/hooks/useFetch.js';
import Button from '../../shared/ui/Button.jsx';
import EmptyState from '../../shared/ui/EmptyState.jsx';
import Pagination from '../../shared/ui/Pagination.jsx';
import Spinner from '../../shared/ui/Spinner.jsx';
import { formatCurrency } from '../../shared/utils/formatCurrency.js';
import { formatDateTime } from '../../shared/utils/formatDate.js';
import { PAYMENT_LABELS } from '../../shared/utils/constants.js';
import OrderTracker from './components/OrderTracker.jsx';
import { cancelMyOrder, getMyOrders } from './myOrders.api.js';

export default function MyOrdersPage() {
  const { isLoggedIn, isCustomer } = useAuth();
  const [page, setPage] = useState(1);
  const { data, meta, loading, reload } = useFetch(() => (isCustomer ? getMyOrders({ page, limit: 10 }) : Promise.resolve({ data: [] })), [page, isCustomer]);

  if (!isLoggedIn) return <Navigate to="/login?next=/my-orders" replace />;

  const onCancel = async (id, prepaid) => {
    if (!window.confirm(prepaid ? 'Cancel this order? The amount will be refunded to you.' : 'Cancel this order?')) return;
    try { await cancelMyOrder(id); toast.success('Order cancelled'); reload(); } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="page-title mb-4">My orders</h1>
      {loading ? <Spinner /> : !data?.length ? (
        <EmptyState icon={Package} title="No orders yet" action={<Link to="/shop" className="text-brand-600">Start shopping</Link>} />
      ) : (
        <div className="space-y-4">
          {data.map((o) => (
            <div key={o.id} className="card p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800">#{o.orderNumber}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500"><Store className="h-3 w-3" /> {o.vendor.shopName} · {formatDateTime(o.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(o.grandTotal)}</p>
                  <p className="text-xs text-slate-500">{o.paymentMode === 'ONLINE' && o.paymentStatus !== 'PAID' ? 'Online' : o.paymentMode === 'UPI' ? (o.paymentStatus === 'PAID' ? 'Paid by UPI' : 'UPI') : PAYMENT_LABELS[o.paymentMode]}{o.paymentStatus === 'PENDING' && o.paymentMode === 'COD' ? ' · due on delivery' : ''}</p>
                </div>
              </div>
              {o.status === 'AWAITING_PAYMENT' && o.paymentMode === 'UPI' ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  <span>Waiting for your UPI payment to {o.vendor.shopName}. Unpaid orders are released after 30 minutes.</span>
                  <Link to={`/pay?orders=${o.id}`} className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700">Pay now</Link>
                </div>
              ) : (
                <OrderTracker status={o.status} />
              )}
              {o.paymentMode === 'UPI' && o.upiRef && o.paymentStatus === 'PENDING' && o.status === 'PENDING' && (
                <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">UPI payment submitted (ref <span className="font-mono">{o.upiRef}</span>) — waiting for {o.vendor.shopName} to confirm it.</p>
              )}
              {o.paymentMode === 'UPI' && o.paymentStatus === 'FAILED' && o.upiRef && (
                <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">{o.vendor.shopName} could not find your UPI payment (ref {o.upiRef}), so the order was cancelled. If money was deducted, contact the shop with this reference.</p>
              )}
              <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
                {o.items.map((i) => <li key={i.id} className="flex justify-between"><span>{i.productName} × {i.quantity}</span><span>{formatCurrency(i.lineTotal)}</span></li>)}
              </ul>
              {o.paymentStatus === 'REFUNDED' && (
                <p className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700">Refund of {formatCurrency(o.grandTotal)} initiated to your original payment method. It usually reaches you in 5–7 working days.</p>
              )}
              {(o.status === 'PENDING' || (o.status === 'AWAITING_PAYMENT' && o.paymentMode === 'UPI')) && !(o.paymentMode === 'UPI' && o.paymentStatus === 'PAID') && (
                <div className="mt-3 text-right"><Button variant="secondary" size="sm" onClick={() => onCancel(o.id, o.paymentStatus === 'PAID')}>Cancel order</Button></div>
              )}
            </div>
          ))}
          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}