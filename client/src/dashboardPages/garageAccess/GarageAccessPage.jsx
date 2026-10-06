// client/src/dashboardPages/garageAccess/GarageAccessPage.jsx
import { AlertTriangle, BadgeCheck, Eye, EyeOff, Loader2, Mail, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useDebounce from '../../shared/hooks/useDebounce.js';
import Button from '../../shared/ui/Button.jsx';
import Input from '../../shared/ui/Input.jsx';
import Pagination from '../../shared/ui/Pagination.jsx';
import Table from '../../shared/ui/Table.jsx';
import { formatCurrency } from '../../shared/utils/formatCurrency.js';
import { formatDate } from '../../shared/utils/formatDate.js';
import { getGarageAccess, setGarageAccess } from './garageAccess.api.js';

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'VISIBLE', label: 'Shown to shops' },
  { key: 'HIDDEN', label: 'Hidden' },
];

/** On / off switch: green "Shown" ⇄ grey "Hidden" */
function VisibilitySwitch({ on, busy, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={() => onChange(!on)}
      className="inline-flex items-center gap-2 rounded-full disabled:opacity-60"
    >
      <span className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
      <span className={`w-14 text-left text-xs font-medium ${on ? 'text-emerald-700' : 'text-slate-500'}`}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : on ? 'Shown' : 'Hidden'}
      </span>
    </button>
  );
}

/**
 * Admin → MotorDesk Garages.
 * Every garage registered on the MotorDesk Garage CRM is listed here. Shown = shops see it on their
 * Garages (B2B) page and in the POS customer picker; Hidden = no shop sees it. New CRM garages are shown by default.
 */
export default function GarageAccessPage() {
  const [status, setStatus] = useState('ALL');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [busy, setBusy] = useState(new Set()); // crmIds being saved
  const [selected, setSelected] = useState(new Set());
  const query = useDebounce(q);

  const load = async ({ refresh = false } = {}) => {
    setLoading(true);
    const t = setTimeout(() => setSlow(true), 3000);
    try {
      const res = await getGarageAccess({ page, status, ...(query && { q: query }), ...(refresh && { refresh: true }) });
      setRows(res.data);
      setMeta(res.meta);
    } catch (e) {
      toast.error(e.message);
    } finally {
      clearTimeout(t);
      setSlow(false);
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [page, status, query]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSelected(new Set()); }, [page, status, query]);

  const save = async (crmIds, visible) => {
    setBusy((b) => new Set([...b, ...crmIds]));
    // Update the rows straight away; undo if the server says no
    const before = rows;
    setRows((list) => list.map((g) => (crmIds.includes(g.crmId) ? { ...g, isVisible: visible } : g)));
    try {
      const res = await setGarageAccess(crmIds, visible);
      toast.success(res.message);
      setSelected(new Set());
      load(); // refresh counts (and drop rows that no longer match the tab)
    } catch (e) {
      setRows(before);
      toast.error(e.message);
    } finally {
      setBusy((b) => new Set([...b].filter((id) => !crmIds.includes(id))));
    }
  };

  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOnPage = rows.length > 0 && rows.every((g) => selected.has(g.crmId));
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(rows.map((g) => g.crmId)));

  const counts = meta?.counts ?? {};
  const crm = meta?.crm;

  const columns = [
    {
      key: 'select', className: 'w-10',
      header: <input type="checkbox" checked={allOnPage} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300 text-brand-600" aria-label="Select all on this page" />,
      render: (g) => <input type="checkbox" checked={selected.has(g.crmId)} onChange={() => toggleSelect(g.crmId)} className="h-4 w-4 rounded border-slate-300 text-brand-600" aria-label={`Select ${g.name}`} />,
    },
    {
      key: 'name', header: 'Garage',
      render: (g) => (
        <div className={`max-w-xs ${g.isVisible ? '' : 'opacity-60'}`}>
          <p className="flex items-center gap-1.5 font-medium text-slate-800">
            <span className="truncate" title={g.name}>{g.name}</span>
            {g.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Verified on MotorDesk" />}
          </p>
          <p className="truncate text-xs text-slate-500">{[g.ownerName, g.phone].filter(Boolean).join(' · ') || '—'}</p>
          {g.email && <p className="flex items-center gap-1 truncate text-xs text-slate-500"><Mail className="h-3 w-3 shrink-0" /> {g.email}</p>}
          {g.address && <p className="truncate text-xs text-slate-400" title={g.address}>{g.address}</p>}
        </div>
      ),
    },
    { key: 'gstin', header: 'GSTIN', render: (g) => <span className="font-mono text-xs">{g.gstin || '—'}</span> },
    { key: 'registered', header: 'Registered', render: (g) => formatDate(g.registeredAt) },
    {
      key: 'bills', header: 'Bills (all shops)', className: 'text-right',
      render: (g) => <div><p>{g.totalBills}</p>{g.totalBills > 0 && <p className="text-xs text-slate-500">{formatCurrency(g.totalValue)}</p>}</div>,
    },
    {
      key: 'visible', header: 'Shops can see',
      render: (g) => (
        <VisibilitySwitch on={g.isVisible} busy={busy.has(g.crmId)} label={`${g.isVisible ? 'Hide' : 'Show'} ${g.name}`} onChange={(v) => save([g.crmId], v)} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">MotorDesk Garages</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Garages registered on the MotorDesk Garage CRM. <b>Shown</b> garages appear on every shop’s Garages (B2B) page and POS;
            <b> hidden</b> garages don’t. New garages from the CRM are shown automatically.
          </p>
        </div>
        <Button variant="secondary" icon={RefreshCw} loading={loading && slow} onClick={() => load({ refresh: true })}>Refresh from CRM</Button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={status === t.key} onClick={() => { setStatus(t.key); setPage(1); }}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${status === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
            {counts[t.key] != null && <span className={`rounded-full px-2 py-0.5 text-xs ${status === t.key ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input icon={Search} className="w-full sm:w-80" placeholder="Name, phone, email, GSTIN or address" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search garages" />
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-sm text-brand-800">
            <span className="font-medium">{selected.size} selected</span>
            <Button size="sm" variant="secondary" icon={Eye} onClick={() => save([...selected], true)}>Show to shops</Button>
            <Button size="sm" variant="secondary" icon={EyeOff} onClick={() => save([...selected], false)}>Hide from shops</Button>
          </div>
        )}
      </div>

      {slow && (
        <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading garages from the Garage CRM… the first load can take up to a minute.
        </p>
      )}
      {!loading && crm && !crm.ok && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {!crm.connected ? 'MotorDesk Garage CRM is not connected — set GARAGE_CRM_API_URL and GARAGE_CRM_API_KEY in the server .env.'
            : crm.stale ? `Couldn't refresh from the Garage CRM (${crm.message}). Showing the last list.` : `Couldn't load the Garage CRM: ${crm.message}`}
        </div>
      )}

      <Table columns={columns} rows={rows} rowKey="crmId" loading={loading && !rows.length}
        empty={status === 'HIDDEN' ? 'No hidden garages — every garage is shown to shops' : 'No garages found'} />
      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}