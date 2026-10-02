// client/src/dashboardPages/billingHistory/components/SalesSummaryCards.jsx
import { CalendarDays, CalendarRange, CalendarSearch, Clock } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../../shared/utils/formatCurrency.js';
import { toInputDate } from '../../../shared/utils/formatDate.js';

const CARDS = [
  { key: 'today', label: 'Today', icon: Clock },
  { key: 'week', label: 'This Week', icon: CalendarDays },
  { key: 'month', label: 'This Month', icon: CalendarRange },
];

/**
 * Four cards. Clicking Today / Week / Month applies that period to the list below;
 * the Custom card has its own From–To pickers.
 */
export default function SalesSummaryCards({ stats, loading, unit, preset, range, onPreset, onCustomChange }) {
  const value = (key) => stats?.[key === 'custom' ? 'range' : key];
  const card = (active) =>
    `card p-4 text-left transition ${active ? 'ring-2 ring-brand-500 border-brand-300' : 'hover:border-brand-200 hover:shadow-md'}`;

  const Numbers = ({ k }) => (
    <div className={loading ? 'animate-pulse opacity-50' : ''}>
      <p className="mt-2 text-2xl font-semibold text-slate-900">
        {formatNumber(value(k)?.count ?? 0)} <span className="text-sm font-normal text-slate-500">{unit}</span>
      </p>
      <p className="text-sm font-medium text-emerald-700">{formatCurrency(value(k)?.amount ?? 0)}</p>
    </div>
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map(({ key, label, icon: Icon }) => (
        <button key={key} onClick={() => onPreset(key)} className={card(preset === key)}>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Icon className="h-4 w-4 text-brand-600" /> {label}</p>
          <Numbers k={key} />
        </button>
      ))}

      <div className={card(preset === 'custom')}>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><CalendarSearch className="h-4 w-4 text-brand-600" /> Custom Range</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-[11px] text-slate-500">From
            <input type="date" className="field mt-0.5 px-2 py-1 text-xs" value={range.from} max={range.to} onChange={(e) => onCustomChange({ ...range, from: e.target.value })} />
          </label>
          <label className="text-[11px] text-slate-500">To
            <input type="date" className="field mt-0.5 px-2 py-1 text-xs" value={range.to} min={range.from} max={toInputDate()} onChange={(e) => onCustomChange({ ...range, to: e.target.value })} />
          </label>
        </div>
        <Numbers k="custom" />
      </div>
    </div>
  );
}