import { formatCompact, formatCurrency } from '../../../shared/utils/formatCurrency.js';

/** Last 7 days of billing as simple bars (no chart library needed) */
export default function SalesChart({ data }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const total = data.reduce((n, d) => n + d.total, 0);

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-semibold text-slate-800">Sales — last 7 days</h2>
        <span className="text-sm text-slate-500">{formatCurrency(total)}</span>
      </div>
      <div className="flex items-end gap-2 sm:gap-4">
        {data.map((d) => {
          const day = new Date(`${d.day}T00:00:00`);
          return (
            <div key={d.day} className="group flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-slate-500 opacity-0 transition group-hover:opacity-100">{formatCompact(d.total)}</span>
              <div className="flex h-40 w-full items-end">
                <div
                  className="w-full rounded-t-md bg-brand-500 transition-all group-hover:bg-brand-600"
                  style={{ height: `${Math.max((d.total / max) * 100, d.total ? 4 : 1)}%` }}
                  title={`${day.toDateString()}: ${formatCurrency(d.total)}`}
                />
              </div>
              <span className="text-xs text-slate-500">{day.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
