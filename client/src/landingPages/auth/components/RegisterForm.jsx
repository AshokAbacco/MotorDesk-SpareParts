// client/src/landingPages/auth/components/RegisterForm.jsx
import { BadgeCheck, CreditCard, Eye, EyeOff, ShoppingBag, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../shared/axiosInstance.js';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { getPaidSignup } from '../../pricing/pricing.api.js';
import { INDIAN_STATES } from '../../../shared/utils/constants.js';
import { INVENTORY_TYPE_OPTIONS } from '../../../shared/utils/inventoryType.js';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import Select from '../../../shared/ui/Select.jsx';
import { homeForRole, useAuthStore } from '../../store/authStore.js';
import { register } from '../register.api.js';

const MIN_PASSWORD = 6;

/** Password box with a show / hide eye button */
function PasswordField({ label, name, value, onChange, error, hint, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <div className="relative">
        <input id={name} name={name} type={show ? 'text' : 'password'} value={value} onChange={onChange} required
          minLength={MIN_PASSWORD} autoComplete={autoComplete} aria-invalid={Boolean(error)}
          className={`field pr-10 ${error ? 'border-red-400' : ''}`} />
        <button type="button" onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} title={show ? 'Hide' : 'Show'}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const ROLES = [
  { value: 'CUSTOMER', label: 'I want to buy parts', icon: ShoppingBag },
  { value: 'VENDOR', label: 'I own a parts shop', icon: Store },
];

export default function RegisterForm() {
  const [form, setForm] = useState({ role: 'CUSTOMER', name: '', email: '', phone: '', password: '', confirmPassword: '', shopName: '', inventoryType: '', gstin: '', addressLine: '', city: '', state: '', pincode: '' });
  // Shops buy a plan on /pricing first; after paying they land here with ?signup=<id> and the details prefilled
  const [searchParams] = useSearchParams();
  const signupId = searchParams.get('signup');
  const [paid, setPaid] = useState(null);
  const [paymentsOn, setPaymentsOn] = useState(true);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const isVendor = form.role === 'VENDOR';
  const needsPlan = isVendor && paymentsOn && !paid;

  useEffect(() => { api.get('/payments/config').then((r) => setPaymentsOn(Boolean(r.data?.razorpayEnabled))).catch(() => {}); }, []);
  useEffect(() => {
    if (!signupId) return;
    getPaidSignup(signupId)
      .then(({ data }) => {
        setPaid(data);
        setForm((f) => ({
          ...f, role: 'VENDOR', name: data.ownerName, email: data.email, phone: data.phone,
          shopName: data.shopName, gstin: data.gstin ?? '', addressLine: data.address,
        }));
      })
      .catch((err) => toast.error(err.message));
  }, [signupId]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Typing clears that field's error (and the "don't match" error when either password changes)
    if (errors[name] || (name === 'password' && errors.confirmPassword)) {
      setErrors((prev) => ({ ...prev, [name]: undefined, ...(name === 'password' && { confirmPassword: undefined }) }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (form.password.length < MIN_PASSWORD) return setErrors({ password: `Password must be at least ${MIN_PASSWORD} characters` });
    if (form.password !== form.confirmPassword) return setErrors({ confirmPassword: 'Passwords don’t match' });
    setLoading(true);
    // Send only the fields that apply to the chosen role; drop empty optionals
    const payload = Object.fromEntries(
      Object.entries(form).filter(([k, v]) => v !== '' && k !== 'confirmPassword' && (isVendor || !['shopName', 'inventoryType', 'gstin', 'addressLine', 'city', 'state', 'pincode'].includes(k)))
    );
    if (isVendor && paid) payload.signupId = paid.signupId;
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

      {/* Shop owner who hasn't paid yet → buy a plan first */}
      {needsPlan && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4" /> Choose a plan to register your shop</p>
          <p className="mt-1">Shops buy a plan first (Urban ₹500 / Rural ₹350). After paying you come back here with your details filled in.</p>
          <Link to="/pricing" className="mt-3 inline-flex rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">See plans & pricing</Link>
        </div>
      )}
      {isVendor && paid && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p><b>{paid.plan?.name}</b> paid ({formatCurrency(paid.amount ?? paid.plan?.price)}). Your shop details are filled in — add a password and what you sell to finish. The payment invoice is emailed to <b>{paid.email}</b>.</p>
        </div>
      )}

      {!needsPlan && (<>
      <Input label="Full name" name="name" value={form.name} onChange={onChange} error={errors.name} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Email" name="email" type="email" value={form.email} onChange={onChange} error={errors.email} required
          readOnly={isVendor && Boolean(paid)} hint={isVendor && paid ? 'The email you paid with' : undefined} />
        <Input label={`Mobile${isVendor ? '' : ' (optional)'}`} name="phone" value={form.phone} onChange={onChange} error={errors.phone} maxLength={10} required={isVendor} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField label="Password" name="password" value={form.password} onChange={onChange} error={errors.password} hint={`At least ${MIN_PASSWORD} characters`} autoComplete="new-password" />
        <PasswordField label="Confirm password" name="confirmPassword" value={form.confirmPassword} onChange={onChange} autoComplete="new-password"
          error={errors.confirmPassword || (form.confirmPassword && form.password !== form.confirmPassword ? 'Passwords don’t match' : undefined)}
          hint={form.confirmPassword && form.password === form.confirmPassword ? '✓ Passwords match' : undefined} />
      </div>

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
            <Input className="sm:col-span-2" label="Shop address" name="addressLine" value={form.addressLine} onChange={onChange} error={errors.addressLine} />
            <Input label="GSTIN (optional)" name="gstin" value={form.gstin} onChange={onChange} error={errors.gstin} maxLength={15} />
            <Input label="City" name="city" value={form.city} onChange={onChange} />
            <Select label="State" name="state" value={form.state} onChange={onChange} options={INDIAN_STATES} placeholder="Select state" error={errors.state} required />
            <Input label="Pincode" name="pincode" value={form.pincode} onChange={onChange} error={errors.pincode} maxLength={6} />
          </div>
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full">{isVendor ? 'Create shop account' : 'Create account'}</Button>
      </>)}
      <p className="text-center text-sm text-slate-600">
        Already registered? <Link to="/login" className="font-medium text-brand-600 hover:underline">Log in</Link>
      </p>
    </form>
  );
}