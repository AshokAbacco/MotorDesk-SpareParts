// client/src/dashboardPages/garages/GaragesPage.jsx
import { AlertTriangle, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
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

const EMPTY = { name: '', ownerName: '', phone: '', email: '', gstin: '', address: '', state: '' };

// MOTORDESK = garages registered in the MotorDesk Garage CRM (shared by every shop, read-only here)
// OWN       = garages this shop added (private to this shop)
const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'MOTORDESK', label: 'MotorDesk Garage Customers' },
  { key: 'OWN', label: 'Own Garage Customers' },
];

/** Shows a hint if the Garage CRM takes a while (its free server sleeps and needs up to a minute to wake) */
function useSlow(loading, ms = 3000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) { setSlow(false); return undefined; }
    const t = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(t);
  }, [loading, ms]);
  return slow;
}

export default function GaragesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'ALL';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | 'new' | garage
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const query = useDebounce(q);

  const params = { page, source: tab, ...(query && { q: query }) };
  const { data, meta, loading, reload } = useFetch(() => getGarages(params), [JSON.stringify(params)]);
  const slow = useSlow(loading && tab !== 'OWN');
  const crm = meta?.crm;
  const counts = meta?.counts ?? {};

  const switchTab = (key) => { setSearchParams(key === 'ALL' ? {} : { tab: key }, { replace: true }); setPage(1); };

  const openForm = (g) => {
    setEditing(g ?? 'new');
    setForm(g ? { ...EMPTY, ...Object.fromEntries(Object.entries(g).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])) } : EMPTY);
  };
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    // New garage: skip empty fields · Edit: send '' for email / GSTIN so clearing them works
    const body = Object.fromEntries(Object.entries(form).filter(([k, v]) => v !== '' || (editing !== 'new' && (k === 'email' || k === 'gstin'))));
    try {
      if (editing === 'new') await createGarage(body); else await updateGarage(editing.id, body);
      toast.success(editing === 'new' ? 'Garage added to your own garages' : 'Garage saved');
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
          <p className="text-sm text-slate-500">Mechanics and workshops that buy from you. Pick them at POS to print their details on the bill.</p>
        </div>
        <Button icon={Plus} onClick={() => openForm(null)}>Add garage</Button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {TABS.map((t) => {
          const n = counts[t.key];
          return (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => switchTab(t.key)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.label}
              {n != null && <span className={`rounded-full px-2 py-0.5 text-xs ${tab === t.key ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input icon={Search} className="w-full sm:w-72" placeholder="Name, phone, email or GSTIN" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search garages" />
        <p className="text-xs text-slate-500">
          {tab === 'MOTORDESK' && 'Registered on the MotorDesk Garage CRM — available to every shop. Details are managed in the CRM.'}
          {tab === 'OWN' && 'Garages you added. Only your shop can see these.'}
        </p>
      </div>

      {slow && (
        <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading MotorDesk garages from the Garage CRM… the first load can take up to a minute.
        </p>
      )}
      {!loading && tab !== 'OWN' && crm && !crm.ok && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {!crm.connected ? 'MotorDesk Garage CRM is not connected yet — only your own garages are shown.'
              : crm.stale ? `Couldn't refresh MotorDesk garages (${crm.message}). Showing the last list we got.`
                : `Couldn't load MotorDesk garages: ${crm.message}`}
          </span>
          {crm.connected && <Button size="sm" variant="secondary" icon={RefreshCw} onClick={reload}>Try again</Button>}
        </div>
      )}

      <GarageList rows={data ?? []} loading={loading} onEdit={openForm} onDelete={onDelete}
        empty={tab === 'OWN' ? 'No own garages yet — add your regular B2B buyers' : tab === 'MOTORDESK' ? 'No MotorDesk garages found' : 'No garages found'} />
      <Pagination meta={meta} onPageChange={setPage} />

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add garage' : 'Edit garage'}>
        <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
          <Input className="sm:col-span-2" label="Garage name" name="name" value={form.name} onChange={set} required />
          <Input label="Owner" name="ownerName" value={form.ownerName} onChange={set} />
          <Input label="Mobile" name="phone" value={form.phone} onChange={set} maxLength={10} required />
          <Input label="Email (optional)" name="email" type="email" value={form.email} onChange={set} />
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