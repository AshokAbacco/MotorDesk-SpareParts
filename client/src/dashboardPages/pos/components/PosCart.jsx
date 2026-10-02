import { Minus, Plus, ShoppingBasket, Trash2 } from 'lucide-react';
import EmptyState from '../../../shared/ui/EmptyState.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { usePosCartStore } from '../../store/posCartStore.js';

export default function PosCart() {
  const { lines, updateLine, removeLine } = usePosCartStore();
  if (!lines.length) return <EmptyState icon={ShoppingBasket} title="Bill is empty" description="Search a part on the left and click to add." />;

  return (
    <ul className="divide-y divide-slate-100">
      {lines.map((l) => (
        <li key={l.inventoryId} className="py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{l.name}</p>
              <p className="font-mono text-xs text-slate-500">{l.oemNumber} · GST {l.gstRate}% · MRP {formatCurrency(l.mrp)}</p>
            </div>
            <button onClick={() => removeLine(l.inventoryId)} className="p-1 text-slate-400 hover:text-red-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center rounded-md border border-slate-300">
              <button onClick={() => l.quantity > 1 && updateLine(l.inventoryId, { quantity: l.quantity - 1 })} className="p-1.5" aria-label="Decrease"><Minus className="h-3.5 w-3.5" /></button>
              <input
                type="number" min="1" max={l.stock} value={l.quantity}
                onChange={(e) => updateLine(l.inventoryId, { quantity: Math.max(1, Math.min(l.stock, Number(e.target.value) || 1)) })}
                className="w-12 border-x border-slate-300 py-1 text-center text-sm outline-none" aria-label="Quantity"
              />
              <button onClick={() => l.quantity < l.stock && updateLine(l.inventoryId, { quantity: l.quantity + 1 })} className="p-1.5" aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
            </div>
            <label className="flex items-center gap-1 text-xs text-slate-500">
              @ ₹
              <input
                type="number" min="0" step="0.01" value={l.unitPrice}
                onChange={(e) => updateLine(l.inventoryId, { unitPrice: Number(e.target.value) })}
                className="w-20 rounded-md border border-slate-300 px-1.5 py-1 text-sm text-slate-800 outline-none focus:border-brand-500" aria-label="Unit price"
              />
            </label>
            <span className="ml-auto text-sm font-semibold">{formatCurrency(l.unitPrice * l.quantity)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
