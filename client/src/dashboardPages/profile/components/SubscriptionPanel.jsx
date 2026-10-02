import { Check } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useFetch from '../../../shared/hooks/useFetch.js';
import Button from '../../../shared/ui/Button.jsx';
import Spinner from '../../../shared/ui/Spinner.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { formatDate } from '../../../shared/utils/formatDate.js';
import { openRazorpayCheckout } from '../../../shared/utils/razorpay.js';
import { cancelPlanPayment, getMySubscription, getPlans, subscribeToPlan, verifyPlanPayment } from '../profile.api.js';

export default function SubscriptionPanel() {
  const sub = useFetch(getMySubscription, []);
  const plans = useFetch(getPlans, []);
  const [busy, setBusy] = useState('');

  if (sub.loading || plans.loading) return <Spinner />;
  const active = sub.data?.active;

  const choose = async (plan) => {
    const free = Number(plan.price) <= 0;
    if (!window.confirm(free ? `Switch to the ${plan.name} plan?` : `Pay ${formatCurrency(plan.price)} for the ${plan.name} plan?`)) return;
    setBusy(plan.id);
    try {
      const { data } = await subscribeToPlan(plan.id);
      if (data.payment) {
        const result = await openRazorpayCheckout(data.payment);
        if (result.status === 'dismissed') {
          await cancelPlanPayment(data.payment.paymentId).catch(() => {});
          toast.error(result.error ? `Payment failed: ${result.error}` : 'Payment cancelled — your plan was not changed');
          return;
        }
        await verifyPlanPayment(result.response);
      }
      toast.success(`You are now on the ${plan.name} plan`);
      sub.reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        {active ? (
          <p className="text-sm text-slate-600">Current plan: <span className="font-semibold text-slate-900">{active.plan.name}</span> · up to {active.plan.maxSkus} SKUs · renews/ends {formatDate(active.endDate)}</p>
        ) : (
          <p className="text-sm text-slate-600">No active plan — you are on the free tier (50 SKUs).</p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {(plans.data ?? []).map((p) => {
          const current = active?.planId === p.id;
          return (
            <div key={p.id} className={`card flex flex-col p-5 ${current ? 'ring-2 ring-brand-500' : ''}`}>
              <p className="font-semibold text-slate-800">{p.name}</p>
              <p className="mt-1 text-2xl font-semibold">{formatCurrency(p.price)}<span className="text-sm font-normal text-slate-500"> / {p.durationDays} days</span></p>
              <ul className="mt-3 flex-1 space-y-1 text-sm text-slate-600">
                {p.features.map((f) => <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> {f}</li>)}
              </ul>
              <Button className="mt-4" variant={current ? 'secondary' : 'primary'} disabled={current} loading={busy === p.id} onClick={() => choose(p)}>
                {current ? 'Current plan' : Number(p.price) > 0 ? `Pay ${formatCurrency(p.price)}` : 'Choose plan'}
              </Button>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-400">Paid plans are charged through Razorpay and activate as soon as the payment is confirmed.</p>
    </div>
  );
}