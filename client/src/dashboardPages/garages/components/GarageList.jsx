// client/src/dashboardPages/garages/components/GarageList.jsx
import { BadgeCheck, Lock, Mail, Pencil, Trash2 } from 'lucide-react';
import Table from '../../../shared/ui/Table.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { formatDate } from '../../../shared/utils/formatDate.js';

/** Where the garage comes from: MotorDesk Garage CRM (shared) or added by this shop (own) */
function SourceBadge({ g }) {
  return g.source === 'MOTORDESK'
    ? <span className="rounded-full bg-amberline-soft px-2 py-0.5 text-[11px] font-medium text-amberline-ink">MotorDesk</span>
    : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Own</span>;
}

export default function GarageList({ rows, loading, onEdit, onDelete, empty }) {
  const columns = [
    {
      key: 'name', header: 'Garage',
      render: (g) => (
        <div className="max-w-xs">
          <p className="flex items-center gap-1.5 font-medium text-slate-800">
            <span className="truncate" title={g.name}>{g.name}</span>
            {g.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Verified on MotorDesk" />}
            <SourceBadge g={g} />
          </p>
          <p className="truncate text-xs text-slate-500">{[g.ownerName, g.phone].filter(Boolean).join(' · ') || '—'}</p>
          {g.email && (
            <a href={`mailto:${g.email}`} className="flex w-fit max-w-full items-center gap-1 text-xs text-brand-700 hover:underline" title={`Email ${g.email}`}>
              <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{g.email}</span>
            </a>
          )}
          {g.address && <p className="truncate text-xs text-slate-400" title={g.address}>{g.address}</p>}
        </div>
      ),
    },
    { key: 'bills', header: 'Bills', className: 'text-right', render: (g) => <span className={g.totalBills > 1 ? 'font-semibold text-brand-700' : ''}>{g.totalBills}{g.totalBills > 1 && ' ↻'}</span> },
    { key: 'ltv', header: 'Lifetime value', className: 'text-right', render: (g) => formatCurrency(g.lifetimeValue) },
    { key: 'last', header: 'Last purchase', render: (g) => formatDate(g.lastPurchase) },
    { key: 'gstin', header: 'GSTIN', render: (g) => <span className="font-mono text-xs">{g.gstin || '—'}</span> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (g) => (g.source === 'MOTORDESK' ? (
        <span className="inline-flex items-center gap-1 text-xs text-slate-400" title="Registered on the MotorDesk Garage CRM — edit it there">
          <Lock className="h-3.5 w-3.5" /> Garage CRM
        </span>
      ) : (
        <div className="flex justify-end gap-1">
          <button onClick={() => onEdit(g)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" title="Edit" aria-label={`Edit ${g.name}`}><Pencil className="h-4 w-4" /></button>
          <button onClick={() => onDelete(g)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600" title="Delete" aria-label={`Delete ${g.name}`}><Trash2 className="h-4 w-4" /></button>
        </div>
      )),
    },
  ];
  return <Table columns={columns} rows={rows} loading={loading} empty={empty ?? 'No garages yet — add your regular B2B buyers'} />;
}