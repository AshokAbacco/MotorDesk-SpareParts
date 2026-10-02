import { ImageOff } from 'lucide-react';
import EmptyState from '../../../shared/ui/EmptyState.jsx';
import Spinner from '../../../shared/ui/Spinner.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import StatusBadge, { stockStatusOf } from '../StatusBadge.jsx';
import { fitmentText } from './InventoryTableBase.jsx';

export default function InventoryGridBase({ rows, loading, onEdit, placeholderIcon: Icon = ImageOff }) {
  if (loading) return <div className="py-16"><Spinner /></div>;
  if (!rows.length) return <div className="card"><EmptyState title="No parts in inventory match these filters" /></div>;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {rows.map((r) => (
        <button key={r.id} onClick={() => onEdit(r)} className="card flex flex-col overflow-hidden text-left transition hover:border-brand-300 hover:shadow-md">
          <div className="flex aspect-[4/3] items-center justify-center bg-slate-100">
            {r.product.images?.[0] ? <img src={r.product.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon className="h-8 w-8 text-slate-300" />}
          </div>
          <div className="flex flex-1 flex-col p-3">
            <p className="line-clamp-2 text-sm font-medium text-slate-800">{r.product.name}</p>
            <p className="font-mono text-xs text-slate-500">{r.product.oemNumber}</p>
            <p className="mt-1 line-clamp-1 text-xs text-slate-500">{fitmentText(r.product, 1)}</p>
            <div className="mt-auto flex items-end justify-between pt-3">
              <div>
                <p className="font-semibold text-slate-900">{formatCurrency(r.price)}</p>
                <p className="text-xs text-slate-500">Qty {r.stock}</p>
              </div>
              <StatusBadge status={stockStatusOf(r)} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
