// client/src/dashboardPages/garages/components/GarageList.jsx
import { Pencil, Trash2 } from 'lucide-react';
import Table from '../../../shared/ui/Table.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { formatDate } from '../../../shared/utils/formatDate.js';

export default function GarageList({ rows, loading, onEdit, onDelete }) {
  const columns = [
    { key: 'name', header: 'Garage', render: (g) => <div><p className="font-medium text-slate-800">{g.name}</p><p className="text-xs text-slate-500">{g.ownerName || '—'} · {g.phone}</p></div> },
    { key: 'bills', header: 'Bills', className: 'text-right', render: (g) => <span className={g.totalBills > 1 ? 'font-semibold text-brand-700' : ''}>{g.totalBills}{g.totalBills > 1 && ' ↻'}</span> },
    { key: 'ltv', header: 'Lifetime value', className: 'text-right', render: (g) => formatCurrency(g.lifetimeValue) },
    { key: 'last', header: 'Last purchase', render: (g) => formatDate(g.lastPurchase) },
    { key: 'gstin', header: 'GSTIN', render: (g) => <span className="font-mono text-xs">{g.gstin || '—'}</span> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (g) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => onEdit(g)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" title="Edit" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => onDelete(g)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600" title="Delete" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];
  return <Table columns={columns} rows={rows} loading={loading} empty="No garages yet — add your regular B2B buyers" />;
}