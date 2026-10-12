// client/src/landingPages/pricing/components/SignupPaymentModal.jsx
import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import Modal from '../../../shared/ui/Modal.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { openRazorpayCheckout } from '../../../shared/utils/razorpay.js';
import { startSignupPayment, verifySignupPayment } from '../pricing.api.js';

const EMPTY = { shopName: '', ownerName: '', email: '', phone: '', address: '', gstin: '' };

/**
 * "Buy" → shop details → Razorpay.
 * The details are saved only after Razorpay confirms the payment; then the owner goes to the
 * register page with everything filled in. Cancelled / failed payment → nothing is saved.
 */
export default function SignupPaymentModal({ plan, onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState('form'); // form | paying | verifying

  useEffect(() => { if (plan) { setErrors({}); setStep('form'); } }, [plan]);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const busy = step !== 'form';

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setStep('paying');
    try {
      const checkout = await startSignupPayment({ ...form, planId: plan.id });
      const result = await openRazorpayCheckout(checkout.data);
      if (result.status !== 'success') {
        toast(result.error ? `Payment failed: ${result.error}. Nothing was saved — you can try again.` : 'Payment cancelled — nothing was saved.', { icon: 'ℹ️', duration: 5000 });
        setStep('form');
        return;
      }
      setStep('verifying');
      const paid = await verifySignupPayment(result.response);
      toast.success(`Payment successful! Your invoice is being emailed to ${form.email}. Now create your shop account.`, { duration: 6000 });
      onClose();
      navigate(`/register?signup=${paid.data.signupId}`);
    } catch (err) {
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field.split('.').pop(), x.message])));
      toast.error(err.message);
      setStep('form');
    }
  };

  return (
    <Modal open={Boolean(plan)} onClose={busy ? undefined : onClose} title={plan ? `Buy ${plan.name}` : ''} size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="signup-pay" loading={busy} icon={Lock}>
            {step === 'verifying' ? 'Confirming payment…' : `Pay ${plan ? formatCurrency(plan.price) : ''}`}
          </Button>
        </>
      )}>
      {plan && (
        <form id="signup-pay" onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
            <span><b>{plan.name}</b> · {plan.durationDays} days</span>
            <span className="font-semibold">{formatCurrency(plan.price)}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input className="sm:col-span-2" label="Shop name" name="shopName" value={form.shopName} onChange={set} error={errors.shopName} required autoFocus disabled={busy} />
            <Input label="Owner name" name="ownerName" value={form.ownerName} onChange={set} error={errors.ownerName} required disabled={busy} />
            <Input label="Phone" name="phone" value={form.phone} onChange={set} error={errors.phone} maxLength={10} inputMode="numeric" required disabled={busy} />
            <Input className="sm:col-span-2" label="Email" name="email" type="email" value={form.email} onChange={set} error={errors.email} hint="You’ll log in with this email" required disabled={busy} />
            <Input className="sm:col-span-2" label="Shop address" name="address" value={form.address} onChange={set} error={errors.address} required disabled={busy} />
            <Input label="GST number (optional)" name="gstin" value={form.gstin} onChange={set} error={errors.gstin} maxLength={15} disabled={busy} />
          </div>
          <p className="flex items-start gap-2 text-xs text-slate-500">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Secure payment by Razorpay (UPI, card, netbanking). Your details are saved only after the payment succeeds — then you’ll finish creating your shop account.
          </p>
        </form>
      )}
    </Modal>
  );
}