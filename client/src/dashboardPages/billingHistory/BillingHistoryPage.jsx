// client/src/dashboardPages/billingHistory/BillingHistoryPage.jsx
import { FileSpreadsheet, Globe, Search, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useDebounce from '../../shared/hooks/useDebounce.js';
import useFetch from '../../shared/hooks/useFetch.js';
import Button from '../../shared/ui/Button.jsx';
import Input from '../../shared/ui/Input.jsx';
import Pagination from '../../shared/ui/Pagination.jsx';
import Select from '../../shared/ui/Select.jsx';
import { formatCurrency } from '../../shared/utils/formatCurrency.js';
import { formatDate } from '../../shared/utils/formatDate.js';
import OrderDetailsDrawer from '../orders/components/OrderDetailsDrawer.jsx';
import InvoicePreview from '../pos/components/InvoicePreview.jsx';
import {
  downloadOnlineExcel, downloadWalkinExcel, getBillDetails, getBillingSummary, getOnlineBills, getOrderDetails, getWalkinBills,
} from './billingHistory.api.js';
import OnlineOrdersTable from './components/OnlineOrdersTable.jsx';
import SalesSummaryCards from './components/SalesSummaryCards.jsx';
import WalkinBillsTable from './components/WalkinBillsTable.jsx';
import { PRESET_LABELS, presetRange } from './dateRanges.js';

const TABS = [
  { key: 'walkin', label: 'Walk-in Customers', icon: Store, unit: 'bills' },
  { key: 'online', label: 'Online Orders', icon: Globe, unit: 'orders' },
];
const PAYMENT_FILTER = [{ value: 'CASH', label: 'Cash' }, { value: 'UPI', label: 'UPI' }, { value: 'CARD', label: 'Card' }];
const STATUS_FILTER = ['PENDING', 'ACCEPTED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }));

export default function BillingHistoryPage() {
  const [tab, setTab] = useState('walkin');
  const [preset, setPreset] = useState('month');
  const [range, setRange] = useState(presetRange('month'));
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(''); // payment mode (walk-in) or order status (online)
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [order, setOrder] = useState(null);
  const query = useDebounce(q);

  // Reset list controls whenever the tab or period changes
  useEffect(() => { setPage(1); }, [tab, range.from, range.to, query, filter]);
  useEffect(() => { setFilter(''); setQ(''); }, [tab]);

  const summary = useFetch(() => getBillingSummary(range), [range.from, range.to]);

  const params = {
    ...range, page, limit: 15,
    ...(query && { q: query }),
    ...(filter && (tab === 'walkin' ? { paymentMode: filter } : { status: filter })),
  };
  // Responses are tagged with their tab so a table never renders the other tab's rows while switching
  const list = useFetch(
    () => (tab === 'walkin' ? getWalkinBills(params) : getOnlineBills(params)).then((r) => ({ ...r, meta: { ...r.meta, tab } })),
    [tab, JSON.stringify(params)]
  );
  const fresh = list.meta?.tab === tab;
  const rows = fresh ? list.data ?? [] : [];
  const listLoading = list.loading || !fresh;

  const choosePreset = (p) => { setPreset(p); setRange(presetRange(p)); };
  const chooseCustom = (r) => { setPreset('custom'); setRange(r); };

  const openRow = async (row) => {
    try {
      if (tab === 'walkin') setInvoice((await getBillDetails(row.id)).data);
      else setOrder((await getOrderDetails(row.id)).data);
    } catch (e) { toast.error(e.message); }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const exportParams = { ...range, ...(query && { q: query }), ...(filter && (tab === 'walkin' ? { paymentMode: filter } : { status: filter })) };
      const blob = tab === 'walkin' ? await downloadWalkinExcel(exportParams) : await downloadOnlineExcel(exportParams);
      const name = `${tab === 'walkin' ? 'Walkin-Bills' : 'Online-Orders'}_${range.from}_to_${range.to}.xlsx`;
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: name }).click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success('Excel downloaded');
    } catch {
      toast.error('Could not generate the Excel file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const active = TABS.find((t) => t.key === tab);
  const periodLabel = `${formatDate(range.from)} – ${formatDate(range.to)}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Billing History</h1>
        <p className="text-sm text-slate-500">All counter bills and online orders, with Excel reports for any period.</p>
      </div>

      <SalesSummaryCards
        stats={summary.data?.[tab]}
        loading={summary.loading}
        unit={active.unit}
        preset={preset}
        range={range}
        onPreset={choosePreset}
        onCustomChange={chooseCustom}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 pt-2">
          <div className="flex gap-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium ${tab === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <Icon className="h-4 w-4" /> {label}
                {summary.data && <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-600">{summary.data[key].range.count}</span>}
              </button>
            ))}
          </div>
          <Button variant="success" size="sm" icon={FileSpreadsheet} loading={downloading} onClick={download} className="mb-2">
            Download Excel
          </Button>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input icon={Search} className="w-full sm:w-72" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={tab === 'walkin' ? 'Invoice no, customer or phone' : 'Order no, customer, phone or UTR'} aria-label="Search" />
            <Select className="w-48" value={filter} onChange={(e) => setFilter(e.target.value)}
              options={tab === 'walkin' ? PAYMENT_FILTER : STATUS_FILTER} placeholder={tab === 'walkin' ? 'All payment modes' : 'All statuses'} aria-label="Filter" />
            <p className="ml-auto text-sm text-slate-500">
              <span className="font-medium text-slate-700">{PRESET_LABELS[preset]}</span> · {periodLabel}
            </p>
          </div>

          {tab === 'walkin'
            ? <WalkinBillsTable rows={rows} loading={listLoading} onOpen={openRow} />
            : <OnlineOrdersTable rows={rows} loading={listLoading} onOpen={openRow} />}

          {fresh && list.meta && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-slate-600">
                {list.meta.total} {active.unit} · {tab === 'online' ? 'Net sales (excl. cancelled)' : 'Total'}{' '}
                <span className="font-semibold text-slate-900">{formatCurrency(list.meta.totalAmount)}</span>
              </p>
              <Pagination meta={list.meta} onPageChange={setPage} />
            </div>
          )}
        </div>
      </div>

      <InvoicePreview invoice={invoice} onClose={() => setInvoice(null)} />
      <OrderDetailsDrawer order={order} onClose={() => setOrder(null)} onUpdated={(o) => { setOrder(o); list.reload(); summary.reload(); }} />
    </div>
  );
}