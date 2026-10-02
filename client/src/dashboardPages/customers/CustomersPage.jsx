// client/src/dashboardPages/customers/CustomersPage.jsx
import { Pencil, Search, Trash2, UserCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useDebounce from '../../shared/hooks/useDebounce.js';
import useFetch from '../../shared/hooks/useFetch.js';
import Button from '../../shared/ui/Button.jsx';
import Input from '../../shared/ui/Input.jsx';
import Pagination from '../../shared/ui/Pagination.jsx';
import Table from '../../shared/ui/Table.jsx';
import { formatCurrency } from '../../shared/utils/formatCurrency.js';
import { formatDate } from '../../shared/utils/formatDate.js';
import CustomerFormModal from './components/CustomerFormModal.jsx';
import { deleteCustomer, getCustomers, setCustomerStatus } from './customers.api.js';

const TABS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
];

/** Admin → Customers: everyone who buys on the marketplace */
export default function CustomersPage() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(undefined); // undefined = closed · null = add · customer = edit
  const [busyId, setBusyId] = useState('');
  const query = useDebounce(q);

  const params = { page, ...(status && { status }), ...(query && { q: query }) };
  const { data, meta, loading, reload } = useFetch(() => getCustomers(params), [JSON.stringify(params)]);

  const onDelete = async (c) => {
    const note = c.orders > 0
      ? `${c.name} has ${c.orders} order${c.orders === 1 ? '' : 's'}. The account will be DISABLED (not deleted) so order history and invoices stay correct.\n\nContinue?`
      : `Delete ${c.name} (${c.email}) permanently? This cannot be undone.`;
    if (!window.confirm(note)) return;
    setBusyId(c.id);
    try {
      const res = await deleteCustomer(c.id);
      toast.success(res.message);
      reload();
    } catch (e) { toast.error(e.message); } finally { setBusyId(''); }
  };

  const onEnable = async (c) => {
    setBusyId(c.id);
    try { await setCustomerStatus(c.id, true); toast.success(`${c.name} can log in again`); reload(); }
    catch (e) { toast.error(e.message); } finally { setBusyId(''); }
  };

  const columns = [
    {
      key: 'name', header: 'Customer',
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">{c.name.charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">{c.name}</p>
            <p className="truncate text-xs text-slate-500">{c.email}</p>
            {c.phone && <p className="truncate text-xs text-slate-500">{c.phone}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'city', header: 'Location',
      render: (c) => (c.city ? (
        <div className="text-sm">
          <p className="whitespace-nowrap">{c.city}</p>
          {c.addressCount > 1 && <p className="text-xs text-slate-400">{c.addressCount} addresses</p>}
        </div>
      ) : <span className="text-slate-400">—</span>),
    },
    { key: 'orders', header: 'Orders', render: (c) => c.orders },
    { key: 'spent', header: 'Total spent', render: (c) => formatCurrency(c.totalSpent) },
    { key: 'last', header: 'Last order', render: (c) => (c.lastOrderAt ? <span className="whitespace-nowrap">{formatDate(c.lastOrderAt)}</span> : <span className="text-slate-400">—</span>) },
    { key: 'joined', header: 'Joined', render: (c) => <span className="whitespace-nowrap">{formatDate(c.createdAt)}</span> },
    {
      key: 'status', header: 'Status',
      render: (c) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${c.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
          {c.isActive ? 'Active' : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => setEditing(c)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" title="Edit customer" aria-label={`Edit ${c.name}`}>
            <Pencil className="h-4 w-4" />
          </button>
          {!c.isActive && (
            <Button size="sm" variant="secondary" icon={UserCheck} loading={busyId === c.id} onClick={() => onEnable(c)}>Enable</Button>
          )}
          {(c.isActive || c.orders === 0) && (
            <button onClick={() => onDelete(c)} disabled={busyId === c.id}
              className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" title="Delete customer" aria-label={`Delete ${c.name}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-sm text-slate-500">Everyone who shops on the MotorDesk marketplace{meta?.total != null && ` · ${meta.total} total`}.</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Input icon={Search} className="w-full sm:w-72" placeholder="Name, email or mobile" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search customers" />
          <Button icon={UserPlus} onClick={() => setEditing(null)}>Add customer</Button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t.value || 'all'} onClick={() => { setStatus(t.value); setPage(1); }}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${status === t.value ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <Table columns={columns} rows={data ?? []} loading={loading} empty={query ? 'No customers match your search' : 'No customers yet'} />
      <Pagination meta={meta} onPageChange={setPage} />

      <CustomerFormModal
        open={editing !== undefined}
        customer={editing}
        onClose={() => setEditing(undefined)}
        onSaved={() => { if (!editing) setPage(1); reload(); }}
      />
    </div>
  );
}