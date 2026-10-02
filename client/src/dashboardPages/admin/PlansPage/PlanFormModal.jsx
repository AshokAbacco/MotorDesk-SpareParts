import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import Modal from '../../../shared/ui/Modal.jsx';
import { createPlan, updatePlan } from '../plans.api.js';

const EMPTY = { name: '', price: '', durationDays: 30, maxSkus: 500, features: '', isActive: true };

export default function PlanFormModal({ plan, open, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(plan ? { ...plan, price: Number(plan.price), features: plan.features.join('\n') } : EMPTY);
  }, [plan, open]);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: form.name, price: Number(form.price), durationDays: Number(form.durationDays), maxSkus: Number(form.maxSkus), isActive: form.isActive,
      features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
    };
    try {
      if (plan) await updatePlan(plan.id, body); else await createPlan(body);
      toast.success('Plan saved');
      onSaved();
      onClose();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={plan ? `Edit ${plan.name}` : 'New plan'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="plan-form" loading={saving}>Save</Button></>}>
      <form id="plan-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input label="Plan name" name="name" value={form.name} onChange={set} required />
        <Input label="Price (₹)" name="price" type="number" min="0" value={form.price} onChange={set} required />
        <Input label="Duration (days)" name="durationDays" type="number" min="1" value={form.durationDays} onChange={set} required />
        <Input label="Max SKUs" name="maxSkus" type="number" min="1" value={form.maxSkus} onChange={set} required />
        <div className="sm:col-span-2">
          <label className="label" htmlFor="features">Features (one per line)</label>
          <textarea id="features" name="features" rows={4} className="field" value={form.features} onChange={set} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="isActive" checked={form.isActive} onChange={set} className="h-4 w-4 rounded border-slate-300" /> Visible to shops
        </label>
      </form>
    </Modal>
  );
}
