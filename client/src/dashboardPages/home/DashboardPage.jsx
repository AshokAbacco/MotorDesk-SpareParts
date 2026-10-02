import { ReceiptIndianRupee } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';
import useFetch from '../../shared/hooks/useFetch.js';
import EmptyState from '../../shared/ui/EmptyState.jsx';
import Spinner from '../../shared/ui/Spinner.jsx';
import { formatCurrency } from '../../shared/utils/formatCurrency.js';
import { formatDateTime } from '../../shared/utils/formatDate.js';
import LowStockList from './components/LowStockList.jsx';
import SalesChart from './components/SalesChart.jsx';
import StatsGrid from './components/StatsGrid.jsx';
import { getDashboardStats } from './dashboard.api.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch(getDashboardStats, []);

  if (loading) return <div className="py-24"><Spinner label="Loading dashboard…" /></div>;
  if (error) return <EmptyState title="Could not load dashboard" description={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Good day, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500">Here’s how your shop is doing.</p>
        </div>
        <Link to="/vendor/pos" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          <ReceiptIndianRupee className="h-4 w-4" /> New bill
        </Link>
      </div>

      <StatsGrid s={data} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><SalesChart data={data.salesLast7Days} /></div>
        <LowStockList items={data.lowStockItems} />
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="mb-3 font-semibold text-slate-800">Recent bills</h2>
        {data.recentInvoices.length === 0 ? <EmptyState title="No bills yet" description="Bills you create at the POS appear here." /> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {data.recentInvoices.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-slate-700">{i.invoiceNumber}</p>
                  <p className="text-xs text-slate-500">{i.customerName || 'Walk-in'} · {formatDateTime(i.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(i.grandTotal)}</p>
                  <p className="text-xs text-slate-500">{i.paymentMode}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
