// client/src/landingPages/checkout/components/AddressForm.jsx
import { Briefcase, Home, MapPin } from 'lucide-react';
import Input from '../../../shared/ui/Input.jsx';
import Select from '../../../shared/ui/Select.jsx';
import { INDIAN_STATES } from '../../../shared/utils/constants.js';

export const EMPTY_ADDRESS = { label: 'Home', name: '', phone: '', line1: '', landmark: '', city: '', state: '', pincode: '' };
const LABELS = [['Home', Home], ['Work', Briefcase], ['Other', MapPin]];

/** Controlled address fields. Used in My Account (address book) and at checkout. */
export default function AddressForm({ value, onChange, errors = {} }) {
  const set = (e) => onChange({ ...value, [e.target.name]: e.target.value });
  const isPreset = LABELS.some(([l]) => l === value.label);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <p className="label">Save as</p>
        <div className="flex flex-wrap gap-2">
          {LABELS.map(([l, Icon]) => (
            <button type="button" key={l} onClick={() => onChange({ ...value, label: l })}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${value.label === l || (l === 'Other' && !isPreset) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              <Icon className="h-3.5 w-3.5" /> {l}
            </button>
          ))}
          {!isPreset || value.label === 'Other' ? (
            <input name="label" value={value.label === 'Other' ? '' : value.label} onChange={(e) => onChange({ ...value, label: e.target.value || 'Other' })}
              placeholder="e.g. Parents, Garage" maxLength={20} className="field w-44 py-1" aria-label="Custom label" />
          ) : null}
        </div>
      </div>
      <Input label="Full name" name="name" value={value.name} onChange={set} error={errors.name} required />
      <Input label="Mobile" name="phone" value={value.phone} onChange={set} error={errors.phone} maxLength={10} inputMode="numeric" required />
      <Input className="sm:col-span-2" label="Address" name="line1" value={value.line1} onChange={set} error={errors.line1} placeholder="House / flat no, building, street, area" required />
      <Input className="sm:col-span-2" label="Landmark (optional)" name="landmark" value={value.landmark ?? ''} onChange={set} error={errors.landmark} placeholder="e.g. Near bus stand" />
      <Input label="City" name="city" value={value.city} onChange={set} error={errors.city} required />
      <Select label="State" name="state" value={value.state} onChange={set} options={INDIAN_STATES} placeholder="Select state" error={errors.state} required />
      <Input label="Pincode" name="pincode" value={value.pincode} onChange={set} error={errors.pincode} maxLength={6} inputMode="numeric" required />
    </div>
  );
}

/** One-line / multi-line display of an address */
export const addressLines = (a) => [
  a.line1,
  a.landmark ? `Near ${a.landmark}` : null,
  `${a.city}, ${a.state} – ${a.pincode}`,
].filter(Boolean);