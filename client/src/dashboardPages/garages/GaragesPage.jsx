// client/src/dashboardPages/garages/GaragesPage.jsx
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useDebounce from '../../shared/hooks/useDebounce.js';
import useFetch from '../../shared/hooks/useFetch.js';
import Button from '../../shared/ui/Button.jsx';
import Input from '../../shared/ui/Input.jsx';
import Modal from '../../shared/ui/Modal.jsx';
import Pagination from '../../shared/ui/Pagination.jsx';
import Select from '../../shared/ui/Select.jsx';
import { INDIAN_STATES } from '../../shared/utils/constants.js';
import GarageList from './components/GarageList.jsx';
import { createGarage, deleteGarage, getGarages, updateGarage } from './garages.api.js';

const EMPTY = { name: '', ownerName: '', phone: '', gstin: '', address: '', state: '' };

export default function GaragesPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | 'new' | garage
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const query = useDebounce(q);

  const params = { page, ...(query && { q: query }) };
  const { data, meta, loading, reload } = useFetch(() => getGarages(params), [JSON.stringify(params)]);

  const openForm = (g) => {
    setEditing(g ?? 'new');
    setForm(g ? { ...EMPTY, ...Object.fromEntries(Object.entries(g).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])) } : EMPTY);
  };
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
    try {
      if (editing === 'new') await createGarage(body); else await updateGarage(editing.id, body);
      toast.success('Garage saved');
      setEditing(null);
      reload();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const onDelete = async (g) => {
    if (!window.confirm(`Delete ${g.name}?`)) return;
    try { await deleteGarage(g.id); toast.success('Garage deleted'); reload(); } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Garages (B2B)</h1>
          <p className="text-sm text-slate-500">Mechanics and workshops that buy from you regularly. Pick them at POS to print their details on the bill.</p>
        </div>
        <Button icon={Plus} onClick={() => openForm(null)}>Add garage</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input icon={Search} className="w-full sm:w-72" placeholder="Name or phone" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search garages" />
      </div>

      <GarageList rows={data ?? []} loading={loading} onEdit={openForm} onDelete={onDelete} />
      <Pagination meta={meta} onPageChange={setPage} />

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add garage' : 'Edit garage'}>
        <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
          <Input className="sm:col-span-2" label="Garage name" name="name" value={form.name} onChange={set} required />
          <Input label="Owner" name="ownerName" value={form.ownerName} onChange={set} />
          <Input label="Mobile" name="phone" value={form.phone} onChange={set} maxLength={10} required />
          <Input label="GSTIN" name="gstin" value={form.gstin} onChange={set} maxLength={15} />
          <Select label="State" name="state" value={form.state} onChange={set} options={INDIAN_STATES} placeholder="Same as shop" />
          <Input className="sm:col-span-2" label="Address" name="address" value={form.address} onChange={set} />
          <div className="flex items-end justify-end gap-2 sm:col-span-2">
            <Button variant="secondary" type="button" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}