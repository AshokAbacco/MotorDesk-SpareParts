import { Check, XCircle } from 'lucide-react';
import { ORDER_FLOW } from '../../../shared/utils/constants.js';

// Pickup orders: Packed shows as "Ready", Delivered as "Picked up", and there is no Shipped step
const PICKUP_FLOW_LABELS = { PACKED: 'Ready', DELIVERED: 'Picked up' };

export default function OrderTracker({ status, fulfilment }) {
  const pickup = fulfilment === 'PICKUP';
  const flow = pickup ? ORDER_FLOW.filter((s) => s !== 'SHIPPED') : ORDER_FLOW;
  const label = (s) => (pickup && PICKUP_FLOW_LABELS[s]) || s.charAt(0) + s.slice(1).toLowerCase();
  if (status === 'CANCELLED') {
    return <p className="flex items-center gap-1.5 text-sm font-medium text-red-600"><XCircle className="h-4 w-4" /> Order cancelled</p>;
  }
  const current = flow.indexOf(status);
  return (
    <ol className="flex items-center">
      {flow.map((s, i) => (
        <li key={s} className={`flex items-center ${i < flow.length - 1 ? 'flex-1' : ''}`}>
          <div className="flex flex-col items-center">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${i <= current ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={`mt-1 text-[10px] sm:text-xs ${i <= current ? 'text-brand-700' : 'text-slate-400'}`}>{label(s)}</span>
          </div>
          {i < flow.length - 1 && <div className={`mx-1 mb-4 h-0.5 flex-1 ${i < current ? 'bg-brand-600' : 'bg-slate-200'}`} />}
        </li>
      ))}
    </ol>
  );
}
