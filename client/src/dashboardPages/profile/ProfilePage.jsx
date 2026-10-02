import { useState } from 'react';
import useAuth from '../../shared/hooks/useAuth.js';
import { firstOfMonth, toInputDate } from '../../shared/utils/formatDate.js';
import ExpenseForm from './components/ExpenseForm.jsx';
import GstReport from './components/GstReport.jsx';
import PnLSummary from './components/PnLSummary.jsx';
import ShopProfileForm from './components/ShopProfileForm.jsx';
import SubscriptionPanel from './components/SubscriptionPanel.jsx';

const TABS = [
  { key: 'shop', label: 'Shop profile' },
  { key: 'pnl', label: 'Profit & loss', ranged: true, approved: true },
  { key: 'gst', label: 'GST summary', ranged: true, approved: true },
  { key: 'expenses', label: 'Expenses', ranged: true, approved: true },
  { key: 'plan', label: 'Subscription' },
];

export default function ProfilePage() {
  const { vendor } = useAuth();
  const approved = vendor?.status === 'APPROVED';
  const tabs = TABS.filter((t) => approved || !t.approved);
  const [tab, setTab] = useState('shop');
  const [range, setRange] = useState({ from: firstOfMonth(), to: toInputDate() });
  const active = tabs.find((t) => t.key === tab) ?? tabs[0];

  return (
    <div className="space-y-4">
      <h1 className="page-title">Profile & P&L</h1>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${active.key === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {active.ranged && (
          <div className="flex items-center gap-2 pb-2 text-sm">
            <input type="date" className="field py-1" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} aria-label="From" />
            <span className="text-slate-400">to</span>
            <input type="date" className="field py-1" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} aria-label="To" />
          </div>
        )}
      </div>

      {active.key === 'shop' && <ShopProfileForm />}
      {active.key === 'pnl' && <PnLSummary range={range} />}
      {active.key === 'gst' && <GstReport range={range} />}
      {active.key === 'expenses' && <ExpenseForm range={range} />}
      {active.key === 'plan' && <SubscriptionPanel />}
    </div>
  );
}
