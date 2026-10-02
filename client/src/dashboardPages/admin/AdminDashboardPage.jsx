import useFetch from '../../shared/hooks/useFetch.js';
import EmptyState from '../../shared/ui/EmptyState.jsx';
import Spinner from '../../shared/ui/Spinner.jsx';
import { formatCurrency } from '../../shared/utils/formatCurrency.js';
import { getAnalytics } from './analytics.api.js';
import AnalyticsCards from './components/AnalyticsCards.jsx';

export default function AdminDashboardPage() {
  const { data, loading, error } = useFetch(getAnalytics, []);
  if (loading) return <div className="py-24"><Spinner label="Loading analytics…" /></div>;
  if (error) return <EmptyState title="Could not load analytics" description={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Platform overview</h1>
        <p className="text-sm text-slate-500">Shops, customers, sales and subscriptions across MotorDesk.</p>
      </div>
      <AnalyticsCards a={data} />
      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-800">Top shops by billing</h2>
        {data.topVendors.length === 0 ? <EmptyState title="No sales yet" /> : (
          <ol className="divide-y divide-slate-100 text-sm">
            {data.topVendors.map((v, i) => (
              <li key={v.id} className="flex items-center gap-3 py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">{i + 1}</span>
                <span className="flex-1"><span className="font-medium">{v.shopName}</span> <span className="text-slate-500">· {v.city}</span></span>
                <span className="font-semibold">{formatCurrency(v.sales)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
