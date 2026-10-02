import { Store } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';

export default function OrderSummary({ items }) {
  const byShop = items.reduce((acc, i) => { (acc[i.vendorName] ??= []).push(i); return acc; }, {});
  const total = items.reduce((n, i) => n + i.priceWithGst * i.quantity, 0);

  return (
    <div className="card p-4">
      <h2 className="mb-3 font-semibold">Order summary</h2>
      {Object.entries(byShop).map(([shop, list]) => (
        <div key={shop} className="mb-3 border-b border-slate-100 pb-3">
          <p className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500"><Store className="h-3 w-3" /> {shop}</p>
          {list.map((i) => (
            <div key={i.inventoryId} className="flex justify-between text-sm">
              <span className="truncate pr-2">{i.name} × {i.quantity}</span>
              <span>{formatCurrency(i.priceWithGst * i.quantity)}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="flex justify-between text-sm text-slate-500"><span>Delivery</span><span>Free</span></div>
      <div className="mt-2 flex justify-between text-lg font-semibold"><span>Total</span><span>{formatCurrency(total)}</span></div>
      <p className="mt-1 text-xs text-slate-400">Inclusive of GST. Final amount is confirmed by the server.</p>
    </div>
  );
}
