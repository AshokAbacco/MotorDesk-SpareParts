import { Search } from 'lucide-react';
import { useState } from 'react';
import useDebounce from '../../shared/hooks/useDebounce.js';
import useFetch from '../../shared/hooks/useFetch.js';
import Input from '../../shared/ui/Input.jsx';
import Pagination from '../../shared/ui/Pagination.jsx';
import { ORDER_STATUSES } from '../../shared/utils/constants.js';
import OrderDetailsDrawer from './components/OrderDetailsDrawer.jsx';
import OrdersTable from './components/OrdersTable.jsx';
import { getVendorOrders } from './orders.api.js';

const TABS = ['', ...ORDER_STATUSES];

export default function OrdersPage() {
  const [status, setStatus] = useState('PENDING');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const query = useDebounce(q);

  const params = { page, ...(status && { status }), ...(query && { q: query }) };
  const { data, meta, loading, reload } = useFetch(() => getVendorOrders(params), [JSON.stringify(params)]);

  const onUpdated = (order) => { setOpen(order); reload(); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Online orders</h1>
          <p className="text-sm text-slate-500">Orders placed by customers on the marketplace.</p>
        </div>
        <Input icon={Search} className="w-full sm:w-64" placeholder="Order no. or customer" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search orders" />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t || 'all'} onClick={() => { setStatus(t); setPage(1); }}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${status === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t ? t.charAt(0) + t.slice(1).toLowerCase() : 'All'}
          </button>
        ))}
      </div>

      <OrdersTable rows={data ?? []} loading={loading} onOpen={setOpen} />
      <Pagination meta={meta} onPageChange={setPage} />
      <OrderDetailsDrawer order={open} onClose={() => setOpen(null)} onUpdated={onUpdated} />
    </div>
  );
}
