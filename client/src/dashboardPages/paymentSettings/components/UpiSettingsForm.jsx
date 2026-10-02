import { Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';

export default function UpiSettingsForm({ initial, onSave, onRemove, saving }) {
  const [form, setForm] = useState({ upiId: '', upiName: '', upiNumber: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm({ upiId: initial?.upiId ?? '', upiName: initial?.upiName ?? initial?.shopName ?? '', upiNumber: initial?.upiNumber ?? '' });
  }, [initial]);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    const err = await onSave(form);
    if (err?.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field.split('.').pop(), x.message])));
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div>
        <p className="font-semibold text-slate-800">UPI details</p>
        <p className="text-sm text-slate-500">Customers who choose UPI at checkout pay this account directly — the money comes straight to you.</p>
      </div>
      <Input label="UPI ID" name="upiId" value={form.upiId} onChange={set} error={errors.upiId} placeholder="yourshop@okicici" hint="Find it in Google Pay / PhonePe / Paytm → Profile" required />
      <Input label="Account holder name" name="upiName" value={form.upiName} onChange={set} error={errors.upiName} hint="Shown to customers in their UPI app" required />
      <Input label="UPI mobile number (optional)" name="upiNumber" value={form.upiNumber} onChange={set} error={errors.upiNumber} maxLength={10} placeholder="9876543210" hint="Customers can also pay to this number" />
      <div className="flex flex-wrap justify-between gap-2">
        {initial?.upiId ? <Button type="button" variant="ghost" icon={Trash2} className="text-red-600" onClick={onRemove}>Remove UPI</Button> : <span />}
        <Button type="submit" icon={Save} loading={saving}>Save UPI details</Button>
      </div>
    </form>
  );
}