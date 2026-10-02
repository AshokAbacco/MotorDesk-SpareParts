// client/src/dashboardPages/customers/components/CustomerFormModal.jsx
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import Modal from '../../../shared/ui/Modal.jsx';
import Select from '../../../shared/ui/Select.jsx';
import { INDIAN_STATES } from '../../../shared/utils/constants.js';
import { createCustomer, updateCustomer } from '../customers.api.js';

const EMPTY = { name: '', email: '', phone: '', password: '', line1: '', landmark: '', city: '', state: '', pincode: '' };

/** Readable random password, e.g. "Kite-4827-Rain" */
function suggestPassword() {
  const words = ['Kite', 'Rain', 'Gear', 'Road', 'Moon', 'Star', 'Wheel', 'Spark', 'River', 'Cloud'];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  return `${pick()}-${Math.floor(1000 + Math.random() * 9000)}-${pick()}`;
}

/**
 * Admin → Customers: one form for both "Add customer" and "Edit customer".
 * customer = null → add · customer = row from the list → edit (password only changes if "Reset password" is ticked;
 * the address fields edit the customer's default address, other saved addresses are kept).
 */
export default function CustomerFormModal({ open, customer, onClose, onSaved }) {
  const isEdit = Boolean(customer);
  const [form, setForm] = useState(EMPTY);
  const [withAddress, setWithAddress] = useState(false);
  const [resetPw, setResetPw] = useState(false);
  const [showPw, setShowPw] = useState(true);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setShowPw(true);
    setResetPw(false);
    if (customer) {
      const a = customer.defaultAddress;
      setForm({ ...EMPTY, name: customer.name, email: customer.email, phone: customer.phone ?? '', ...(a ?? {}) });
      setWithAddress(Boolean(a));
    } else {
      setForm({ ...EMPTY, password: suggestPassword() });
      setWithAddress(false);
    }
  }, [open, customer]);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const askPassword = !isEdit || resetPw;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    const body = {
      name: form.name, email: form.email, phone: form.phone,
      ...(askPassword && { password: form.password }),
      ...(withAddress && { address: { line1: form.line1, landmark: form.landmark, city: form.city, state: form.state, pincode: form.pincode } }),
    };
    try {
      if (isEdit) {
        const res = await updateCustomer(customer.id, body);
        toast.success(res.message || `${form.name} updated`);
      } else {
        const res = await createCustomer(body);
        toast.success(`${res.data.name} added — they can log in with ${res.data.email}`);
      }
      onSaved();
      onClose();
    } catch (err) {
      // "body.address.city" → "city", "body.email" → "email"
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field.split('.').pop(), x.message])));
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleReset = (checked) => {
    setResetPw(checked);
    setForm((f) => ({ ...f, password: checked ? suggestPassword() : '' }));
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit customer' : 'Add customer'} size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="customer-form" loading={saving}>{isEdit ? 'Save changes' : 'Add customer'}</Button>
        </>
      )}>
      <form id="customer-form" onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input className="sm:col-span-2" label="Full name" name="name" value={form.name} onChange={set} error={errors.name} required autoFocus />
          <Input label="Email" name="email" type="email" value={form.email} onChange={set} error={errors.email} hint="Used to log in" required />
          <Input label="Mobile (optional)" name="phone" value={form.phone} onChange={set} error={errors.phone} maxLength={10} inputMode="numeric" />
        </div>

        {isEdit && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={resetPw} onChange={(e) => toggleReset(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
            Reset password
          </label>
        )}

        {askPassword && (
          <div>
            <label htmlFor="password" className="label">{isEdit ? 'New password' : 'Password'}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input id="password" name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={set} required minLength={8}
                  className={`field pr-9 font-mono ${errors.password ? 'border-red-400' : ''}`} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600" aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" variant="secondary" icon={RefreshCw} onClick={() => setForm({ ...form, password: suggestPassword() })}>New</Button>
            </div>
            {errors.password
              ? <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              : <p className="mt-1 text-xs text-slate-500">At least 8 characters. Share it with the customer — they can change it later from My Account.</p>}
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={withAddress} onChange={(e) => setWithAddress(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
          {isEdit
            ? (customer?.defaultAddress ? 'Edit default delivery address' : 'Add a delivery address')
            : 'Add a delivery address now (optional)'}
        </label>

        {withAddress && (
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <Input className="sm:col-span-2" label="House / street" name="line1" value={form.line1} onChange={set} error={errors.line1} required />
            <Input label="Landmark (optional)" name="landmark" value={form.landmark} onChange={set} error={errors.landmark} />
            <Input label="City" name="city" value={form.city} onChange={set} error={errors.city} required />
            <Select label="State" name="state" value={form.state} onChange={set} options={INDIAN_STATES} placeholder="Select state" error={errors.state} required />
            <Input label="Pincode" name="pincode" value={form.pincode} onChange={set} error={errors.pincode} maxLength={6} inputMode="numeric" required />
            {isEdit && customer?.addressCount > 1 && (
              <p className="text-xs text-slate-500 sm:col-span-2">This customer has {customer.addressCount} saved addresses — only the default one is changed here.</p>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}