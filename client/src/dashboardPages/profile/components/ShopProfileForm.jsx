// client/src/dashboardPages/profile/components/ShopProfileForm.jsx
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useAuth from '../../../shared/hooks/useAuth.js';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import Select from '../../../shared/ui/Select.jsx';
import Spinner from '../../../shared/ui/Spinner.jsx';
import { INDIAN_STATES } from '../../../shared/utils/constants.js';
import { INVENTORY_TYPE_OPTIONS } from '../../../shared/utils/inventoryType.js';
import { useAuthStore } from '../../../landingPages/store/authStore.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import { getShop, updateShop } from '../profile.api.js';

const FIELDS = ['shopName', 'inventoryType', 'gstin', 'phone', 'addressLine', 'city', 'state', 'pincode'];

export default function ShopProfileForm() {
  const [shop, setShop] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const refreshMe = useAuthStore((s) => s.refreshMe);

  useEffect(() => {
    getShop().then((r) => { setShop(r.data); setForm(Object.fromEntries(FIELDS.map((k) => [k, r.data[k] ?? '']))); }).catch((e) => toast.error(e.message));
  }, []);
  if (!shop) return <Spinner />;

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([k, v]) => v !== '' || k === 'gstin'));
      const r = await updateShop(body);
      setShop({ ...shop, ...r.data });
      await refreshMe(); // inventory type change → sidebar updates right away
      toast.success('Shop profile saved');
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={onSave} className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-800">Shop details</p>
          <p className="text-xs text-slate-500">Owner: {user?.name} · {user?.email}</p>
        </div>
        <StatusBadge status={shop.status} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Shop name" name="shopName" value={form.shopName} onChange={set} required />
        <Select label="What you sell" name="inventoryType" value={form.inventoryType} onChange={set} options={INVENTORY_TYPE_OPTIONS} hint="Shows Car and/or Bike menus in the sidebar" />
        <Input label="GSTIN" name="gstin" value={form.gstin} onChange={set} maxLength={15} hint="Printed on every invoice" />
        <Input label="Phone" name="phone" value={form.phone} onChange={set} maxLength={10} />
        <Input label="Address" name="addressLine" value={form.addressLine} onChange={set} />
        <Input label="City" name="city" value={form.city} onChange={set} />
        <Select label="State" name="state" value={form.state} onChange={set} options={INDIAN_STATES} hint="Decides CGST+SGST vs IGST" />
        <Input label="Pincode" name="pincode" value={form.pincode} onChange={set} maxLength={6} />
      </div>
      <div className="flex justify-end"><Button type="submit" loading={saving}>Save changes</Button></div>
    </form>
  );
}