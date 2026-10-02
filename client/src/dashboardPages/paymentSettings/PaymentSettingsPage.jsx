import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useFetch from '../../shared/hooks/useFetch.js';
import Spinner from '../../shared/ui/Spinner.jsx';
import UpiQrCard from './components/UpiQrCard.jsx';
import UpiSettingsForm from './components/UpiSettingsForm.jsx';
import { getUpiSettings, removeUpiSettings, saveUpiSettings } from './paymentSettings.api.js';

export default function PaymentSettingsPage() {
  const { data, loading, reload } = useFetch(getUpiSettings, []);
  const [saving, setSaving] = useState(false);

  const onSave = async (form) => {
    setSaving(true);
    try {
      await saveUpiSettings({ ...form, upiNumber: form.upiNumber || '' });
      toast.success('UPI details saved — customers can now pay you by UPI');
      reload();
      return null;
    } catch (err) {
      toast.error(err.message);
      return err;
    } finally {
      setSaving(false);
    }
  };
  const onRemove = async () => {
    if (!window.confirm('Remove your UPI details? Customers will only be able to choose Cash on delivery for your parts.')) return;
    try { await removeUpiSettings(); toast.success('UPI details removed'); reload(); } catch (e) { toast.error(e.message); }
  };

  if (loading) return <div className="py-24"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Online payment settings</h1>
        <p className="text-sm text-slate-500">Receive marketplace payments directly into your own UPI account.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <UpiSettingsForm initial={data} onSave={onSave} onRemove={onRemove} saving={saving} />
          <div className="card space-y-2 p-5 text-sm text-slate-600">
            <p className="flex items-center gap-2 font-semibold text-slate-800"><ShieldCheck className="h-4 w-4 text-emerald-600" /> How UPI orders work</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>The customer chooses UPI, Google Pay, PhonePe or Paytm at checkout and pays your UPI ID.</li>
              <li>They enter the UPI reference number (UTR) from their app.</li>
              <li>The order appears in <b>Online orders</b> with that reference. Check your UPI / bank app, then tap <b>Payment received</b>.</li>
              <li>If the money didn’t arrive, tap <b>Not received</b> — the order is cancelled and stock returns to your inventory.</li>
            </ol>
          </div>
        </div>
        <UpiQrCard settings={data} />
      </div>
    </div>
  );
}