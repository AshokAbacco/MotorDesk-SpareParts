import { Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import Modal from '../../../shared/ui/Modal.jsx';

/** api = { update(id, body), adjust(id, change), remove(id) } */
export default function EditInventoryModal({ item, onClose, onSaved, api }) {
  const [form, setForm] = useState({});
  const [change, setChange] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({ costPrice: Number(item.costPrice), price: Number(item.price), mrp: Number(item.mrp), lowStockThreshold: item.lowStockThreshold, isListed: item.isListed });
      setChange('');
    }
  }, [item]);
  if (!item) return null;

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const run = async (fn, msg) => {
    setSaving(true);
    try { await fn(); toast.success(msg); onSaved(); onClose(); } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const save = () => run(async () => {
    await api.update(item.id, { ...form, costPrice: Number(form.costPrice), price: Number(form.price), mrp: Number(form.mrp), lowStockThreshold: Number(form.lowStockThreshold) });
    if (Number(change)) await api.adjust(item.id, Number(change));
  }, 'Inventory updated');

  const remove = () => window.confirm(`Remove ${item.product.name} from inventory?`) && run(() => api.remove(item.id), 'Removed from inventory');

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title={item.product.name}
      footer={
        <>
          <Button variant="ghost" icon={Trash2} onClick={remove} className="mr-auto text-red-600">Remove</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>Save</Button>
        </>
      }
    >
      <p className="mb-4 font-mono text-xs text-slate-500">OEM {item.product.oemNumber} · GST {Number(item.product.gstRate)}%</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Cost price" name="costPrice" type="number" min="0" step="0.01" value={form.costPrice ?? ''} onChange={set} hint="Your purchase cost" />
        <Input label="Selling price" name="price" type="number" min="0" step="0.01" value={form.price ?? ''} onChange={set} hint="Excl. GST" />
        <Input label="MRP" name="mrp" type="number" min="0" step="0.01" value={form.mrp ?? ''} onChange={set} hint="Incl. GST" />
      </div>

      <div className="mt-5 rounded-lg bg-slate-50 p-4">
        <p className="label">Adjust stock <span className="font-normal text-slate-500">(current: {item.stock})</span></p>
        <div className="flex items-center gap-2">
          <button onClick={() => setChange(String((Number(change) || 0) - 1))} className="rounded-lg border border-slate-300 bg-white p-2" aria-label="Decrease"><Minus className="h-4 w-4" /></button>
          <input type="number" className="field w-28 text-center" value={change} onChange={(e) => setChange(e.target.value)} placeholder="+/- qty" aria-label="Stock change" />
          <button onClick={() => setChange(String((Number(change) || 0) + 1))} className="rounded-lg border border-slate-300 bg-white p-2" aria-label="Increase"><Plus className="h-4 w-4" /></button>
          {Number(change) !== 0 && change !== '' && <span className="text-sm text-slate-600">→ new stock {item.stock + Number(change)}</span>}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input label="Low stock alert at" name="lowStockThreshold" type="number" min="0" value={form.lowStockThreshold ?? ''} onChange={set} />
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input type="checkbox" name="isListed" checked={Boolean(form.isListed)} onChange={set} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
          Show on marketplace
        </label>
      </div>
    </Modal>
  );
}
