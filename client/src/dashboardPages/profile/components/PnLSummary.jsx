import { TrendingDown, TrendingUp } from 'lucide-react';
import useFetch from '../../../shared/hooks/useFetch.js';
import Spinner from '../../../shared/ui/Spinner.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { getPnl } from '../profile.api.js';

export default function PnLSummary({ range }) {
  const { data: p, loading } = useFetch(() => getPnl(range), [range.from, range.to]);
  if (loading || !p) return <Spinner />;

  const Row = ({ label, value, strong, negative, hint }) => (
    <div className={`flex items-center justify-between py-2 ${strong ? 'border-t border-slate-200 font-semibold text-slate-900' : 'text-slate-600'}`}>
      <span>{label}{hint && <span className="ml-1 text-xs text-slate-400">{hint}</span>}</span>
      <span className={negative ? 'text-red-600' : ''}>{negative ? '− ' : ''}{formatCurrency(value)}</span>
    </div>
  );
  const up = p.netProfit >= 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="card p-5 text-sm">
        <Row label="Revenue" hint={`(${p.bills} bills, excl. GST)`} value={p.revenue} />
        <Row label="Cost of goods sold" value={p.costOfGoodsSold} negative />
        <Row label="Gross profit" value={p.grossProfit} strong />
        {p.expensesByCategory.map((e) => <Row key={e.category} label={e.category.charAt(0) + e.category.slice(1).toLowerCase()} value={e.amount} negative />)}
        <Row label="Total expenses" value={p.expenses} negative strong />
        <div className={`mt-2 flex items-center justify-between rounded-lg p-3 text-base font-semibold ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          <span className="flex items-center gap-2">{up ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />} Net profit</span>
          <span>{formatCurrency(p.netProfit)}</span>
        </div>
      </div>
      <div className="card space-y-3 p-5 text-sm">
        <div><p className="text-slate-500">Gross sales (incl. GST)</p><p className="text-lg font-semibold">{formatCurrency(p.grossSales)}</p></div>
        <div><p className="text-slate-500">GST collected</p><p className="text-lg font-semibold">{formatCurrency(p.gstCollected)}</p></div>
        <div><p className="text-slate-500">Discounts given</p><p className="text-lg font-semibold">{formatCurrency(p.discountGiven)}</p></div>
        <p className="text-xs text-slate-400">GST is a liability, not income, so it is excluded from revenue. COGS uses the cost price saved on each part at the time of sale.</p>
      </div>
    </div>
  );
}
