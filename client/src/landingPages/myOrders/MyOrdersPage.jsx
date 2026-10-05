// client/src/landingPages/myOrders/MyOrdersPage.jsx
import { Package, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';
import useFetch from '../../shared/hooks/useFetch.js';
import Button from '../../shared/ui/Button.jsx';
import EmptyState from '../../shared/ui/EmptyState.jsx';
import { NOTIFICATION_EVENT } from '../../shared/notifications.api.js';
import Pagination from '../../shared/ui/Pagination.jsx';
import Spinner from '../../shared/ui/Spinner.jsx';
import { formatCurrency } from '../../shared/utils/formatCurrency.js';
import { formatDateTime } from '../../shared/utils/formatDate.js';
import { PAYMENT_LABELS } from '../../shared/utils/constants.js';
import OrderTracker from './components/OrderTracker.jsx';
import { cancelMyOrder, getMyOrders } from './myOrders.api.js';

/** "Rear Brake Shoe Set" or "Air Filter + 2 more" */
const orderTitle = (o) => {
  const [first, ...rest] = o.items;
  return `${first?.productName ?? 'Order'}${rest.length ? ` + ${rest.length} more` : ''}`;
};
/** Distinct HSN codes of the parts in the order, e.g. "85122010" or "87083000, 84212300" */
const hsnCodes = (o) => [...new Set(o.items.map((i) => i.hsnCode).filter(Boolean))].join(', ');

export default function MyOrdersPage() {
  const { isLoggedIn, isCustomer } = useAuth();
  const [page, setPage] = useState(1);
  const { data, meta, loading, reload } = useFetch(() => (isCustomer ? getMyOrders({ page, limit: 10 }) : Promise.resolve({ data: [] })), [page, isCustomer]);

  // Opened from a notification (/my-orders?order=<id>) → scroll to that order and highlight it
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get('order');
  useEffect(() => {
    if (!highlight || loading) return;
    if (page !== 1 && !data?.some((o) => o.id === highlight)) { setPage(1); return; }
    document.getElementById(`order-${highlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight, loading, data, page]);

  // A new notification arrived (shop accepted / shipped …) → refresh the list
  useEffect(() => {
    window.addEventListener(NOTIFICATION_EVENT, reload);
    return () => window.removeEventListener(NOTIFICATION_EVENT, reload);
  }, [reload]);

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
            <div key={o.id} id={`order-${o.id}`} className={`card scroll-mt-24 p-4 transition-shadow sm:p-5 ${o.id === highlight ? 'ring-2 ring-brand-500 ring-offset-2' : ''}`}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {/* Part name instead of the order number; HSN code(s) in small text under it */}
                  <p className="font-semibold text-slate-800">{orderTitle(o)}</p>
                  {hsnCodes(o) && <p className="text-xs text-slate-500">HSN {hsnCodes(o)}</p>}
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><Store className="h-3 w-3" /> {o.vendor.shopName} · {formatDateTime(o.createdAt)}</p>
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