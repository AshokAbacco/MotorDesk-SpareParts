import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';
import EmptyState from '../../shared/ui/EmptyState.jsx';
import Spinner from '../../shared/ui/Spinner.jsx';
import { formatCurrency } from '../../shared/utils/formatCurrency.js';
import UpiPaymentCard from './components/UpiPaymentCard.jsx';
import { cancelUnpaidOrder, getUpiDetails } from './upiPay.api.js';

/** /pay?orders=id1,id2&app=gpay — one card per shop, each paid to that shop's own UPI ID */
export default function UpiPayPage() {
  const { isLoggedIn } = useAuth();
  const [params] = useSearchParams();
  const ids = (params.get('orders') ?? '').split(',').filter(Boolean);
  const app = params.get('app') ?? 'upi';
  const [cards, setCards] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn || !ids.length) return;
    Promise.all(ids.map((id) => getUpiDetails(id).then((r) => r.data)))
      .then(setCards)
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, params.get('orders')]);

  if (!isLoggedIn) return <Navigate to={`/login?next=${encodeURIComponent(`/pay?${params}`)}`} replace />;
  if (!ids.length) return <EmptyState title="Nothing to pay" action={<Link to="/my-orders" className="text-brand-600">My orders</Link>} />;
  if (error) return <EmptyState title="Could not load payment details" description={error} action={<Link to="/my-orders" className="text-brand-600">My orders</Link>} />;
  if (!cards) return <div className="py-24"><Spinner label="Loading payment details…" /></div>;

  const update = (orderId, patch) => setCards((cs) => cs.map((c) => (c.orderId === orderId ? { ...c, ...patch } : c)));
  const onSubmitted = (order) => update(order.id, { upiRef: order.upiRef, status: order.status, paymentStatus: order.paymentStatus });
  const onCancel = async (d) => {
    if (!window.confirm(`Cancel order #${d.orderNumber} from ${d.shopName}?`)) return;
    try { await cancelUnpaidOrder(d.orderId); toast.success('Order cancelled'); setCards((cs) => cs.filter((c) => c.orderId !== d.orderId)); } catch (e) { toast.error(e.message); }
  };

  const pending = cards.filter((c) => !c.upiRef && c.status === 'AWAITING_PAYMENT');
  const total = pending.reduce((n, c) => n + c.amount, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <div>
        <h1 className="page-title">{pending.length ? 'Complete your UPI payment' : 'All payments submitted'}</h1>
        <p className="text-sm text-slate-500">
          {pending.length
            ? `${pending.length} payment${pending.length > 1 ? 's' : ''} · ${formatCurrency(total)} in total. Each shop is paid directly to its own UPI account.`
            : 'The shops will confirm your payments and start packing. You can track everything in My orders.'}
        </p>
      </div>

      {cards.length === 0 && <EmptyState title="No orders left to pay" />}
      {cards.map((c) => <UpiPaymentCard key={c.orderId} details={c} preferredApp={app} onSubmitted={onSubmitted} onCancel={onCancel} />)}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <p className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Only pay the exact amount shown, to the UPI ID shown.</p>
        <Link to="/my-orders" className="text-sm font-medium text-brand-600 hover:underline">Go to my orders →</Link>
      </div>
    </div>
  );
}