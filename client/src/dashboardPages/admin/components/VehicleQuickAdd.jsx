// client/src/dashboardPages/admin/components/VehicleQuickAdd.jsx
import { Plus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import { addVehicleRange } from '../products.api.js';

const THIS_YEAR = new Date().getFullYear();
const same = (a = '', b = '') => a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Inline "Add new brand" / "Add new model" panel inside Vehicle fitment (ProductForm).
 * Saves brand + model + years to the vehicle list (shared by all dropdowns) and returns the new rows.
 *
 * mode: 'brand' → new brand with its first model · 'model' → new model under `brand`
 * onAdded({ brand, model, vehicles }) is called after saving
 */
export default function VehicleQuickAdd({ mode, type, brand = '', brands = [], models = [], onAdded, onCancel }) {
  const [form, setForm] = useState({ brand: mode === 'model' ? brand : '', model: '', yearFrom: THIS_YEAR - 5, yearTo: THIS_YEAR });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Warn before creating something that already exists (the server re-uses it anyway)
  const existingBrand = mode === 'brand' && brands.find((b) => same(b, form.brand));
  const existingModel = mode === 'model' && models.find((m) => same(m, form.model));
  const kind = type === 'BIKE' ? 'bike' : 'car';

  const save = async () => {
    setErrors({});
    setSaving(true);
    try {
      const res = await addVehicleRange({ type, brand: form.brand, model: form.model, yearFrom: Number(form.yearFrom), yearTo: Number(form.yearTo) });
      toast.success(res.message || 'Saved');
      onAdded(res.data);
    } catch (err) {
      if (err.errors?.length) setErrors(Object.fromEntries(err.errors.map((x) => [x.field.replace('body.', ''), x.message])));
      toast.error(err.errors?.[0]?.message || err.message);
    } finally { setSaving(false); }
  };

  // Not a <form>: this sits inside the product <form>, and nested forms aren't allowed
  const onKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } };

  return (
    <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/50 p-3" onKeyDown={onKeyDown}>
      <p className="mb-2 text-sm font-semibold text-slate-800">
        {mode === 'brand' ? `Add a new ${kind} brand` : `Add a new model to ${brand}`}
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        {mode === 'brand' && (
          <Input label="Brand" name="brand" value={form.brand} onChange={set} placeholder={type === 'BIKE' ? 'KTM' : 'Kia'} error={errors.brand}
            hint={existingBrand ? `"${existingBrand}" already exists — the model will be added under it` : undefined} autoFocus maxLength={40} />
        )}
        <Input className={mode === 'brand' ? '' : 'sm:col-span-2'} label="Model" name="model" value={form.model} onChange={set} placeholder={type === 'BIKE' ? 'Duke 200' : 'Seltos'}
          error={errors.model} hint={existingModel ? `"${existingModel}" already exists — only missing years will be added` : undefined} autoFocus={mode === 'model'} maxLength={40} />
        <Input label="From year" name="yearFrom" type="number" min={1980} max={THIS_YEAR + 1} value={form.yearFrom} onChange={set} error={errors.yearFrom} />
        <Input label="To year" name="yearTo" type="number" min={1980} max={THIS_YEAR + 1} value={form.yearTo} onChange={set} error={errors.yearTo} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Saved for everyone — it will show in the brand & model lists from now on.</p>
        <div className="flex shrink-0 gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="button" size="sm" icon={Plus} loading={saving} onClick={save} disabled={!form.model.trim() || (mode === 'brand' && !form.brand.trim())}>
            {mode === 'brand' ? 'Add brand' : 'Add model'}
          </Button>
        </div>
      </div>
    </div>
  );
}