import useFetch from '../../../shared/hooks/useFetch.js';
import Spinner from '../../../shared/ui/Spinner.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import StatCard from '../../components/StatCard.jsx';
import { getGstReport } from '../profile.api.js';

export default function GstReport({ range }) {
  const { data: g, loading } = useFetch(() => getGstReport(range), [range.from, range.to]);
  if (loading || !g) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Taxable value" value={formatCurrency(g.taxableValue)} sub={`${g.invoices} invoices`} />
        <StatCard label="CGST" value={formatCurrency(g.cgst)} tone="violet" />
        <StatCard label="SGST" value={formatCurrency(g.sgst)} tone="violet" />
        <StatCard label="IGST" value={formatCurrency(g.igst)} tone="amber" />
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">GST rate</th><th className="px-4 py-3 text-right">Taxable value</th><th className="px-4 py-3 text-right">Tax</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {g.byRate.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-500">No sales in this period</td></tr>}
            {g.byRate.map((r) => (
              <tr key={r.rate}><td className="px-4 py-2">{r.rate}%</td><td className="px-4 py-2 text-right">{formatCurrency(r.taxable)}</td><td className="px-4 py-2 text-right">{formatCurrency(r.tax)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-slate-200 font-semibold"><td className="px-4 py-3">Total tax payable</td><td /><td className="px-4 py-3 text-right">{formatCurrency(g.totalTax)}</td></tr></tfoot>
        </table>
      </div>
      <p className="text-xs text-slate-400">Summary to help with GSTR-1 / GSTR-3B. Verify with your CA before filing.</p>
    </div>
  );
}
