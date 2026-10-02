// client/src/dashboardPages/admin/VendorsPage.jsx
import { Search } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useDebounce from '../../shared/hooks/useDebounce.js';
import useFetch from '../../shared/hooks/useFetch.js';
import Input from '../../shared/ui/Input.jsx';
import Pagination from '../../shared/ui/Pagination.jsx';
import VendorApprovalTable from './components/VendorApprovalTable.jsx';
import { getVendors, setVendorStatus } from './vendors.api.js';

// '' = All (shown first and opened by default)
const TABS = ['', 'PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'];

export default function VendorsPage() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState('');
  const query = useDebounce(q);

  const params = { page, ...(status && { status }), ...(query && { q: query }) };
  const { data, meta, loading, reload } = useFetch(() => getVendors(params), [JSON.stringify(params)]);

  const onStatus = async (v, next) => {
    if (next !== 'APPROVED' && !window.confirm(`${next === 'REJECTED' ? 'Reject' : 'Suspend'} ${v.shopName}?`)) return;
    setBusyId(v.id + next);
    try { await setVendorStatus(v.id, next); toast.success(`${v.shopName} ${next.toLowerCase()}`); reload(); } catch (e) { toast.error(e.message); } finally { setBusyId(''); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Vendors</h1>
          <p className="text-sm text-slate-500">Verify new shops and manage existing ones.</p>
        </div>
        <Input icon={Search} className="w-full sm:w-72" placeholder="Shop, city or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search vendors" />
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t || 'all'} onClick={() => { setStatus(t); setPage(1); }}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${status === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t ? t.charAt(0) + t.slice(1).toLowerCase() : 'All'}
          </button>
        ))}
      </div>
      <VendorApprovalTable rows={data ?? []} loading={loading} onStatus={onStatus} busyId={busyId} />
      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}