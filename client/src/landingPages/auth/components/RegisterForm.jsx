// client/src/landingPages/auth/components/RegisterForm.jsx
import { ShoppingBag, Store } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { INDIAN_STATES } from '../../../shared/utils/constants.js';
import { INVENTORY_TYPE_OPTIONS } from '../../../shared/utils/inventoryType.js';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import Select from '../../../shared/ui/Select.jsx';
import { homeForRole, useAuthStore } from '../../store/authStore.js';
import { register } from '../register.api.js';

const ROLES = [
  { value: 'CUSTOMER', label: 'I want to buy parts', icon: ShoppingBag },
  { value: 'VENDOR', label: 'I own a parts shop', icon: Store },
];

export default function RegisterForm() {
  const [form, setForm] = useState({ role: 'CUSTOMER', name: '', email: '', phone: '', password: '', shopName: '', inventoryType: '', gstin: '', city: '', state: '', pincode: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const isVendor = form.role === 'VENDOR';

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    // Send only the fields that apply to the chosen role; drop empty optionals
    const payload = Object.fromEntries(
      Object.entries(form).filter(([k, v]) => v !== '' && (isVendor || !['shopName', 'inventoryType', 'gstin', 'city', 'state', 'pincode'].includes(k)))
    );
    try {
      const res = await register(payload);
      setSession(res.data);
      toast.success(isVendor ? 'Shop registered! Waiting for admin approval.' : 'Account created');
      navigate(homeForRole(res.data.user.role), { replace: true });
    } catch (err) {
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field.replace('body.', ''), x.message])));
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {ROLES.map(({ value, label, icon: Icon }) => (
          <button
            type="button"
            key={value}
            onClick={() => setForm({ ...form, role: value })}
            className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition ${form.role === value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Icon className="h-5 w-5" /> {label}
          </button>
        ))}
      </div>

      <Input label="Full name" name="name" value={form.name} onChange={onChange} error={errors.name} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Email" name="email" type="email" value={form.email} onChange={onChange} error={errors.email} required />
        <Input label={`Mobile${isVendor ? '' : ' (optional)'}`} name="phone" value={form.phone} onChange={onChange} error={errors.phone} maxLength={10} required={isVendor} />
      </div>
      <Input label="Password" name="password" type="password" value={form.password} onChange={onChange} error={errors.password} hint="At least 8 characters" required autoComplete="new-password" />

      {isVendor && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Shop details</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Shop name" name="shopName" value={form.shopName} onChange={onChange} error={errors.shopName} required />
            <Select
              label="Inventory"
              name="inventoryType"
              value={form.inventoryType}
              onChange={onChange}
              options={INVENTORY_TYPE_OPTIONS}
              placeholder="What do you sell?"
              error={errors.inventoryType}
              hint="Decides the Car / Bike menus in your dashboard"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="GSTIN (optional)" name="gstin" value={form.gstin} onChange={onChange} error={errors.gstin} maxLength={15} />
            <Input label="City" name="city" value={form.city} onChange={onChange} />
            <Select label="State" name="state" value={form.state} onChange={onChange} options={INDIAN_STATES} placeholder="Select state" error={errors.state} required />
            <Input label="Pincode" name="pincode" value={form.pincode} onChange={onChange} error={errors.pincode} maxLength={6} />
          </div>
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full">Create account</Button>
      <p className="text-center text-sm text-slate-600">
        Already registered? <Link to="/login" className="font-medium text-brand-600 hover:underline">Log in</Link>
      </p>
    </form>
  );
}