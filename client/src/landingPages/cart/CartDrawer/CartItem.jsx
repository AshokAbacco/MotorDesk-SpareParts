import { ImageOff, Minus, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { useShopCartStore } from '../../store/shopCartStore.js';

export default function CartItem({ item }) {
  const { updateQty, removeItem } = useShopCartStore();
  return (
    <div className="flex gap-3 py-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : <ImageOff className="h-5 w-5 text-slate-300" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
        <p className="text-xs text-slate-500">{item.vendorName} · {item.oemNumber}</p>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center rounded-md border border-slate-200">
            <button onClick={() => updateQty(item.inventoryId, item.quantity - 1)} className="p-1 hover:bg-slate-50" aria-label="Decrease"><Minus className="h-3.5 w-3.5" /></button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <button onClick={() => updateQty(item.inventoryId, item.quantity + 1)} disabled={item.quantity >= item.maxQty} className="p-1 hover:bg-slate-50 disabled:opacity-40" aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          <span className="text-sm font-semibold">{formatCurrency(item.priceWithGst * item.quantity)}</span>
        </div>
      </div>
      <button onClick={() => removeItem(item.inventoryId)} className="self-start p-1 text-slate-400 hover:text-red-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}
