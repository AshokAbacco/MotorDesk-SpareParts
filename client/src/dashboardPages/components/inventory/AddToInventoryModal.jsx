// client/src/dashboardPages/components/inventory/AddToInventoryModal.jsx
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import Modal from '../../../shared/ui/Modal.jsx';

export default function AddToInventoryModal({ product, onClose, onAdded, addFn }) {
  const [form, setForm] = useState({ costPrice: '', price: '', mrp: '', stock: '', lowStockThreshold: 5 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (product) setForm({ costPrice: '', price: '', mrp: '', stock: '', lowStockThreshold: 5 }); }, [product]);
  if (!product) return null;

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const gst = Number(product.gstRate);
  const withGst = form.price ? Number(form.price) * (1 + gst / 100) : 0;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addFn({
        productId: product.id, costPrice: Number(form.costPrice) || 0, price: Number(form.price), mrp: Number(form.mrp),
        stock: Number(form.stock) || 0, lowStockThreshold: Number(form.lowStockThreshold) || 0,
      });
      toast.success(`${product.name} added — find it under “My products”`);
      onAdded?.(product.id);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Add to my inventory">
      <form id="add-inv" onSubmit={submit} className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="font-medium text-slate-800">{product.name}</p>
          <p className="font-mono text-xs text-slate-500">OEM {product.oemNumber} · {product.brand} · GST {gst}%</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Cost price" name="costPrice" type="number" min="0" step="0.01" value={form.costPrice} onChange={set} />
          <Input label="Selling price" name="price" type="number" min="0" step="0.01" value={form.price} onChange={set} required hint={withGst ? `₹${withGst.toFixed(2)} with GST` : 'Excl. GST'} />
          <Input label="MRP" name="mrp" type="number" min="0" step="0.01" value={form.mrp} onChange={set} required />
          <Input label="Opening stock" name="stock" type="number" min="0" value={form.stock} onChange={set} />
          <Input label="Low stock alert" name="lowStockThreshold" type="number" min="0" value={form.lowStockThreshold} onChange={set} />
        </div>
      </form>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="add-inv" loading={saving}>Add part</Button>
      </div>
    </Modal>
  );
}