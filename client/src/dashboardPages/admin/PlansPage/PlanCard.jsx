import { Check, Pencil } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function PlanCard({ plan, onEdit }) {
  return (
    <div className={`card flex flex-col p-5 ${plan.isActive ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between">
        <p className="text-lg font-semibold text-slate-800">{plan.name}</p>
        <StatusBadge status={plan.isActive ? 'ACTIVE' : 'EXPIRED'} />
      </div>
      <p className="mt-2 text-3xl font-semibold">{formatCurrency(plan.price)}<span className="text-sm font-normal text-slate-500"> / {plan.durationDays} days</span></p>
      <p className="mt-1 text-sm text-slate-500">Up to {plan.maxSkus.toLocaleString('en-IN')} SKUs</p>
      <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-600">
        {plan.features.map((f) => <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> {f}</li>)}
      </ul>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
        <span className="text-slate-500">{plan._count?.subscriptions ?? 0} active shops</span>
        <button onClick={() => onEdit(plan)} className="flex items-center gap-1 font-medium text-brand-600 hover:underline"><Pencil className="h-3.5 w-3.5" /> Edit</button>
      </div>
    </div>
  );
}
