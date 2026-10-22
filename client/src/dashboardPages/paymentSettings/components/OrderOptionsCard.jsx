// Shop-controlled order options shown to customers at checkout (website + Motor Konnect app)
import { Banknote, Save, Store, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useFetch from '../../../shared/hooks/useFetch.js';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import { getOrderSettings, saveOrderSettings } from '../paymentSettings.api.js';

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function Row({ icon: Icon, title, text, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <div>
          <p className="font-medium text-slate-800">{title}</p>
          <p className="text-sm text-slate-500">{text}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function OrderOptionsCard() {
  const { data, loading, reload } = useFetch(getOrderSettings, []);
  const [form, setForm] = useState({ codEnabled: true, deliveryEnabled: true, deliveryCharge: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({ codEnabled: data.codEnabled, deliveryEnabled: data.deliveryEnabled, deliveryCharge: data.deliveryCharge ?? 0 });
  }, [data]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const dirty = data && (data.codEnabled !== form.codEnabled || data.deliveryEnabled !== form.deliveryEnabled || Number(data.deliveryCharge) !== Number(form.deliveryCharge));

  const save = async () => {
    setSaving(true);
    try {
      await saveOrderSettings({ ...form, deliveryCharge: Number(form.deliveryCharge) || 0 });
      toast.success('Order options saved');
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return null;

  return (
    <div className="card p-5">
      <p className="font-semibold text-slate-800">Order options</p>
      <p className="text-sm text-slate-500">Choose how customers can get and pay for your parts. Checkout only shows what you allow.</p>

      <div className="mt-2 divide-y divide-slate-100">
        <Row icon={Truck} title="Delivery" text={form.deliveryEnabled ? 'You deliver orders to the customer’s address.' : 'Off — customers can only pick up from your shop.'}>
          <Switch checked={form.deliveryEnabled} onChange={set('deliveryEnabled')} label="Delivery" />
        </Row>

        {form.deliveryEnabled && (
          <div className="pb-3 pl-8">
            <Input
              label="Delivery charge (₹)"
              type="number"
              min={0}
              max={5000}
              value={form.deliveryCharge}
              onChange={(e) => set('deliveryCharge')(e.target.value)}
              hint="Flat amount added to each delivery order. Use 0 for free delivery."
            />
          </div>
        )}

        <Row
          icon={Banknote}
          title="Cash on delivery"
          text={form.deliveryEnabled ? (form.codEnabled ? 'Customers can pay cash when the order is delivered.' : 'Off — delivery orders must be paid by UPI.') : 'Applies to delivery orders. Turn Delivery on to use it.'}
        >
          <Switch checked={form.codEnabled} onChange={set('codEnabled')} label="Cash on delivery" />
        </Row>

        <Row icon={Store} title="Store pickup" text="Always available. Customers can pay at your shop or by UPI.">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Always on</span>
        </Row>
      </div>

      {data && !data.upiEnabled && !form.codEnabled && form.deliveryEnabled && (
        <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          With Cash on delivery off, delivery orders can only be paid by UPI — add your UPI details below.
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <Button icon={Save} loading={saving} disabled={!dirty} onClick={save}>Save order options</Button>
      </div>
    </div>
  );
}
