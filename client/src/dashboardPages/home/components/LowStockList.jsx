import { AlertTriangle } from 'lucide-react';
import EmptyState from '../../../shared/ui/EmptyState.jsx';

export default function LowStockList({ items }) {
  return (
    <div className="card p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-800"><AlertTriangle className="h-4 w-4 text-amber-500" /> Low stock</h2>
      {items.length === 0 ? (
        <EmptyState title="All parts are well stocked" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-700">{i.product.name}</p>
                <p className="font-mono text-xs text-slate-400">{i.product.oemNumber}</p>
              </div>
              <span className={`ml-3 rounded-md px-2 py-0.5 text-xs font-semibold ${i.stock === 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                {i.stock === 0 ? 'Out' : `${i.stock} left`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
